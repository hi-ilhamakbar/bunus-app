import { Body, Controller, Get, Headers, HttpCode, Inject, Ip, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { APP_CONFIG, type AppConfig, type OtpChannelName } from '../config/app-config';
import { AuthService } from './auth.service';
import { LoginDto, ResendSignupDto, StartSignupDto, VerifySignupDto } from './dto';
import type { CreatedSession } from './session.service';
import {
  SignupService,
  type ResendResult,
  type SignupChallenge,
} from './signup.service';

// Per-IP limits. Per-destination and per-attempt limits live in SignupService.
const START_LIMIT = { default: { limit: 5, ttl: 60_000 } };
const RESEND_LIMIT = { default: { limit: 5, ttl: 60_000 } };
const VERIFY_LIMIT = { default: { limit: 10, ttl: 60_000 } };
const LOGIN_LIMIT = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly signup: SignupService,
    private readonly auth: AuthService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Which verification channels the signup form should offer. */
  @Get('channels')
  channels(): { channels: OtpChannelName[] } {
    return { channels: this.signup.enabledChannels() };
  }

  @Post('register/start')
  @HttpCode(200)
  @Throttle(START_LIMIT)
  start(@Body() dto: StartSignupDto, @Ip() ip: string): Promise<SignupChallenge> {
    return this.signup.start(dto, ip);
  }

  @Post('register/resend')
  @HttpCode(200)
  @Throttle(RESEND_LIMIT)
  resend(@Body() dto: ResendSignupDto): Promise<ResendResult> {
    return this.signup.resend(dto.signupId);
  }

  @Post('register/verify')
  @HttpCode(200)
  @Throttle(VERIFY_LIMIT)
  async verify(
    @Body() dto: VerifySignupDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { customer, session } = await this.signup.verify(dto, { ip, userAgent });
    this.setSessionCookie(res, session);
    return { customer };
  }

  @Post('login')
  @HttpCode(200)
  @Throttle(LOGIN_LIMIT)
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { customer, session } = await this.auth.login(dto, { ip, userAgent });
    this.setSessionCookie(res, session);
    return { customer };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = (req.cookies as Record<string, string> | undefined)?.[this.config.session.cookieName];
    await this.auth.logout(token);
    res.clearCookie(this.config.session.cookieName, { path: '/' });
  }

  private setSessionCookie(res: Response, session: CreatedSession): void {
    res.cookie(this.config.session.cookieName, session.token, {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax',
      path: '/',
      expires: session.expiresAt,
    });
  }
}
