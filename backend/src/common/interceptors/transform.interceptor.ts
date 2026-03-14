import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, any>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const http = context.switchToHttp();
    const request = http.getRequest();

    // BỎ QUA Interceptor nếu đây là yêu cầu render giao diện (MVC)
    // Hoặc nếu kết quả trả về đã được định nghĩa là một view
    if (request.url.includes('/auth/strava/bridge') || request.url === '/') {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => ({
        data: JSON.parse(
          JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value,
          ),
        ),
      })),
    );
  }
}
