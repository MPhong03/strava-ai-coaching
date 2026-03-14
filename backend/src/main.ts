import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Đường dẫn chuẩn NestJS sau khi biên dịch (dist/views)
  // __dirname thường là dist/src, nên .. là dist/
  const viewsPath = join(__dirname, '..', 'views');
  
  console.log(`__dirname: ${__dirname}`);
  console.log(`process.cwd(): ${process.cwd()}`);
  
  if (existsSync(viewsPath)) {
    console.log(`Views directory found at: ${viewsPath}`);
    console.log('Contents:', readdirSync(viewsPath));
  } else {
    console.error(`ERROR: Views directory NOT found at: ${viewsPath}`);
    // Dự phòng tìm ở process.cwd()
    const fallbackPath = join(process.cwd(), 'views');
    console.log(`Checking fallback path: ${fallbackPath}`);
    if (existsSync(fallbackPath)) {
      console.log('Fallback path exists!');
    }
  }

  app.setBaseViewsDir(viewsPath);
  app.setViewEngine('ejs');

  await app.listen(process.env.PORT || 3001, '0.0.0.0');
  const url = await app.getUrl();
  console.log(`Backend running on: ${url}`);
}
bootstrap();
