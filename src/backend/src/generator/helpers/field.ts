import type { FieldContext, FieldType } from '@codeflow/schema';

/** Chuỗi literal hợp lệ trong TS, JSON và Prisma, kể cả khi giá trị có dấu nháy hay xuống dòng */
export const json = (value: unknown): string => JSON.stringify(value);

const MAX_LENGTH = { string: 255, text: 65535 } as const;

/** Biểu thức Zod cho một field, dùng ở template schema của entity */
export function zodExpr(field: FieldContext): string {
  let expr: string;
  switch (field.type) {
    case 'string':
    case 'text':
      expr = `z.string()${field.required ? '.min(1)' : ''}.max(${MAX_LENGTH[field.type]})`;
      break;
    case 'number':
      expr = 'z.number()';
      break;
    case 'boolean':
      expr = 'z.boolean()';
      break;
    case 'date':
      expr = 'z.coerce.date()';
      break;
    case 'enum':
      expr = `z.enum([${field.options.map(json).join(', ')}])`;
      break;
  }
  if (field.default !== undefined && field.type !== 'date') {
    return `${expr}.default(${json(field.default)})${field.required ? '' : '.nullable()'}`;
  }
  return field.required ? expr : `${expr}.nullish()`;
}

/** ` @default(...)` cho Prisma, rỗng nếu field không có default dùng được */
export function prismaDefault(field: FieldContext): string {
  if (field.default === undefined || field.type === 'date') return '';
  return ` @default(${json(field.default)})`;
}

/** Kiểu Prisma của field: `typeMap` có thể kèm attribute (`String @db.Text`) nên dấu `?` chèn sau kiểu */
export function prismaField(
  typeMap: Record<FieldType, string>,
  field: FieldContext,
): string {
  const [type, ...attributes] = typeMap[field.type].split(' ');
  return [`${type}${field.required ? '' : '?'}`, ...attributes].join(' ');
}

/** Chuỗi các ký tự không thể đưa vào file .env một cách an toàn (xem dotenv) */
export const UNSAFE_DOTENV_CHARS = /['\\\p{Cc}]/u;

/**
 * Giá trị trong file .env của docker compose: nháy đơn nên `$` và `#` được giữ nguyên.
 * Compose không có cách escape `\` cuối chuỗi nên từ chối `'`, `\` và ký tự điều khiển thay vì sinh file sai.
 */
export function dotenv(value: string): string {
  if (UNSAFE_DOTENV_CHARS.test(value))
    throw new Error('Giá trị chứa ký tự không dùng được trong file .env');
  return `'${value}'`;
}
