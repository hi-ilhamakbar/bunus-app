import { CanActivate, ExecutionContext, HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { APP_CONFIG, type AppConfig } from '../config/app-config';
import { AppException } from './app-exception';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for cookie-authenticated writes, on top of SameSite=Lax cookies. Browsers always send
 * an Origin header on cross-site POSTs, so a write whose Origin is not our web app is refused.
 * Requests without an Origin (curl, server-to-server) cannot be driven by another site's page.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method)) return true;

    const origin = req.headers.origin;
    if (origin && origin !== this.config.appOrigin) {
      throw new AppException('FORBIDDEN_ORIGIN', 'This request came from an unexpected site.', HttpStatus.FORBIDDEN);
    }
    return true;
  }
}
