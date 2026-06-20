import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiEnvelope<T> {
  success: true;
  data: T;
}

/**
 * Wraps every successful response in a consistent envelope `{ success, data }`
 * so the Angular API layer always parses the same shape. Errors get the
 * separate shape from AllExceptionsFilter.
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiEnvelope<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiEnvelope<T>> {
    return next.handle().pipe(map((data) => ({ success: true as const, data })));
  }
}
