import type { Request } from 'express';

export type Role = 'admin' | 'staff' | 'user';

export interface AuthUser {
  id: string;
  role: Role;
}

export type AppRequest = Request & { id?: string; user?: AuthUser };
