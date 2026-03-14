import { Controller, Post, Body } from '@nestjs/common';
import { StravaAuthService } from './strava-auth.service';

@Controller('auth/strava')
export class AuthController {
  constructor(private stravaAuthService: StravaAuthService) {}

  @Post('callback')
  async callback(@Body() body: { code: string; redirect_uri?: string }) {
    return this.stravaAuthService.validateStravaCode(body.code, body.redirect_uri);
  }
}
