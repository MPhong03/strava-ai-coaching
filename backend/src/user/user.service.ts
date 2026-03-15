import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EncryptionUtil } from '../common/utils/encryption.util';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        profile_picture: true,
        preferences: true,
        round_robin_enabled: true,
        partner_name: true,
        partner_persona: true,
        geminiApiKeys: {
          select: {
            id: true,
            key: true,
            status: true,
            is_active: true,
            error_count: true,
            last_used_at: true,
          },
        },
      },
    });

    if (user) {
      // Mask all API keys
      user.geminiApiKeys = user.geminiApiKeys.map((k) => ({
        ...k,
        key: '********' + k.key.slice(-4),
      })) as any;
    }

    return user;
  }

  async updatePreferences(userId: bigint, preferences: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        preferences: JSON.stringify(preferences),
      },
    });
  }

  async toggleRoundRobin(userId: bigint, enabled: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { round_robin_enabled: enabled },
    });
  }

  async addGeminiKey(userId: bigint, key: string) {
    const encryptionKey = process.env.ENCRYPTION_KEY!;
    const encryptedKey = EncryptionUtil.encrypt(key, encryptionKey);

    return this.prisma.geminiApiKey.create({
      data: {
        user_id: userId,
        key: encryptedKey,
      },
    });
  }

  async deleteGeminiKey(userId: bigint, keyId: bigint) {
    return this.prisma.geminiApiKey.delete({
      where: { id: keyId, user_id: userId },
    });
  }

  async updateProfile(
    userId: bigint,
    data: { partner_name?: string; partner_persona?: string },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        partner_name: data.partner_name,
        partner_persona: data.partner_persona,
      },
    });
  }
}
