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
        gemini_api_key: true,
      },
    });

    if (user && user.gemini_api_key) {
      // Don't return the full key, just a masked version
      user.gemini_api_key = '********' + user.gemini_api_key.slice(-4);
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

  async updateGeminiKey(userId: bigint, key: string) {
    const encryptionKey = process.env.ENCRYPTION_KEY!;
    const encryptedKey = EncryptionUtil.encrypt(key, encryptionKey);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        gemini_api_key: encryptedKey,
      },
    });
  }
}
