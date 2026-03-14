import { Controller, Post, Body, Get, Query, Render } from '@nestjs/common';
import { StravaAuthService } from './strava-auth.service';
import { ConfigService } from '@nestjs/config';

@Controller('auth/strava')
export class AuthController {
  constructor(
    private stravaAuthService: StravaAuthService,
    private configService: ConfigService,
  ) {}

  @Get('bridge')
  @Render('bridge')
  async bridge(@Query('code') code: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    return { code, frontendUrl };
  }

  @Post('callback')
  async callback(@Body() body: { code: string; redirect_uri?: string }) {
    return this.stravaAuthService.validateStravaCode(body.code, body.redirect_uri);
  }
}
