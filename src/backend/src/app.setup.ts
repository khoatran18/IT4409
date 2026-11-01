import {
  HttpStatus,
  INestApplication,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { parseTrustProxy } from './config/env';
import { ConfigService } from './config/config.service';
import {
  ApiException,
  ErrorDetail,
} from './common/filters/all-exceptions.filter';

function flatten(errors: ValidationError[], prefix = ''): ErrorDetail[] {
  return errors.flatMap((error) => {
    const path = prefix ? `${prefix}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({
      path,
      message,
    }));
    return [...own, ...flatten(error.children ?? [], path)];
  });
}

export function setupApp(app: INestApplication) {
  app.setGlobalPrefix('api/v1');
  // Sau reverse proxy, req.ip (khóa của rate limit) phải lấy từ X-Forwarded-For
  app
    .getHttpAdapter()
    .getInstance()
    .set(
      'trust proxy',
      parseTrustProxy(app.get(ConfigService).env.TRUST_PROXY),
    );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) =>
        new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Dữ liệu không hợp lệ',
          flatten(errors),
        ),
    }),
  );
}
