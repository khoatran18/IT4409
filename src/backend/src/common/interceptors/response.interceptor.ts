import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

/** Controller trả `{ data, meta }` cho danh sách; mọi giá trị khác được bọc thành `{ data }`. */
export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((value: unknown) => {
        if (value === undefined) return value;
        if (isPaginated(value)) return value;
        return { data: value };
      }),
    );
  }
}

function isPaginated(value: unknown): value is Paginated<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'meta' in value
  );
}
