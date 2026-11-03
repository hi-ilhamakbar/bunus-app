import { randomUUID } from 'node:crypto';
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/app-exception';
import { APP_CONFIG, type AppConfig } from '../config/app-config';
import { maskEmail, maskPhone, normalizeEmail, normalizePhone } from './identity';
import {
  OtpProvider,
  OtpProviderError,
  type OtpChannel,
  type OtpRequestResult,
} from './otp/otp-provider';
import { PasswordService } from './password.service';
import { SessionService, type CreatedSession } from './session.service';
import {
  AccountAlreadyExistsError,
  SignupAlreadyConsumedError,
  SignupStore,
  type CreatedCustomer,
  type PendingSignupRecord,
} from './signup.store';

export interface StartSignupInput {
  displayName: string;
  email: string;
  password: string;
  phone?: string;
  channel: OtpChannel;
}

export interface SignupChallenge {
  signupId: string;
  channel: OtpChannel;
  destinationMasked: string;
  resendAvailableAt: string;
  expiresAt: string;
  resendsLeft: number;
}

export interface ResendResult {
  resendAvailableAt: string;
  resendsLeft: number;
}

export interface CompletedSignup {
  customer: CreatedCustomer;
  session: CreatedSession;
}

const CHANNEL_LABEL: Record<OtpChannel, string> = { email: 'email', whatsapp: 'WhatsApp', sms: 'SMS' };

const toChannel = (stored: PendingSignupRecord['channel']): OtpChannel =>
  stored.toLowerCase() as OtpChannel;

const toStored = (channel: OtpChannel): PendingSignupRecord['channel'] =>
  channel.toUpperCase() as PendingSignupRecord['channel'];

/**
 * Account creation behind a one-time code. Nothing is written to `customers` until the provider
 * confirms the code, and the person picks the delivery channel (email, WhatsApp or SMS).
 *
 * Email enumeration: if the email or phone already belongs to an account, `start` answers exactly like
 * a real start (same shape, no error) but sends nothing. The verify screen tells people who never
 * receive a code that they may already have an account.
 */
@Injectable()
export class SignupService {
  private readonly logger = new Logger(SignupService.name);

  constructor(
    private readonly store: SignupStore,
    private readonly otp: OtpProvider,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  enabledChannels(): OtpChannel[] {
    return this.config.otp.enabledChannels;
  }

  async start(input: StartSignupInput, ip?: string): Promise<SignupChallenge> {
    const { channel } = input;
    if (!this.config.otp.enabledChannels.includes(channel)) {
      throw new AppException(
        'CHANNEL_UNAVAILABLE',
        'That way of verifying is not available right now. Pick another.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const email = normalizeEmail(input.email);
    let phone: string | null = null;
    if (input.phone?.trim()) {
      phone = normalizePhone(input.phone);
      if (!phone) {
        throw new AppException(
          'INVALID_PHONE',
          "That phone number doesn't look right. Include the country code or start with 0.",
          HttpStatus.BAD_REQUEST,
          { fields: { phone: ['Enter a valid phone number.'] } },
        );
      }
    }
    if (channel !== 'email' && !phone) {
      throw new AppException(
        'PHONE_REQUIRED',
        'Enter your phone number to get a code by WhatsApp or SMS.',
        HttpStatus.BAD_REQUEST,
        { fields: { phone: ['Enter your phone number.'] } },
      );
    }
    const destination = channel === 'email' ? email : (phone as string);
    const now = new Date();

    // Hash before looking anything up so response time does not depend on whether the account exists.
    const passwordHash = await this.passwords.hash(input.password);

    if (await this.store.hasAccountFor(email, phone)) {
      return this.decoyChallenge(channel, destination, now);
    }

    const cooldownMs = this.config.otp.resendCooldownSeconds * 1000;
    const existing = await this.store.findByEmail(email);
    if (existing?.lastSentAt) this.assertCooldownElapsed(existing.lastSentAt, now);
    if (await this.store.findRecentSendToOthers(destination, new Date(now.getTime() - cooldownMs), email)) {
      throw this.cooldownError(this.config.otp.resendCooldownSeconds);
    }

    // Keep the counter climbing across restarts: external_id must be new for every real send.
    const sendSeq = (existing?.sendSeq ?? 0) + 1;
    const pending = await this.store.upsertPending({
      email,
      displayName: input.displayName.trim(),
      passwordHash,
      phone,
      channel: toStored(channel),
      destination,
      sendSeq,
      expiresAt: new Date(now.getTime() + this.config.otp.signupTtlMinutes * 60_000),
      ip,
    });

    await this.sendCode(pending, sendSeq, 0, now);

    return {
      signupId: pending.id,
      channel,
      destinationMasked: this.mask(channel, destination),
      resendAvailableAt: this.resendAt(now),
      expiresAt: pending.expiresAt.toISOString(),
      resendsLeft: this.config.otp.maxResends,
    };
  }

  async resend(signupId: string): Promise<ResendResult> {
    const now = new Date();
    const row = await this.store.findById(signupId);
    if (!row) {
      // Unknown id (including the decoy from `start`): behave like a normal resend, send nothing.
      return { resendAvailableAt: this.resendAt(now), resendsLeft: this.config.otp.maxResends - 1 };
    }
    this.assertOpen(row, now);

    if (row.resendCount >= this.config.otp.maxResends) {
      throw new AppException(
        'RESEND_LIMIT',
        "You've used all the resends for this signup. Start again or pick another way to verify.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (row.lastSentAt) this.assertCooldownElapsed(row.lastSentAt, now);
    const cooldownMs = this.config.otp.resendCooldownSeconds * 1000;
    if (await this.store.findRecentSendToOthers(row.destination, new Date(now.getTime() - cooldownMs), row.email)) {
      throw this.cooldownError(this.config.otp.resendCooldownSeconds);
    }

    const resendCount = row.resendCount + 1;
    await this.sendCode(row, row.sendSeq + 1, resendCount, now);
    return {
      resendAvailableAt: this.resendAt(now),
      resendsLeft: this.config.otp.maxResends - resendCount,
    };
  }

  async verify(
    input: { signupId: string; code: string },
    meta: { ip?: string; userAgent?: string },
  ): Promise<CompletedSignup> {
    const now = new Date();
    const row = await this.store.findById(input.signupId);
    if (!row) throw this.invalidCode(); // indistinguishable from a wrong code
    this.assertOpen(row, now);

    if (!row.otpId) {
      throw new AppException(
        'CODE_NOT_SENT',
        'No code has been sent yet. Request a new one.',
        HttpStatus.CONFLICT,
      );
    }
    if (row.wrongCodes >= this.config.otp.maxWrongCodes) throw this.tooManyWrongCodes();

    let verified: boolean;
    try {
      ({ verified } = await this.otp.verify({ otpId: row.otpId, code: input.code }));
    } catch (err) {
      throw await this.mapVerifyError(err);
    }

    if (!verified) {
      const wrong = await this.store.incrementWrongCodes(row.id);
      throw this.invalidCode(Math.max(this.config.otp.maxWrongCodes - wrong, 0));
    }

    const channel = toChannel(row.channel);
    let customer: CreatedCustomer;
    try {
      customer = await this.store.completeSignup({
        pendingId: row.id,
        now,
        displayName: row.displayName,
        passwordHash: row.passwordHash,
        email: row.email,
        phone: row.phone,
        emailVerified: channel === 'email',
        phoneVerified: row.phone !== null && channel !== 'email',
        ip: meta.ip,
      });
    } catch (err) {
      if (err instanceof SignupAlreadyConsumedError) {
        throw new AppException(
          'ALREADY_SUBMITTED',
          'This signup was already completed. Log in to continue.',
          HttpStatus.CONFLICT,
        );
      }
      if (err instanceof AccountAlreadyExistsError) {
        throw new AppException(
          'ACCOUNT_EXISTS',
          'An account with these details already exists. Log in instead.',
          HttpStatus.CONFLICT,
        );
      }
      throw err;
    }

    const session = await this.sessions.createForCustomer(customer.id, meta);
    return { customer, session };
  }

  // -- sending ---------------------------------------------------------------------------------

  private async sendCode(
    pending: PendingSignupRecord,
    sendSeq: number,
    resendCount: number,
    now: Date,
  ): Promise<void> {
    const channel = toChannel(pending.channel);
    let result: OtpRequestResult;
    try {
      result = await this.otp.request({
        channel,
        destination: pending.destination,
        // Stable for retries of the same send, new for every real (re)send.
        externalId: `signup:${pending.id}:${sendSeq}`,
      });
    } catch (err) {
      throw await this.mapSendError(err, channel);
    }

    await this.store.saveSent(pending.id, { otpId: result.otpId, sentAt: now, sendSeq, resendCount });

    if (result.lastBalance !== undefined && result.lastBalance <= this.config.otp.lowBalanceThreshold) {
      this.raiseAlert('low_balance', { lastBalance: result.lastBalance });
    }
  }

  private async mapSendError(err: unknown, channel: OtpChannel): Promise<Error> {
    if (!(err instanceof OtpProviderError)) return err as Error;
    switch (err.kind) {
      case 'RATE_LIMITED':
        return new AppException(
          'TRY_AGAIN_LATER',
          'We are sending a lot of codes right now. Wait a moment and try again.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      case 'DESTINATION_RATE_LIMITED':
        return this.cooldownError(this.config.otp.resendCooldownSeconds);
      case 'INVALID_NUMBER':
        return new AppException(
          'INVALID_PHONE',
          "That number can't receive a code. Check it or pick another way to verify.",
          HttpStatus.BAD_REQUEST,
          { fields: { phone: ['This number cannot receive codes.'] } },
        );
      default:
        // Out of credits, bad API key, provider down: our problem, not the person's. Tell operators,
        // and point the person to another channel instead of a dead end.
        await this.raiseAlert(err.kind.toLowerCase(), { providerCode: err.providerCode ?? null, channel });
        return new AppException(
          'OTP_UNAVAILABLE',
          `We can't send codes by ${CHANNEL_LABEL[channel]} right now. Try another way to verify.`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
    }
  }

  private async mapVerifyError(err: unknown): Promise<Error> {
    if (!(err instanceof OtpProviderError)) return err as Error;
    switch (err.kind) {
      case 'OTP_EXPIRED':
        return new AppException('CODE_EXPIRED', 'That code has expired. Request a new one.', HttpStatus.GONE);
      case 'TOO_MANY_ATTEMPTS':
        return this.tooManyWrongCodes();
      case 'ALREADY_USED':
        return new AppException(
          'CODE_ALREADY_USED',
          'That code was already used. Request a new one.',
          HttpStatus.CONFLICT,
        );
      default:
        await this.raiseAlert(err.kind.toLowerCase(), { providerCode: err.providerCode ?? null, during: 'verify' });
        return new AppException(
          'OTP_UNAVAILABLE',
          'We could not check your code right now. Try again in a moment.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
    }
  }

  // -- helpers ---------------------------------------------------------------------------------

  private assertOpen(row: PendingSignupRecord, now: Date): void {
    if (row.consumedAt || row.expiresAt <= now) {
      throw new AppException(
        'SIGNUP_EXPIRED',
        'This signup has expired. Start again to get a new code.',
        HttpStatus.GONE,
      );
    }
  }

  private assertCooldownElapsed(lastSentAt: Date, now: Date): void {
    const elapsed = (now.getTime() - lastSentAt.getTime()) / 1000;
    const remaining = Math.ceil(this.config.otp.resendCooldownSeconds - elapsed);
    if (remaining > 0) throw this.cooldownError(remaining);
  }

  private cooldownError(retryAfterSeconds: number): AppException {
    return new AppException(
      'OTP_COOLDOWN',
      `A code was just sent. Wait ${retryAfterSeconds} seconds before asking for another.`,
      HttpStatus.TOO_MANY_REQUESTS,
      { retryAfterSeconds },
    );
  }

  private tooManyWrongCodes(): AppException {
    return new AppException(
      'TOO_MANY_ATTEMPTS',
      'Too many wrong codes. Request a new code to try again.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private invalidCode(attemptsLeft?: number): AppException {
    return new AppException(
      'CODE_INVALID',
      "That code isn't right. Check it and try again, or request a new one.",
      HttpStatus.BAD_REQUEST,
      attemptsLeft === undefined ? undefined : { attemptsLeft },
    );
  }

  private decoyChallenge(channel: OtpChannel, destination: string, now: Date): SignupChallenge {
    return {
      signupId: randomUUID(),
      channel,
      destinationMasked: this.mask(channel, destination),
      resendAvailableAt: this.resendAt(now),
      expiresAt: new Date(now.getTime() + this.config.otp.signupTtlMinutes * 60_000).toISOString(),
      resendsLeft: this.config.otp.maxResends,
    };
  }

  private mask(channel: OtpChannel, destination: string): string {
    return channel === 'email' ? maskEmail(destination) : maskPhone(destination);
  }

  private resendAt(now: Date): string {
    return new Date(now.getTime() + this.config.otp.resendCooldownSeconds * 1000).toISOString();
  }

  /** Operator-facing signal: structured log line plus an audit row. Never includes codes or contacts. */
  private async raiseAlert(kind: string, detail: Record<string, string | number | null>): Promise<void> {
    this.logger.error(JSON.stringify({ event: 'otp.provider_alert', kind, ...detail }));
    try {
      await this.audit.log({ actorType: 'SYSTEM', action: `otp.alert.${kind}`, after: detail });
    } catch (err) {
      this.logger.error(`Could not write otp alert audit row: ${(err as Error).message}`);
    }
  }
}
