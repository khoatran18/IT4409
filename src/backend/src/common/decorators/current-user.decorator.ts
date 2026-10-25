import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AppRequest, AuthUser } from '../types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<AppRequest>().user as AuthUser,
);
