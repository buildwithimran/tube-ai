import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ContentType } from '../../../common/enums/content-type.enum';

export class GenerateDto {
  @IsString()
  videoId: string;

  @IsEnum(ContentType)
  type: ContentType;

  @IsOptional()
  @IsString()
  lang?: string;

  /** Force a brand-new generation instead of reusing the cached one. */
  @IsOptional()
  @IsBoolean()
  fresh?: boolean;
}
