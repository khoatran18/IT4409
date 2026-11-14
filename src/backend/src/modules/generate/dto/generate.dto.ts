import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class GenerateDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @MaxLength(254)
  adminEmail: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu cần ít nhất 8 ký tự' })
  @MaxLength(128)
  @Matches(/^[^'\\\p{Cc}]*$/u, {
    message: "Mật khẩu không được chứa dấu ' , dấu \\ hoặc ký tự điều khiển",
  })
  adminPassword: string;
}
