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

export interface DeploySecrets {
  dbPassword: string;
  jwtSecret: string;
}

export interface AdminAccount {
  email: string;
  password: string;
}

/** Phần thay đổi theo từng lần Generate; tách khỏi schema để render vẫn xác định khi đầu vào cố định */
export interface DeployOptions {
  secrets: DeploySecrets;
  admin: AdminAccount;
}

export interface GenerateOptions {
  templatesDir?: string;
  deploy?: DeployOptions;
}

/** Giá trị điền sẵn khi gọi generate() không kèm deploy (preview, test); zip thật luôn truyền deploy riêng */
export const PLACEHOLDER_DEPLOY: DeployOptions = {
  secrets: {
    dbPassword: 'doi-mat-khau-db',
    jwtSecret: 'doi-gia-tri-nay-it-nhat-32-ky-tu-ngau-nhien',
  },
  admin: { email: 'admin@example.com', password: 'doi-mat-khau-admin' },
};

/** Dữ liệu triển khai cho template, đã tính sẵn từ DbProfile */
export interface DeployContext extends DeployOptions {
  db: {
    id: string;
    prismaProvider: string;
    image: string;
    port: number;
    /** Đoạn service `db:` trong docker-compose */
    service: string;
    /** DATABASE_URL trỏ tới service db trong compose */
    composeUrl: string;
    /** DATABASE_URL để chạy backend trực tiếp trên máy dev */
    localUrl: string;
    env: { key: string; value: string }[];
  };
}
