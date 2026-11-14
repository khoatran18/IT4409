import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/filters/all-exceptions.filter';
import type { AuthUser } from '../../common/types';
import { generateZip, type GeneratedZip } from '../../generator/pipeline';
import { generateSecrets } from '../../generator/secrets';
import { SchemaValidationError } from '../../generator/types';
import { validateProject } from '../../schema-validator';
import { ProjectsService } from '../projects/projects.service';
import type { GenerateDto } from './dto/generate.dto';

@Injectable()
export class GenerateService {
  constructor(private readonly projects: ProjectsService) {}

  async validate(user: AuthUser, projectId: string) {
    const project = await this.projects.get(user, projectId);
    const { valid, errors, warnings } = validateProject(project.schema);
    return { valid, errors, warnings };
  }

  /** Secret sinh mới mỗi lần; tài khoản admin chỉ đi vào zip, không ghi DB hay log */
  async generate(
    user: AuthUser,
    projectId: string,
    dto: GenerateDto,
  ): Promise<GeneratedZip> {
    const project = await this.projects.getForEdit(user, projectId);
    try {
      return await generateZip(project.schema, {
        deploy: {
          secrets: generateSecrets(),
          admin: { email: dto.adminEmail, password: dto.adminPassword },
        },
      });
    } catch (err) {
      if (err instanceof SchemaValidationError) {
        throw new ApiException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Schema không hợp lệ',
          err.issues,
        );
      }
      throw err;
    }
  }
}
