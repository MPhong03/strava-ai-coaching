import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
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
  async addGeminiKey(@Request() req: any, @Body('key') key: string) {
    const userId = BigInt(req.user.userId);
    return this.userService.addGeminiKey(userId, key);
  }

  @Delete('gemini-key/:id')
  async deleteGeminiKey(@Request() req: any, @Param('id') id: string) {
    const userId = BigInt(req.user.userId);
    return this.userService.deleteGeminiKey(userId, BigInt(id));
  }

  @Post('test-gemini-key/:id')
  async testGeminiKey(
    @Request() req: any,
    @Param('id') id: string,
    @Body('model') modelName?: string,
  ) {
    const userId = BigInt(req.user.userId);
    return this.userService.testGeminiKey(userId, BigInt(id), modelName);
  }

  @Get('gemini-key/:id/models')
  async listGeminiKeyModels(@Request() req: any, @Param('id') id: string) {
    const userId = BigInt(req.user.userId);
    return this.userService.listModelsForKey(userId, BigInt(id));
  }

  @Post('round-robin')
  async toggleRoundRobin(
    @Request() req: any,
    @Body('enabled') enabled: boolean,
  ) {
    const userId = BigInt(req.user.userId);
    return this.userService.toggleRoundRobin(userId, enabled);
  }

  @Post('profile-update')
  async updateProfile(@Request() req: any, @Body() data: any) {
    const userId = BigInt(req.user.userId);
    return this.userService.updateProfile(userId, data);
  }
}
