import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppException } from './shared/exceptions/app.exception';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) =>
        new AppException(
          400,
          'VALIDATION_ERROR',
          'Validation failed',
          errors.flatMap((error) =>
            Object.values(error.constraints ?? {}).map((message) => ({
              field: error.property,
              message,
            })),
          ),
        ),
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableCors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://192.168.100.142:5173'], credentials: true });
  await app.listen(3000);
}

void bootstrap();
