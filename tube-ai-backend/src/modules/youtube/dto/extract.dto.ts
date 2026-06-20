import { IsOptional, IsString } from 'class-validator';

export class ValidateDto {
  @IsString()
  url: string;
}

export class ExtractDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  lang?: string;
}
