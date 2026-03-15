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
  public status$ = new Subject<{
    sessionId: string;
    status: string;
    toolName?: string;
  }>();

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

  async sendMessage(
    userId: bigint,
    sessionId: bigint,
    userMessage: string,
    onChunk: (text: string) => void,
  ) {
    this.logger.log(
      `[Session ${sessionId}] Processing new message from User ${userId}`,
    );

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

    // 2. Chuẩn bị context window (Hierarchical Memory)
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    const shortTermHistory = await this.prisma.chatMessage.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    const recentMessages = shortTermHistory.reverse();

    const contents: Content[] = recentMessages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content || '' }],
    }));

    const midTermSummary = session?.context_summary
      ? `\n[TÓM TẮT HỘI THOẠI TRƯỚC ĐÓ]: ${session.context_summary}\n`
      : '';

    const systemInstruction = `
      Bạn là ${user.partner_name || 'AI Partner'}, một cộng sự AI chuyên nghiệp về chạy bộ và sức khỏe.
      Phong cách: ${user.partner_persona || 'Thân thiện, động viên'}.
      ${midTermSummary}
      Bạn có quyền truy cập vào các công cụ để xem dữ liệu. Luôn xưng hô phù hợp.
      Bạn đang hỗ trợ người dùng dựa trên dữ liệu Strava và nhật ký tập luyện của họ.
    `;

    const messageCount = await this.prisma.chatMessage.count({
      where: { session_id: sessionId },
    });
    if (messageCount > 0 && messageCount % 10 === 0) {
      this.summarizeContext(userId, sessionId).catch((err) =>
        this.logger.error(`Summarization failed: ${err.message}`),
      );
    }

    let retryCount = 0;
    const maxRetries = 3;
    let lastError: any = null;

    while (retryCount < maxRetries) {
      const selectedKey = await this.loadBalancer.getBestKey(userId);
      try {
        const genAI = (this.geminiApi as any).getClient(selectedKey.key);
        const model = genAI.getGenerativeModel({
          model: 'gemini-3-flash-preview',
          systemInstruction,
        });

        const chat = model.startChat({
          history: contents.slice(0, -1),
          tools: [{ functionDeclarations: chatTools }],
        });

        this.status$.next({
          sessionId: sessionId.toString(),
          status: 'thinking',
        });

        // Dùng sendMessageStream thay vì sendMessage
        const result = await chat.sendMessageStream(userMessage);

        let aiContent = '';
        const toolLogs: any[] = [];

        // Xử lý stream đầu tiên (có thể là text hoặc tool call)
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            aiContent += chunkText;
            onChunk(chunkText); // Stream về client ngay lập tức
          }
        }

        const response = await result.response;

        // Vòng lặp xử lý Function Calling (nếu có)
        let callCount = 0;
        let currentResponse = response;
        while (
          currentResponse.candidates?.[0]?.content?.parts?.some(
            (p: any) => p.functionCall,
          ) &&
          callCount < 5
        ) {
          const toolCalls = currentResponse.candidates[0].content.parts.filter(
            (p: any) => p.functionCall,
          );
          const toolResultsForAI: any[] = [];

          for (const call of toolCalls) {
            const { name, args } = call.functionCall;
            this.status$.next({
              sessionId: sessionId.toString(),
              status: 'calling_tool',
              toolName: name,
            });
            const output = await this.executeTool(userId, name, args);
            toolLogs.push({ tool: name, args, result: output });
            toolResultsForAI.push({
              functionResponse: { name, response: { content: output } },
            });
          }

          // Gửi kết quả tool lại AI và tiếp tục stream
          const toolStreamResult =
            await chat.sendMessageStream(toolResultsForAI);
          for await (const chunk of toolStreamResult.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              aiContent += chunkText;
              onChunk(chunkText); // Tiếp tục stream text sau khi gọi tool
            }
          }
          currentResponse = await toolStreamResult.response;
          callCount++;
        }

        // Lưu kết quả cuối cùng vào DB
        const assistantMsg = await this.prisma.chatMessage.create({
          data: {
            session_id: sessionId,
            role: 'assistant',
            content: aiContent,
            tool_logs: toolLogs.length > 0 ? JSON.stringify(toolLogs) : null,
          },
        });

        if (currentResponse.usageMetadata) {
          await this.prisma.geminiUsage.create({
            data: {
              user_id: userId,
              type: 'CHAT',
              model_name: 'gemini-3-flash-preview',
              prompt_tokens:
                currentResponse.usageMetadata.promptTokenCount || 0,
              candidate_tokens:
                currentResponse.usageMetadata.candidatesTokenCount || 0,
              total_tokens: currentResponse.usageMetadata.totalTokenCount || 0,
            },
          });
        }

        this.status$.next({ sessionId: sessionId.toString(), status: 'idle' });
        return assistantMsg;
      } catch (error: any) {
        await this.loadBalancer.reportError(selectedKey.id, error);
        lastError = error;
        retryCount++;
        if (
          !error.message?.includes('429') &&
          !error.message?.includes('Quota exceeded')
        )
          break;
      }
    }

    this.status$.next({ sessionId: sessionId.toString(), status: 'idle' });
    // Nếu lỗi, fallback về text thông thường hoặc ném lỗi
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
          result = await this.journalService.upsertJournal(
            userId,
            today,
            args.content,
          );
          break;
        case 'get_daily_journal':
          result = await this.journalService.getJournal(userId, args.date);
          break;
        case 'sync_recent':
          result = await this.activitySync.syncUserActivities(userId, false);
          break;
        case 'get_performance_report':
          result = await this.reportsService.getPerformanceReport(
            userId,
            args.startDate,
            args.endDate,
          );
          break;
        case 'update_profile_preferences':
          result = await this.userService.updatePreferences(
            userId,
            args.preferences,
          );
          break;
        default:
          return { error: 'Tool not found' };
      }

      const safeResult = result === undefined ? null : result;
      return JSON.parse(
        JSON.stringify(safeResult, (k, v) =>
          typeof v === 'bigint' ? v.toString() : v,
        ),
      );
    } catch (error) {
      this.logger.error(
        `[User ${userId}] Tool ${name} failed: ${error.message}`,
      );
      return { error: error.message };
    }
  }

  private async summarizeContext(userId: bigint, sessionId: bigint) {
    this.logger.log(
      `[Session ${sessionId}] Triggering rolling summarization...`,
    );

    // Lấy 20 tin nhắn gần nhất để tóm tắt
    const messages = await this.prisma.chatMessage.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    const conversationText = messages
      .reverse()
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const summaryPrompt = `
      Hãy tóm tắt ngắn gọn (dưới 500 tokens) nội dung cuộc hội thoại dưới đây. 
      Tập trung vào:
      1. Mục tiêu tập luyện của người dùng.
      2. Các vấn đề sức khỏe hoặc chấn thương đang gặp phải (nếu có).
      3. Sở thích hoặc thói quen chạy bộ.
      4. Các quyết định hoặc kế hoạch đã chốt trong buổi trò chuyện.
      
      Hội thoại:
      ${conversationText}
    `;

    try {
      const selectedKey = await this.loadBalancer.getBestKey(userId);
      const genAI = (this.geminiApi as any).getClient(selectedKey.key);
      const model = genAI.getGenerativeModel({
        model: 'gemini-3-flash-preview',
      });

      const result = await model.generateContent(summaryPrompt);
      const summary = result.response.text();

      await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { context_summary: summary },
      });

      this.logger.log(`[Session ${sessionId}] Summarization complete.`);
    } catch (error) {
      this.logger.error(
        `[Session ${sessionId}] Summarization failed: ${error.message}`,
      );
    }
  }
}
