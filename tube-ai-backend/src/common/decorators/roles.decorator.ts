import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum';

/** Restricts a route to the given roles, enforced by RolesGuard. */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
