import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Query,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ActivitySyncService } from './activity-sync.service';
import { PrismaService } from '../database/prisma.service';
import { StravaApiService } from '../strava/strava-api.service';

@Controller('activities')
@UseGuards(AuthGuard('jwt'))
export class ActivitiesController {
  constructor(
    private activitySyncService: ActivitySyncService,
    private prisma: PrismaService,
    private stravaApi: StravaApiService,
  ) {}

  @Get()
  async getActivities(
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('export') isExport?: string,
  ) {
    const userId = BigInt(req.user.userId);
    const skip = (page - 1) * limit;

    const where: any = { user_id: userId };
    if (startDate || endDate) {
      where.start_date = {};
      if (startDate) where.start_date.gte = new Date(startDate);
      if (endDate) where.start_date.lte = new Date(endDate);
    }

    // If export, return raw_json and bypass pagination
    if (isExport === 'true') {
      const allActivities = await this.prisma.activity.findMany({
        where,
        orderBy: { start_date: 'desc' },
      });
      return allActivities.map(a => JSON.parse(a.raw_json));
    }

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        orderBy: { start_date: 'desc' },
        skip: Number(skip),
        take: Number(limit),
      }),
      this.prisma.activity.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        last_page: Math.ceil(total / limit),
      },
    };
  }

  @Get(':id')
  async getActivity(@Param('id') id: string, @Request() req: any) {
    const userId = BigInt(req.user.userId);
    const activityId = BigInt(id);
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, user_id: userId },
    });

    if (activity) {
      const rawJson = JSON.parse(activity.raw_json);
      // If summary (resource_state: 2), fetch full detail and update DB
      if (rawJson.resource_state === 2) {
        try {
          const detail = await this.stravaApi.fetchActivityDetail(
            userId,
            activity.strava_activity_id.toString(),
          );
          return await this.prisma.activity.update({
            where: { id: activity.id },
            data: {
              calories: detail.calories,
              raw_json: JSON.stringify(detail),
            },
          });
        } catch (error) {
          console.error('Failed to auto-fetch detail:', error);
        }
      }
    }
    return activity;
  }

  @Post('sync')
  async syncActivities(@Request() req: any, @Query('fetchAll') fetchAll?: string) {
    const userId = BigInt(req.user.userId);
    return this.activitySyncService.syncUserActivities(userId, fetchAll === 'true');
  }
}
