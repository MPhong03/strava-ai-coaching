import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';

@Controller('user')
@UseGuards(AuthGuard('jwt'))
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  async getProfile(@Request() req: any) {
    const userId = BigInt(req.user.userId);
    return this.userService.getProfile(userId);
  }

  @Post('preferences')
  async updatePreferences(@Request() req: any, @Body() preferences: any) {
    const userId = BigInt(req.user.userId);
    return this.userService.updatePreferences(userId, preferences);
  }

  @Post('gemini-key')
  async updateGeminiKey(@Request() req: any, @Body('key') key: string) {
    const userId = BigInt(req.user.userId);
    return this.userService.updateGeminiKey(userId, key);
  }
}
