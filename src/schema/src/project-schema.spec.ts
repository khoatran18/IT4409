import { describe, expect, it } from 'vitest';
import { createEmptyProject, inventorySample, projectSchema, schoolAdminSample, shopSample } from './index';

describe('projectSchema', () => {
  it('chấp nhận schema mẫu', () => {
    expect(projectSchema.safeParse(schoolAdminSample).success).toBe(true);
    expect(projectSchema.safeParse(inventorySample).success).toBe(true);
  });

  it('điền default cho project rỗng', () => {
    const p = createEmptyProject('demo');
    expect(p.meta.database).toBe('postgres');
    expect(p.roles).toEqual(['admin', 'user']);
    expect(p.auth.allowSelfRegister).toBe(false);
  });

  it('từ chối kiểu field lạ', () => {
    const bad = structuredClone(schoolAdminSample) as any;
    bad.entities[0].fields[0].type = 'blob';
    expect(projectSchema.safeParse(bad).success).toBe(false);
  });

  it('từ chối chuỗi quyền sai thứ tự', () => {
    const bad = structuredClone(schoolAdminSample) as any;
    bad.permissions.Student.user = 'DR';
    expect(projectSchema.safeParse(bad).success).toBe(false);
  });
});

describe('quan hệ ref', () => {
  it('chấp nhận field ref có entity đích', () => {
    expect(projectSchema.safeParse(shopSample).success).toBe(true);
  });

  it('từ chối field ref thiếu entity', () => {
    const bad = structuredClone(shopSample) as any;
    delete bad.entities[1].fields[1].entity;
    expect(projectSchema.safeParse(bad).success).toBe(false);
  });
});
