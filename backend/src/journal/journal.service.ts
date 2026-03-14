import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class JournalService {
  constructor(private prisma: PrismaService) {}

  private getUtcMidnight(dateStr: string): Date {
    // Đảm bảo lấy đúng YYYY-MM-DD và tạo Date ở UTC midnight
    const datePart = dateStr.split('T')[0];
    return new Date(`${datePart}T00:00:00Z`);
  }

  async getJournal(userId: bigint, dateStr: string) {
    const journalDate = this.getUtcMidnight(dateStr);

    return this.prisma.dailyJournal.findUnique({
      where: {
        user_id_date: {
          user_id: userId,
          date: journalDate,
        },
      },
    });
  }

  async upsertJournal(userId: bigint, dateStr: string, content: string) {
    const journalDate = this.getUtcMidnight(dateStr);

    return this.prisma.dailyJournal.upsert({
      where: {
        user_id_date: {
          user_id: userId,
          date: journalDate,
        },
      },
      update: { content },
      create: {
        user_id: userId,
        date: journalDate,
        content,
      },
    });
  }
}
