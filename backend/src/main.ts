import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Tìm thư mục views ở nhiều vị trí khả thi để đảm bảo luôn hoạt động
  const possiblePaths = [
    join(__dirname, '..', 'views'),       // Trong dist (nếu nest-cli copy thành công)
    join(process.cwd(), 'views'),         // Ở gốc thư mục đang chạy (local dev)
    join(process.cwd(), 'backend', 'views') // Ở gốc monorepo
  ];

  let viewsPath = possiblePaths[0];
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      viewsPath = path;
      break;
    }
  }

  app.setBaseViewsDir(viewsPath);
  app.setViewEngine('ejs');
  
  console.log(`Working directory: ${process.cwd()}`);
  console.log(`Selected Views directory: ${viewsPath}`);

  await app.listen(process.env.PORT || 3001, '0.0.0.0');
  const url = await app.getUrl();
  console.log(`Backend running on: ${url}`);
}
bootstrap();
