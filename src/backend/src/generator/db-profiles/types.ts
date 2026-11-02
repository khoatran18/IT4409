import type { Database, FieldType } from '@codeflow/schema';

/** Giá trị đã là biểu thức compose/shell (vd `${DB_USER:-app}`), không phải giá trị thật. */
export interface DbEnv {
  host: string;
  port: string;
  name: string;
  user: string;
  password: string;
}

export interface DbProfile {
  id: Database;
  prismaProvider: 'postgresql' | 'mysql';
  defaultPort: number;
  image: string;
  databaseUrl(env: DbEnv): string;
  /** Đoạn service `db:` đã thụt lề 2 ký tự, gồm volume và healthcheck */
  composeService(env: DbEnv): string;
  /** Kiểu Prisma, kèm attribute nếu cần (vd `String @db.Text`) */
  typeMap: Record<FieldType, string>;
  /** Biến môi trường riêng của loại DB, ghi vào .env.example */
  envDefaults: Record<string, string>;
}
