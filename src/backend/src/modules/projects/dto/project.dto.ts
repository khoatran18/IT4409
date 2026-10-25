import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên project không được để trống' })
  @MaxLength(100)
  name: string;
}

export class UpdateProjectDto {
  @IsObject({ message: 'schema phải là object' })
  schema: Record<string, unknown>;

  @IsInt()
  @Min(1)
  version: number;
}

export class ListProjectsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 10;
}
