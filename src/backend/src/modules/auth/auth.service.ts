import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { durationToMs } from '../../config/env';
import { ConfigService } from '../../config/config.service';
import type { User } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicUser, toPublicUser, UsersService } from '../users/users.service';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

const BCRYPT_ROUNDS = 10;

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(email: string, password: string): Promise<AuthResult> {
    if (await this.users.findByEmail(email)) {
      throw new ConflictException('Email đã được đăng ký');
    }
    const user = await this.users.create(
      email,
      await hash(password, BCRYPT_ROUNDS),
    );
    return this.issueTokens(user);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.users.findByEmail(email);
    const valid = user ? await compare(password, user.passwordHash) : false;
    if (!user || !valid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { user: true },
    });
    if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) {
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }

    // updateMany có điều kiện revokedAt = null để hai request đồng thời không cùng đổi được một token
    const revoked = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count === 0) {
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }
    return this.issueTokens(stored.user);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('Tài khoản không tồn tại');
    return toPublicUser(user);
  }

  private async issueTokens(user: User): Promise<AuthResult> {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
    });
    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(
          Date.now() + durationToMs(this.config.env.JWT_REFRESH_TTL),
        ),
      },
    });
    return { accessToken, refreshToken, user: toPublicUser(user) };
  }
}
