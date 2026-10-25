import { projectSchema, type ProjectSchema } from '@codeflow/schema';
import { SchemaValidationError } from '../types';

export function validate(input: unknown): ProjectSchema {
  const result = projectSchema.safeParse(input);
  if (!result.success) {
    throw new SchemaValidationError(
      result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }
  return result.data;
}
