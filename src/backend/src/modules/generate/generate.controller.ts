import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import type { AuthUser } from '../../common/types';
import { GenerateDto } from './dto/generate.dto';
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

  @RateLimit('generate')
  @HttpCode(200)
  @Post(':id/generate')
  async generateZip(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenerateDto,
    @Res() res: Response,
  ) {
    const zip = await this.generate.generate(user, id, dto);
    res
      .status(200)
      .set({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zip.name}.zip"`,
        'Content-Length': String(zip.data.byteLength),
        'Cache-Control': 'no-store',
      })
      .end(Buffer.from(zip.data));
  }
}
