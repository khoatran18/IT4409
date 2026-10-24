import type { AuthUser } from '../types';

export type AccessLevel = 'view' | 'edit';

/** P0: chủ sở hữu hoặc admin. Grants theo project (P1) sẽ bổ sung ở đây. */
export function hasProjectAccess(
  user: AuthUser,
  project: { ownerId: string },
  _level: AccessLevel,
): boolean {
  return user.role === 'admin' || project.ownerId === user.id;
}
