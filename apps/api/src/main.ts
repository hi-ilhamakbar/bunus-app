import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { createValidationPipe } from './common/validation';
import { APP_CONFIG, type AppConfig } from './config/app-config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<AppConfig>(APP_CONFIG);

  app.set('trust proxy', config.trustProxy); // so req.ip is the real client behind Nginx
  app.setGlobalPrefix('api/v1');
  app.use(helmet({ contentSecurityPolicy: config.isProduction }));
  app.use(cookieParser());
  app.enableCors({ origin: config.appOrigin, credentials: true });
  app.useGlobalPipes(createValidationPipe());

  if (!config.isProduction) {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Bunus API').setVersion('0.1.0').addCookieAuth(config.session.cookieName).build(),
    );
    SwaggerModule.setup('api/docs', app, doc);
  }

  app.enableShutdownHooks();
  await app.listen(config.port);
  new Logger('Bootstrap').log(`API listening on :${config.port} (${config.nodeEnv})`);
}

void bootstrap();
