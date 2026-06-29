import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function bootstrap(): Promise<void> {
  const logger = new Logger('CreateAdminScript');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  try {
    const usersService = app.get(UsersService);
    const result = await usersService.ensureAdminAccount({
      email: getRequiredEnv('ADMIN_EMAIL'),
      password: getRequiredEnv('ADMIN_PASSWORD'),
      firstName: getRequiredEnv('ADMIN_FIRST_NAME'),
      lastName: getRequiredEnv('ADMIN_LAST_NAME'),
    });

    logger.log(
      `${result.created ? 'Created' : 'Found existing'} admin account for ${result.user.email}`,
    );
  } finally {
    await app.close();
  }
}

void bootstrap();
