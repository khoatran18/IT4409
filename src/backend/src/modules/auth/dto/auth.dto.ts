import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu cần ít nhất 8 ký tự' })
  @MaxLength(72)
  password: string;
}

export class LoginDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
