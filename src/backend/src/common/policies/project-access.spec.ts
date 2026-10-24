import { hasProjectAccess } from './project-access';

describe('hasProjectAccess', () => {
  const project = { ownerId: 'u1' };

  it('cho phép chủ sở hữu', () => {
    expect(hasProjectAccess({ id: 'u1', role: 'staff' }, project, 'edit')).toBe(
      true,
    );
  });

  it('cho phép admin dù không sở hữu', () => {
    expect(hasProjectAccess({ id: 'u9', role: 'admin' }, project, 'view')).toBe(
      true,
    );
  });

  it('từ chối người khác', () => {
    expect(hasProjectAccess({ id: 'u2', role: 'staff' }, project, 'view')).toBe(
      false,
    );
  });
});
