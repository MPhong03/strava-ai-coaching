import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GeminiApiService } from './gemini-api.service';
import { GeminiLoadBalancer } from './gemini-load-balancer.service';

@Injectable()
export class InsightService {
  constructor(
    private prisma: PrismaService,
    private geminiApi: GeminiApiService,
    private loadBalancer: GeminiLoadBalancer,
  ) {}

  async getInsight(activityId: bigint, userId: bigint, generate = false) {
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, user_id: userId },
      include: {
        insight: true,
        user: { select: { preferences: true, selected_model: true } },
      },
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usageCount = await this.prisma.aiUsageLog.count({
      where: {
        user_id: userId,
        type: 'ACTIVITY',
        target_id: activityId.toString(),
        created_at: { gte: today },
      },
    });

    const limitInfo = {
      used: usageCount,
      total: 3,
      remaining: Math.max(0, 3 - usageCount),
    };

    if (!generate && activity.insight) {
      return { insight: activity.insight, limit: limitInfo };
    }

    if (!generate && !activity.insight) {
      return { insight: null, limit: limitInfo };
    }

    if (usageCount >= 3) {
      throw new Error(
        'Bạn đã hết lượt gọi AI cho bài chạy này trong hôm nay (Tối đa 3 lần/ngày).',
      );
    }

    // Load Balance Selection
    const selectedKey = await this.loadBalancer.getBestKey(userId);

    const preferences = activity.user.preferences
      ? JSON.parse(activity.user.preferences)
      : null;
    const dateKey = activity.start_date.toISOString().split('T')[0];
    const journalDate = new Date(`${dateKey}T00:00:00Z`);

    const journal = await this.prisma.dailyJournal.findUnique({
      where: { user_id_date: { user_id: userId, date: journalDate } },
    });

    const context = {
      ...activity,
      user_preferences: preferences,
      daily_journal:
        journal?.content || 'Không có ghi chép gì thêm cho ngày này.',
    };

    try {
      const aiResult = await this.geminiApi.generateInsight(
        context,
        preferences,
        selectedKey.key,
        activity.user.selected_model || undefined,
      );

      // Log Usage
      await this.prisma.aiUsageLog.create({
        data: {
          user_id: userId,
          type: 'ACTIVITY',
          target_id: activityId.toString(),
        },
      });

      await this.prisma.geminiUsage.create({
        data: {
          user_id: userId,
          key_id: selectedKey.id,
          type: 'ACTIVITY',
          model_name: aiResult.model,
          prompt_tokens: aiResult.usage?.promptTokenCount || 0,
          candidate_tokens: aiResult.usage?.candidatesTokenCount || 0,
          total_tokens: aiResult.usage?.totalTokenCount || 0,
        },
      });

      const updatedInsight = await this.prisma.insight.upsert({
        where: { activity_id: activityId },
        update: {
          praise: aiResult.data.praise,
          improvement: aiResult.data.improvement,
          warning: aiResult.data.warning,
        },
        create: {
          activity_id: activityId,
          user_id: userId,
          praise: aiResult.data.praise,
          improvement: aiResult.data.improvement,
          warning: aiResult.data.warning,
        },
      });

      return {
        insight: updatedInsight,
        limit: {
          ...limitInfo,
          used: usageCount + 1,
          remaining: 3 - (usageCount + 1),
        },
      };
    } catch (error) {
      await this.loadBalancer.reportError(selectedKey.id, error);
      throw error;
    }
  }
}
