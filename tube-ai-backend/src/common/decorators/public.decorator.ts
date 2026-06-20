import { SetMetadata } from '@nestjs/common';

/** Marks a route as public, bypassing the global JwtAuthGuard. */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
