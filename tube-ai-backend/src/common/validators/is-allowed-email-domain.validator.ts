import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  ALLOWED_EMAIL_PROVIDERS_HINT,
  isAllowedEmailDomain,
} from '../email-domains';

@ValidatorConstraint({ name: 'isAllowedEmailDomain', async: false })
export class IsAllowedEmailDomainConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown): boolean {
    return typeof value === 'string' && isAllowedEmailDomain(value);
  }

  defaultMessage(): string {
    return `Please use an email from a supported provider (${ALLOWED_EMAIL_PROVIDERS_HINT}).`;
  }
}

/** DTO decorator: restricts an email to our allowed-provider list. */
export function IsAllowedEmailDomain(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsAllowedEmailDomainConstraint,
    });
  };
}
