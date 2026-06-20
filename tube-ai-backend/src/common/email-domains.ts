/**
 * Single source of truth for the email providers we accept at sign-up.
 * Shared by the RegisterDto validator and AuthService so frontend and backend
 * stay in lockstep. Mirror this list in the Angular register form.
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
] as const;

/** Human-readable shortlist for error messages. */
export const ALLOWED_EMAIL_PROVIDERS_HINT =
  'Gmail, Yahoo, Outlook, Hotmail, iCloud, Proton, Zoho and other major providers';

export function isAllowedEmailDomain(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1];
  return !!domain && (ALLOWED_EMAIL_DOMAINS as readonly string[]).includes(domain);
}
