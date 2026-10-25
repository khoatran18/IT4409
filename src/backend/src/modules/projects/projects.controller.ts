import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types';
import {
  CreateProjectDto,
  ListProjectsQuery,
  UpdateProjectDto,
} from './dto/project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListProjectsQuery) {
    return this.projects.list(user, query.page, query.pageSize);
  }

  @Roles('admin', 'staff')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProjectDto) {
    return this.projects.create(user, dto.name);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.projects.get(user, id);
  }

  @Put(':id')
  save(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.save(user, id, dto.schema, dto.version);
  }

  @Roles('admin')
  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.projects.remove(id);
  }
}
