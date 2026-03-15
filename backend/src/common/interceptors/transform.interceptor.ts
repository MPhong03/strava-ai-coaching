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
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const request = http.getRequest();

    // BỎ QUA Interceptor nếu đây là yêu cầu render giao diện (MVC)
    // Hoặc nếu kết quả trả về đã được định nghĩa là một view
    if (request.url.includes('/auth/strava/bridge') || request.url === '/') {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        const response = http.getResponse();

        // Nếu header đã được gửi (ví dụ qua @Res), KHÔNG bọc dữ liệu nữa
        if (response.headersSent) {
          return data;
        }

        // Nếu data là undefined (ví dụ method trả về void), chuyển thành null để stringify an toàn
        const safeData = data === undefined ? null : data;

        return {
          data: JSON.parse(
            JSON.stringify(safeData, (key, value) =>
              typeof value === 'bigint' ? value.toString() : value,
            ),
          ),
        };
      }),
    );
  }
}
