import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { IsAllowedEmailDomain } from '../../../common/validators/is-allowed-email-domain.validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @IsAllowedEmailDomain()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
