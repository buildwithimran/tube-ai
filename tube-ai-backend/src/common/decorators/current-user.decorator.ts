import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** The authenticated user payload attached to the request by JwtStrategy. */
export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  plan: string;
}

/** Injects the current authenticated user: `@CurrentUser() user: AuthUser`. */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    return data ? user?.[data] : user;
  },
);
