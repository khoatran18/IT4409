import { Injectable } from '@nestjs/common';
import { validateProject } from '../../schema-validator';
import type { AuthUser } from '../../common/types';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class GenerateService {
  constructor(private readonly projects: ProjectsService) {}

  async validate(user: AuthUser, projectId: string) {
    const project = await this.projects.get(user, projectId);
    const { valid, errors, warnings } = validateProject(project.schema);
    return { valid, errors, warnings };
  }
}
