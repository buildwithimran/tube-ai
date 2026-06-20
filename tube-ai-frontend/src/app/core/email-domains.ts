import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Email providers accepted at sign-up. Keep in lockstep with the backend list
 * at youtube-backend/src/common/email-domains.ts.
 */
export const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
  'me.com',
  'msn.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'zoho.com',
  'mail.com',
  'gmx.com',
  'yandex.com',
];

/** Reactive-forms validator: flags emails outside the allowed provider list. */
export function allowedEmailDomainValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const value = (control.value ?? '').toString().trim().toLowerCase();
  if (!value || !value.includes('@')) return null; // let required/email handle it
  const domain = value.split('@')[1];
  return domain && ALLOWED_EMAIL_DOMAINS.includes(domain)
    ? null
    : { allowedDomain: true };
}
