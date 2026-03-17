import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EncryptionUtil } from '../common/utils/encryption.util';

export interface SelectedKey {
  id: bigint;
  key: string;
}

@Injectable()
export class GeminiLoadBalancer {
  constructor(private prisma: PrismaService) {}

  async getBestKey(userId: bigint, modelName?: string): Promise<SelectedKey> {
    const whereClause: any = { is_active: true, status: 'HEALTHY' };

    // If a specific model is requested, we might want to ensure the key can access it,
    // but Gemini keys usually have access to all public models.
    // For now, we'll just filter by basic health and use the modelName in the actual AI call later.

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        geminiApiKeys: {
          where: whereClause,
          orderBy: { last_used_at: 'asc' },
        },
      },
    });

    if (!user || user.geminiApiKeys.length === 0) {
      // Tự động reset các key bị RATE_LIMITED nếu đã qua 1 phút
      await this.resetRateLimits(userId);

      // Thử tìm lại
      const retryUser = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          geminiApiKeys: {
            where: { is_active: true, status: 'HEALTHY' },
            orderBy: { last_used_at: 'asc' },
          },
        },
      });

      if (!retryUser || retryUser.geminiApiKeys.length === 0) {
        throw new BadRequestException(
          'Không tìm thấy Gemini API Key nào khả dụng (HEALTHY). Vui lòng kiểm tra lại cấu hình.',
        );
      }
      return this.selectKey(retryUser);
    }

    return this.selectKey(user);
  }

  private async selectKey(user: any): Promise<SelectedKey> {
    let keyRecord;

    if (user.round_robin_enabled) {
      // Round Robin: Lấy key đã lâu chưa dùng nhất (đã orderBy last_used_at asc)
      keyRecord = user.geminiApiKeys[0];
    } else {
      // Ưu tiên key đầu tiên (vẫn theo last_used_at để đảm bảo xoay vòng nếu key chính lỗi)
      keyRecord = user.geminiApiKeys[0];
    }

    const encryptionKey = process.env.ENCRYPTION_KEY!;
    const decryptedKey = EncryptionUtil.decrypt(keyRecord.key, encryptionKey);

    // Cập nhật thời điểm sử dụng
    await this.prisma.geminiApiKey.update({
      where: { id: keyRecord.id },
      data: { last_used_at: new Date() },
    });

    return { id: keyRecord.id, key: decryptedKey };
  }

  async reportError(keyId: bigint, error: any) {
    const errorMessage = error.message || 'Unknown error';
    const isRateLimit =
      errorMessage.includes('429') ||
      errorMessage.includes('Quota exceeded') ||
      errorMessage.includes('Rate limit');

    const status = isRateLimit ? 'RATE_LIMITED' : 'FAILED';

    if (status === 'RATE_LIMITED') {
      await this.prisma.geminiApiKey.update({
        where: { id: keyId },
        data: {
          status: 'RATE_LIMITED',
          last_used_at: new Date(),
          last_error: errorMessage,
        },
      });
    } else {
      await this.prisma.geminiApiKey.update({
        where: { id: keyId },
        data: {
          error_count: { increment: 1 },
          status: 'FAILED',
          last_error: errorMessage,
        },
      });
    }
  }

  private async resetRateLimits(userId: bigint) {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    await this.prisma.geminiApiKey.updateMany({
      where: {
        user_id: userId,
        status: 'RATE_LIMITED',
        last_used_at: { lt: oneMinuteAgo },
      },
      data: { status: 'HEALTHY' },
    });
  }
}
