import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StravaApiService } from '../strava/strava-api.service';

@Injectable()
export class ActivitySyncService {
  constructor(
    private prisma: PrismaService,
    private stravaApi: StravaApiService,
  ) {}

  async syncUserActivities(userId: bigint, fetchAll = false) {
    const lastActivity = await this.prisma.activity.findFirst({
      where: { user_id: userId },
      orderBy: { start_date: 'desc' },
    });

    const after = (lastActivity && !fetchAll)
      ? Math.floor(lastActivity.start_date.getTime() / 1000)
      : undefined;

    const stravaActivities = await this.stravaApi.fetchActivities(userId, after);

    const syncPromises = stravaActivities
      .filter((act: any) => act.type === 'Run')
      .map(async (summaryAct: any) => {
        // Fetch full activity detail to get calories and splits
        const act = await this.stravaApi.fetchActivityDetail(
          userId,
          summaryAct.id.toString(),
        );

        return this.prisma.activity.upsert({
          where: { strava_activity_id: BigInt(act.id) },
          update: {
            name: act.name,
            distance: act.distance,
            moving_time: act.moving_time,
            average_speed: act.average_speed,
            max_speed: act.max_speed,
            average_heartrate: act.average_heartrate,
            max_heartrate: act.max_heartrate,
            average_cadence: act.average_cadence,
            total_elevation_gain: act.total_elevation_gain,
            suffer_score: act.suffer_score,
            calories: act.calories,
            raw_json: JSON.stringify(act),
          },
          create: {
            strava_activity_id: BigInt(act.id),
            user_id: userId,
            name: act.name,
            type: act.type,
            start_date: new Date(act.start_date_local),
            distance: act.distance,
            moving_time: act.moving_time,
            average_speed: act.average_speed,
            max_speed: act.max_speed,
            average_heartrate: act.average_heartrate,
            max_heartrate: act.max_heartrate,
            average_cadence: act.average_cadence,
            total_elevation_gain: act.total_elevation_gain,
            suffer_score: act.suffer_score,
            calories: act.calories,
            raw_json: JSON.stringify(act),
          },
        });
      });

    await Promise.all(syncPromises);

    return { count: syncPromises.length };
  }
}
