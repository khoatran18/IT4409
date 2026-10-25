import { camelCase, kebabCase, pascalCase, plural } from './case';
import { helpers } from './index';

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

  it('prismaType ánh xạ kiểu field', () => {
    expect(helpers.prismaType('number')).toBe('Float');
    expect(helpers.prismaType('date')).toBe('DateTime');
  });
});
