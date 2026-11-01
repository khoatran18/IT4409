import type { ProjectSchema } from '@codeflow/schema';
import { validateProject } from '../../schema-validator';
import { SchemaValidationError } from '../types';

export function validate(input: unknown): ProjectSchema {
  const report = validateProject(input);
  if (!report.valid || !report.schema) {
    throw new SchemaValidationError(report.errors);
  }
  return report.schema;
}
