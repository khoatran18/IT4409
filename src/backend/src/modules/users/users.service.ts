import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { User } from '../../generated/prisma/client';

export type PublicUser = Pick<User, 'id' | 'email' | 'role'>;

export function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, role: user.role };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(email: string, passwordHash: string) {
    return this.prisma.user.create({ data: { email, passwordHash } });
  }
}
