import {
  HttpStatus,
  INestApplication,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
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
