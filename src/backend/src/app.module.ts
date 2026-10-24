import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '../../../../../CodeflowStudio/codeflow-studio/src/backend/src/config/config.module.js';
import { RequestLoggerMiddleware } from '../../../../../CodeflowStudio/codeflow-studio/src/backend/src/common/middleware/request-logger.middleware.js';
import { RateLimitGuard } from '../../../../../CodeflowStudio/codeflow-studio/src/backend/src/common/guards/rate-limit.guard.js';
import { JwtAuthGuard } from '../../../../../CodeflowStudio/codeflow-studio/src/backend/src/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../../../CodeflowStudio/codeflow-studio/src/backend/src/common/guards/roles.guard.js';
import { AllExceptionsFilter } from '../../../../../CodeflowStudio/codeflow-studio/src/backend/src/common/filters/all-exceptions.filter.js';
import { ResponseInterceptor } from '../../../../../CodeflowStudio/codeflow-studio/src/backend/src/common/interceptors/response.interceptor.js';
import { PrismaModule } from '../../../../../CodeflowStudio/codeflow-studio/src/backend/src/prisma/prisma.module.js';
import { RedisModule } from '../../../../../CodeflowStudio/codeflow-studio/src/backend/src/redis/redis.module.js';
import { AuthModule } from '../../../../../CodeflowStudio/codeflow-studio/src/backend/src/modules/auth/auth.module.js';
import { UsersModule } from '../../../../../CodeflowStudio/codeflow-studio/src/backend/src/modules/users/users.module.js';
import { ProjectsModule } from '../../../../../CodeflowStudio/codeflow-studio/src/backend/src/modules/projects/projects.module.js';
import { GenerateModule } from '../../../../../CodeflowStudio/codeflow-studio/src/backend/src/modules/generate/generate.module.js';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    UsersModule,
    AuthModule,
    ProjectsModule,
    GenerateModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*path');
  }
}
