import {
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { GenerateService } from './generate.service';

@Controller('projects')
export class GenerateController {
  constructor(private readonly generate: GenerateService) {}

  @HttpCode(200)
  @Post(':id/validate')
  validate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.generate.validate(user, id);
  }
}
