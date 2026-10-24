import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createEmptyProject, projectSchema } from '@codeflow/schema';
import { ApiException } from '../../common/filters/all-exceptions.filter';
import { Paginated } from '../../common/interceptors/response.interceptor';
import {
  AccessLevel,
  hasProjectAccess,
} from '../../common/policies/project-access';
import { AuthUser } from '../../common/types';
import type { Prisma, Project } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type ProjectSummary = Omit<Project, 'schema'>;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    user: AuthUser,
    page: number,
    pageSize: number,
  ): Promise<Paginated<ProjectSummary>> {
    const where = user.role === 'admin' ? {} : { ownerId: user.id };
    const [total, rows] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        omit: { schema: true },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { data: rows, meta: { page, pageSize, total } };
  }

  create(user: AuthUser, name: string) {
    return this.prisma.project.create({
      data: {
        name,
        ownerId: user.id,
        schema: createEmptyProject(name) as unknown as Prisma.InputJsonObject,
      },
    });
  }

  get(user: AuthUser, id: string) {
    return this.findAccessible(user, id, 'view');
  }

  async save(user: AuthUser, id: string, schema: unknown, version: number) {
    await this.findAccessible(user, id, 'edit');

    const parsed = projectSchema.safeParse(schema);
    if (!parsed.success) {
      throw new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'Schema không hợp lệ',
        parsed.error.issues.map((issue) => ({
          path: ['schema', ...issue.path].join('.'),
          message: issue.message,
        })),
      );
    }

    const updated = await this.prisma.project.updateMany({
      where: { id, version },
      data: {
        name: parsed.data.meta.name,
        schema: parsed.data as unknown as Prisma.InputJsonObject,
        version: { increment: 1 },
      },
    });
    if (updated.count === 0) {
      throw new ConflictException(
        'Project đã được thay đổi ở nơi khác, hãy tải lại',
      );
    }
    return this.findAccessible(user, id, 'edit');
  }

  async remove(id: string) {
    const result = await this.prisma.project.deleteMany({ where: { id } });
    if (result.count === 0)
      throw new NotFoundException('Không tìm thấy project');
  }

  private async findAccessible(user: AuthUser, id: string, level: AccessLevel) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Không tìm thấy project');
    if (!hasProjectAccess(user, project, level)) {
      // không tiết lộ project tồn tại với người không có quyền xem
      if (level === 'view')
        throw new NotFoundException('Không tìm thấy project');
      throw new ForbiddenException('Không đủ quyền sửa project này');
    }
    return project;
  }
}
