import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { setupApp } from './app.setup.js';
import { ConfigService } from '../../../../../CodeflowStudio/codeflow-studio/src/backend/src/config/config.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  const { env } = app.get(ConfigService);
  app.enableCors({ origin: env.CORS_ORIGIN });
  await app.listen(env.PORT);
}
void bootstrap();
