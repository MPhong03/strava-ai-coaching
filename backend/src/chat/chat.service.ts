import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GeminiApiService } from '../ai/gemini-api.service';
import { EncryptionUtil } from '../common/utils/encryption.util';
import { chatTools } from './tools.definition';
import { ActivitySyncService } from '../activities/activity-sync.service';
import { JournalService } from '../journal/journal.service';
import { UserService } from '../user/user.service';
import { ReportsService } from '../reports/reports.service';
import { Content } from '@google/generative-ai';
import { Subject } from 'rxjs';
import { GeminiLoadBalancer } from '../ai/gemini-load-balancer.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  public status$ = new Subject<{ sessionId: string, status: string, toolName?: string }>();

  constructor(
    private prisma: PrismaService,
    private geminiApi: GeminiApiService,
    private loadBalancer: GeminiLoadBalancer,
    private activitySync: ActivitySyncService,
    private journalService: JournalService,
    private userService: UserService,
    private reportsService: ReportsService,
  ) {}

  async getSession(userId: bigint) {
    let session = await this.prisma.chatSession.findFirst({
      where: { user_id: userId },
      orderBy: { updated_at: 'desc' },
    });

    if (!session) {
      session = await this.prisma.chatSession.create({
        data: { user_id: userId },
      });
    }

    return session;
  }

  async getHistory(sessionId: bigint, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return this.prisma.chatMessage.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    });
  }

  async sendMessage(userId: bigint, sessionId: bigint, userMessage: string) {
    this.logger.log(`[Session ${sessionId}] Processing new message from User ${userId}`);
    
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Người dùng không tồn tại.');
    }

    // 1. Lưu tin nhắn người dùng
    await this.prisma.chatMessage.create({
      data: { session_id: sessionId, role: 'user', content: userMessage },
    });

    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { updated_at: new Date() },
    });

    // 2. Chuẩn bị lịch sử cho Gemini
    const history = await this.prisma.chatMessage.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'asc' },
      take: 50,
    });

    const contents: Content[] = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content || '' }],
    }));

    // System instruction
    const systemInstruction = `
      Bạn là ${user.partner_name || 'AI Partner'}, một cộng sự AI chuyên nghiệp về chạy bộ và sức khỏe.
      Phong cách: ${user.partner_persona || 'Thân thiện, động viên'}.
      Bạn có quyền truy cập vào các công cụ để xem dữ liệu. Luôn xưng hô phù hợp.
    `;

    // --- BẮT ĐẦU VÒNG LẶP RETRY / FAILOVER ---
    let retryCount = 0;
    const maxRetries = 3;
    let lastError: any = null;

    while (retryCount < maxRetries) {
      const selectedKey = await this.loadBalancer.getBestKey(userId);
      this.logger.log(`[Session ${sessionId}] Attempt ${retryCount + 1} using Key ID: ${selectedKey.id}`);

      try {
        const genAI = (this.geminiApi as any).getClient(selectedKey.key);
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview', systemInstruction });

        const chat = model.startChat({
          history: contents.slice(0, -1),
          tools: [{ functionDeclarations: chatTools }],
        });

        this.status$.next({ sessionId: sessionId.toString(), status: 'thinking' });

        let result = await chat.sendMessage(userMessage);
        let response = result.response;
        const toolLogs: any[] = [];

        // Vòng lặp xử lý Function Calling
        let callCount = 0;
        while (response.candidates?.[0]?.content?.parts?.some((p: any) => p.functionCall) && callCount < 5) {
          const toolCalls = response.candidates[0].content.parts.filter((p: any) => p.functionCall);
          const toolResultsForAI: any[] = [];

          for (const call of toolCalls) {
            const { name, args } = call.functionCall;
            this.status$.next({ sessionId: sessionId.toString(), status: 'calling_tool', toolName: name });

            const output = await this.executeTool(userId, name, args);
            toolLogs.push({ tool: name, args, result: output });

            toolResultsForAI.push({
              functionResponse: { name, response: { content: output } },
            });
          }

          result = await chat.sendMessage(toolResultsForAI);
          response = result.response;
          callCount++;
        }

        const aiContent = response.text();

        // Thành công! Lưu tin nhắn Assistant và kết thúc
        const assistantMsg = await this.prisma.chatMessage.create({
          data: {
            session_id: sessionId,
            role: 'assistant',
            content: aiContent,
            tool_logs: toolLogs.length > 0 ? JSON.stringify(toolLogs) : null,
          },
        });

        // Log usage
        if (response.usageMetadata) {
          await this.prisma.geminiUsage.create({
            data: {
              user_id: userId,
              type: 'CHAT',
              model_name: 'gemini-3-flash-preview',
              prompt_tokens: response.usageMetadata.promptTokenCount || 0,
              candidate_tokens: response.usageMetadata.candidatesTokenCount || 0,
              total_tokens: response.usageMetadata.totalTokenCount || 0,
            }
          });
        }

        this.status$.next({ sessionId: sessionId.toString(), status: 'idle' });
        return assistantMsg;

      } catch (error: any) {
        this.logger.error(`[Session ${sessionId}] Attempt ${retryCount + 1} failed: ${error.message}`);
        
        // Báo cáo lỗi cho Load Balancer để đánh dấu Key hỏng/hết hạn
        await this.loadBalancer.reportError(selectedKey.id, error);
        
        lastError = error;
        retryCount++;

        // Nếu lỗi không phải 429 hoặc không còn key nào, thì không cần retry tiếp
        if (!error.message?.includes('429') && !error.message?.includes('Quota exceeded')) {
          break; 
        }
        
        this.logger.warn(`[Session ${sessionId}] 429 Error detected. Retrying with a different key...`);
      }
    }

    // --- NẾU TẤT CẢ CÁC LẦN THỬ ĐỀU THẤT BẠI ---
    this.status$.next({ sessionId: sessionId.toString(), status: 'idle' });

    if (lastError?.message?.includes('429') || lastError?.message?.includes('Quota exceeded')) {
      let waitTime = 'vài phút';
      const match = lastError.message.match(/retry after (\d+[smh])/i) || lastError.message.match(/retry in ([\d\.]+s)/i);
      if (match) waitTime = match[1];

      const rechargeMessage = `Toàn bộ các cộng sự AI của tôi đều đang cần sạc năng lượng. Chúng ta có thể tiếp tục trò chuyện vào **${waitTime}** tới nhé! ⚡🔋`;

      return await this.prisma.chatMessage.create({
        data: {
          session_id: sessionId,
          role: 'assistant',
          content: rechargeMessage,
        },
      });
    }

    throw lastError;
  }

  private async executeTool(userId: bigint, name: string, args: any) {
    try {
      let result: any;
      switch (name) {
        case 'get_activities':
          result = await this.prisma.activity.findMany({
            where: { user_id: userId },
            orderBy: { start_date: 'desc' },
            take: args.limit || 10,
          });
          break;
        case 'get_profile':
          result = await this.userService.getProfile(userId);
          break;
        case 'update_today_journal':
          const today = new Date().toISOString().split('T')[0];
          result = await this.journalService.upsertJournal(userId, today, args.content);
          break;
        case 'get_daily_journal':
          result = await this.journalService.getJournal(userId, args.date);
          break;
        case 'sync_recent':
          result = await this.activitySync.syncUserActivities(userId, false);
          break;
        case 'get_performance_report':
          result = await this.reportsService.getPerformanceReport(userId, args.startDate, args.endDate);
          break;
        case 'update_profile_preferences':
          result = await this.userService.updatePreferences(userId, args.preferences);
          break;
        default:
          return { error: 'Tool not found' };
      }

      return JSON.parse(JSON.stringify(result, (k, v) => typeof v === 'bigint' ? v.toString() : v));
    } catch (error) {
      this.logger.error(`[User ${userId}] Tool ${name} failed: ${error.message}`);
      return { error: error.message };
    }
  }
}
