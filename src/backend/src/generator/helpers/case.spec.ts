import type { FieldContext, FieldType } from '@codeflow/schema';
import { dbProfiles } from '../db-profiles';
import { camelCase, kebabCase, pascalCase, plural } from './case';
import { helpers, prismaField } from './index';

describe('case helpers', () => {
  it.each([
    ['Student', 'Student', 'student', 'student'],
    ['order_item', 'OrderItem', 'orderItem', 'order-item'],
    ['orderItem', 'OrderItem', 'orderItem', 'order-item'],
    ['OrderItem', 'OrderItem', 'orderItem', 'order-item'],
    ['school-admin', 'SchoolAdmin', 'schoolAdmin', 'school-admin'],
    ['HTTPServer', 'HttpServer', 'httpServer', 'http-server'],
  ])('%s', (input, pascal, camel, kebab) => {
    expect(pascalCase(input)).toBe(pascal);
    expect(camelCase(input)).toBe(camel);
    expect(kebabCase(input)).toBe(kebab);
  });

  it.each([
    ['Student', 'Students'],
    ['Category', 'Categories'],
    ['Day', 'Days'],
    ['Box', 'Boxes'],
    ['Address', 'Addresses'],
    ['Person', 'People'],
    ['OrderItem', 'OrderItems'],
  ])('plural(%s) = %s', (input, expected) => {
    expect(plural(input)).toBe(expected);
  });

  it('eq so sánh bằng nghiêm ngặt', () => {
    expect(helpers.eq('postgres', 'postgres')).toBe(true);
    expect(helpers.eq(1, '1')).toBe(false);
  });

  it('shellVar sinh biến shell có mặc định', () => {
    expect(helpers.shellVar('DB_NAME', 'shop')).toBe('${DB_NAME:-shop}');
  });

  it('prismaField ghép kiểu theo typeMap của DbProfile', () => {
    const field = (type: FieldType, required: boolean): FieldContext => ({
      name: 'x',
      type,
      required,
      unique: false,
      options: [],
    });
    expect(
      prismaField(dbProfiles.postgres.typeMap, field('number', true)),
    ).toBe('Float');
    expect(prismaField(dbProfiles.postgres.typeMap, field('date', false))).toBe(
      'DateTime?',
    );
    expect(prismaField(dbProfiles.mysql.typeMap, field('text', false))).toBe(
      'String? @db.Text',
    );
  });

  it('dotenv bọc nháy đơn và từ chối ký tự không an toàn', () => {
    expect(helpers.dotenv('a$b #c')).toBe("'a$b #c'");
    expect(() => helpers.dotenv("it's")).toThrow();
    expect(() => helpers.dotenv('a\\')).toThrow();
    expect(() => helpers.dotenv('a\nb')).toThrow();
  });
});
