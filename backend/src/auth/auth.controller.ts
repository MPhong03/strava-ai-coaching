import { Controller, Post, Body } from '@nestjs/common';
import { StravaAuthService } from './strava-auth.service';

@Controller('auth/strava')
export class AuthController {
  constructor(private stravaAuthService: StravaAuthService) {}

  @Post('callback')
  async callback(@Body('code') code: string) {
    return this.stravaAuthService.validateStravaCode(code);
  }
}
