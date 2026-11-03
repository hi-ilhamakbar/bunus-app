import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { AppException } from '../common/app-exception';
import { APP_CONFIG, type AppConfig } from '../config/app-config';
import { SessionService, type SessionCustomer } from './session.service';

export interface CustomerRequest extends Request {
  customer?: SessionCustomer;
}

/** Requires a valid customer session cookie and exposes the customer on the request. */
@Injectable()
export class CustomerSessionGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<CustomerRequest>();
    const token = (req.cookies as Record<string, string> | undefined)?.[this.config.session.cookieName];
    const customer = token ? await this.sessions.resolveCustomer(token) : null;
    if (!customer) {
      throw new AppException('UNAUTHENTICATED', 'Log in to continue.', HttpStatus.UNAUTHORIZED);
    }
    req.customer = customer;
    return true;
  }
}

export const CurrentCustomer = createParamDecorator((_data: unknown, ctx: ExecutionContext): SessionCustomer => {
  const req = ctx.switchToHttp().getRequest<CustomerRequest>();
  if (!req.customer) {
    throw new AppException('UNAUTHENTICATED', 'Log in to continue.', HttpStatus.UNAUTHORIZED);
  }
  return req.customer;
});
