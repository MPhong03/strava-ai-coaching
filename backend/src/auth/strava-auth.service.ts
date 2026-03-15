import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { EncryptionUtil } from '../common/utils/encryption.util';

@Injectable()
export class StravaAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateStravaCode(code: string, redirectUri?: string) {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    const encryptionKey = process.env.ENCRYPTION_KEY;
    const defaultRedirectUri = process.env.STRAVA_REDIRECT_URI;

    if (!clientId || !clientSecret || !encryptionKey) {
      throw new Error('Strava configuration missing in environment');
    }

    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri || defaultRedirectUri, // Sử dụng redirectUri từ frontend nếu có
      });

      const {
        access_token,
        refresh_token,
        expires_at,
        athlete: { id: athleteId, firstname, lastname, email, profile },
      } = response.data;

      const encryptedAccessToken = EncryptionUtil.encrypt(
        access_token,
        encryptionKey,
      );
      const encryptedRefreshToken = EncryptionUtil.encrypt(
        refresh_token,
        encryptionKey,
      );

      const user = await this.prisma.user.upsert({
        where: { strava_athlete_id: BigInt(athleteId) },
        update: {
          name: `${firstname} ${lastname}`,
          email: email || `athlete_${athleteId}@strava.com`,
          profile_picture: profile,
        },
        create: {
          strava_athlete_id: BigInt(athleteId),
          name: `${firstname} ${lastname}`,
          email: email || `athlete_${athleteId}@strava.com`,
          profile_picture: profile,
        },
      });

      await this.prisma.stravaToken.upsert({
        where: { user_id: user.id },
        update: {
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          expires_at: new Date(expires_at * 1000),
        },
        create: {
          user_id: user.id,
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          expires_at: new Date(expires_at * 1000),
        },
      });

      const payload = { sub: user.id.toString(), email: user.email };
      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        token: this.jwtService.sign(payload),
      };
    } catch (error) {
      console.error(
        'Strava Auth Error:',
        error.response?.data || error.message,
      );
      throw new UnauthorizedException('Failed to authenticate with Strava');
    }
  }
}
