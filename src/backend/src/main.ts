import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';
import { ConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  const { env } = app.get(ConfigService);
  app.enableCors({ origin: env.CORS_ORIGIN });
  await app.listen(env.PORT);
}
void bootstrap();
