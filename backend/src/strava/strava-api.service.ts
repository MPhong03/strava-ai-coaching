import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import axios from 'axios';
import { EncryptionUtil } from '../common/utils/encryption.util';

@Injectable()
export class StravaApiService {
  constructor(private prisma: PrismaService) {}

  async getAccessToken(userId: bigint): Promise<string> {
    const tokenRecord = await this.prisma.stravaToken.findUnique({
      where: { user_id: userId },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Strava account not connected');
    }

    const encryptionKey = process.env.ENCRYPTION_KEY!;
    const accessToken = EncryptionUtil.decrypt(
      tokenRecord.access_token,
      encryptionKey,
    );

    if (new Date() < tokenRecord.expires_at) {
      return accessToken;
    }

    // Refresh token
    const refreshToken = EncryptionUtil.decrypt(
      tokenRecord.refresh_token,
      encryptionKey,
    );
    return this.refreshAccessToken(userId, refreshToken);
  }

  private async refreshAccessToken(
    userId: bigint,
    refreshToken: string,
  ): Promise<string> {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    const encryptionKey = process.env.ENCRYPTION_KEY!;

    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      const { access_token, refresh_token: new_refresh_token, expires_at } =
        response.data;

      const encryptedAccessToken = EncryptionUtil.encrypt(
        access_token,
        encryptionKey,
      );
      const encryptedRefreshToken = EncryptionUtil.encrypt(
        new_refresh_token,
        encryptionKey,
      );

      await this.prisma.stravaToken.update({
        where: { user_id: userId },
        data: {
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          expires_at: new Date(expires_at * 1000),
        },
      });

      return access_token;
    } catch (error) {
      throw new UnauthorizedException('Failed to refresh Strava token');
    }
  }

  async fetchActivities(userId: bigint, after?: number) {
    const accessToken = await this.getAccessToken(userId);
    const params: any = { per_page: 200 };
    if (after) {
      params.after = after;
    }

    const response = await axios.get(
      'https://www.strava.com/api/v3/athlete/activities',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params,
      },
    );

    return response.data;
  }

  async fetchActivityDetail(userId: bigint, activityId: string) {
    const accessToken = await this.getAccessToken(userId);
    const response = await axios.get(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    return response.data;
  }
}
