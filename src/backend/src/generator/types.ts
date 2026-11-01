import type { IssueCode, SchemaIssue } from '../schema-validator';

export interface GeneratedFile {
  /** Đường dẫn tương đối trong zip, dùng dấu `/` */
  path: string;
  content: string;
}

export type ValidationIssue = SchemaIssue;
export type { IssueCode };

export class SchemaValidationError extends Error {
  constructor(readonly issues: ValidationIssue[]) {
    super('Schema không hợp lệ');
  }
}
