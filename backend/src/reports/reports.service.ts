import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GeminiApiService } from '../ai/gemini-api.service';
import { EncryptionUtil } from '../common/utils/encryption.util';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private geminiApi: GeminiApiService,
  ) {}

  async getPerformanceReport(userId: bigint, startDateStr?: string, endDateStr?: string, generate = false) {
    let startDate: Date;
    let endDate: Date;

    if (startDateStr && endDateStr) {
      startDate = new Date(startDateStr);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(endDateStr);
      endDate.setHours(0, 0, 0, 0);
    } else {
      const now = new Date();
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(new Date().setDate(diffToMonday));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(0, 0, 0, 0);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true, gemini_api_key: true }
    });

    let report = await this.prisma.performanceReport.findUnique({
      where: { 
        user_id_start_date_end_date: { user_id: userId, start_date: startDate, end_date: endDate } 
      }
    });

    const queryEndDate = new Date(endDate);
    queryEndDate.setHours(23, 59, 59, 999);

    const activities = await this.prisma.activity.findMany({
      where: {
        user_id: userId,
        start_date: { gte: startDate, lte: queryEndDate },
      },
    });

    const journals = await this.prisma.dailyJournal.findMany({
      where: {
        user_id: userId,
        date: { gte: startDate, lte: endDate },
      }
    });

    const activityCount = activities.length;
    const totalDistance = activities.reduce((sum, act) => sum + act.distance, 0);
    const totalMovingTime = activities.reduce((sum, act) => sum + act.moving_time, 0);
    const totalCalories = activities.reduce((sum, act) => sum + (act.calories || 0), 0);
    const totalElevationGain = activities.reduce((sum, act) => sum + act.total_elevation_gain, 0);
    const avgPace = totalDistance > 0 ? (totalMovingTime / 60) / (totalDistance / 1000) : 0;

    const data = {
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
      activity_count: activityCount,
      total_distance: totalDistance,
      total_moving_time: totalMovingTime,
      total_calories: totalCalories,
      total_elevation_gain: totalElevationGain,
      avg_pace: avgPace,
    };

    if (!report) {
      report = await this.prisma.performanceReport.create({ data });
    } else {
      report = await this.prisma.performanceReport.update({ where: { id: report.id }, data });
    }

    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfCurrentWeek = new Date(new Date().setDate(diff));
    startOfCurrentWeek.setHours(0, 0, 0, 0);

    const targetId = `${startDate.getFullYear()}-${startDate.getMonth()+1}-${startDate.getDate()}_${endDate.getFullYear()}-${endDate.getMonth()+1}-${endDate.getDate()}`;
    const usageCount = await this.prisma.aiUsageLog.count({
      where: {
        user_id: userId,
        type: 'REPORT',
        target_id: targetId,
        created_at: { gte: startOfCurrentWeek },
      }
    });

    const limitInfo = {
      used: usageCount,
      total: 5,
      remaining: Math.max(0, 5 - usageCount),
      hasKey: !!user?.gemini_api_key
    };

    if (!generate) {
      return { report, limit: limitInfo };
    }

    if (!user?.gemini_api_key) {
      throw new BadRequestException('Vui lòng cấu hình Gemini API Key trong phần Coach Settings để sử dụng tính năng này.');
    }

    if (usageCount >= 5) {
      throw new Error('Bạn đã hết lượt gọi AI cho báo cáo này trong tuần này (Tối đa 5 lần/tuần).');
    }

    const encryptionKey = process.env.ENCRYPTION_KEY!;
    const decryptedApiKey = EncryptionUtil.decrypt(user.gemini_api_key, encryptionKey);

    const preferences = user.preferences ? JSON.parse(user.preferences) : null;
    const summary = activities.map((a) => ({
      date: a.start_date,
      distance: (a.distance / 1000).toFixed(2) + ' km',
      pace: ((a.moving_time / 60) / (a.distance / 1000)).toFixed(2) + ' min/km',
      elevation: a.total_elevation_gain + ' m',
      name: a.name,
    }));

    const prompt = `
      Bạn là một Huấn luyện viên Chạy bộ Cao cấp. Hãy phân tích báo cáo hiệu suất từ ngày ${startDate.toLocaleDateString()} đến ${endDate.toLocaleDateString()} và đưa ra đánh giá tổng quan bằng tiếng Việt.
      Thông tin người chạy: ${JSON.stringify(preferences)}

      Nhật ký sinh hoạt & luyện tập bổ trợ:
      ${journals.map(j => `- Ngày ${j.date.toLocaleDateString()}: ${j.content}`).join('\n')}

      Dữ liệu hoạt động Strava:
      ${JSON.stringify(summary)}
      ...
    `;

    const aiResult = await this.geminiApi.generateText(prompt, decryptedApiKey);

    await this.prisma.aiUsageLog.create({
      data: { user_id: userId, type: 'REPORT', target_id: targetId }
    });

    await this.prisma.geminiUsage.create({
      data: {
        user_id: userId,
        type: 'REPORT',
        model_name: aiResult.model,
        prompt_tokens: aiResult.usage?.promptTokenCount || 0,
        candidate_tokens: aiResult.usage?.candidatesTokenCount || 0,
        total_tokens: aiResult.usage?.totalTokenCount || 0,
      }
    });

    const updatedReport = await this.prisma.performanceReport.update({
      where: { id: report.id },
      data: { trend_insight: aiResult.text, last_generated_at: new Date() }
    });

    return { 
      report: updatedReport, 
      limit: { ...limitInfo, used: usageCount + 1, remaining: 5 - (usageCount + 1) } 
    };
  }
}
