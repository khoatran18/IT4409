export interface GeneratedFile {
  /** Đường dẫn tương đối trong zip, dùng dấu `/` */
  path: string;
  content: string;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export class SchemaValidationError extends Error {
  constructor(readonly issues: ValidationIssue[]) {
    super('Schema không hợp lệ');
  }
}
