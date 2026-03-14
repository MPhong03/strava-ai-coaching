import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AiUsageService {
  constructor(private prisma: PrismaService) {}

  async getUsageStats(userId: bigint) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [dailyUsage, monthlyUsage, history] = await Promise.all([
      this.prisma.geminiUsage.aggregate({
        where: { user_id: userId, created_at: { gte: today } },
        _sum: { total_tokens: true },
        _count: { id: true },
      }),
      this.prisma.geminiUsage.aggregate({
        where: { user_id: userId, created_at: { gte: firstDayOfMonth } },
        _sum: { total_tokens: true },
        _count: { id: true },
      }),
      this.prisma.geminiUsage.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
    ]);

    return {
      daily: {
        tokens: dailyUsage._sum.total_tokens || 0,
        calls: dailyUsage._count.id,
      },
      monthly: {
        tokens: monthlyUsage._sum.total_tokens || 0,
        calls: monthlyUsage._count.id,
      },
      history,
    };
  }
}
