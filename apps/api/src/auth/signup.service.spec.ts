import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { AuditService } from '../audit/audit.service';
import { AppException } from '../common/app-exception';
import { loadConfig, type AppConfig } from '../config/app-config';
import {
  OtpProvider,
  OtpProviderError,
  type OtpErrorKind,
  type OtpRequestInput,
  type OtpRequestResult,
  type OtpVerifyInput,
  type OtpVerifyResult,
} from './otp/otp-provider';
import type { PasswordService } from './password.service';
import type { SessionService } from './session.service';
import { SignupService, type StartSignupInput } from './signup.service';
import {
  SignupAlreadyConsumedError,
  SignupStore,
  type CompleteSignupInput,
  type CreatedCustomer,
  type PendingSignupRecord,
  type UpsertPendingInput,
} from './signup.store';

// ---- test doubles ------------------------------------------------------------------------------

class InMemoryStore extends SignupStore {
  rows = new Map<string, PendingSignupRecord>();
  accounts = new Set<string>();
  created: CreatedCustomer[] = [];

  async hasAccountFor(email: string, phone: string | null): Promise<boolean> {
    return this.accounts.has(`email:${email}`) || (phone !== null && this.accounts.has(`phone:${phone}`));
  }
  async findByEmail(email: string): Promise<PendingSignupRecord | null> {
    const row = [...this.rows.values()].find((r) => r.email === email);
    return row ? { ...row } : null;
  }
  async findById(id: string): Promise<PendingSignupRecord | null> {
    const row = this.rows.get(id);
    return row ? { ...row } : null;
  }
  async findRecentSendToOthers(destination: string, since: Date, exceptEmail: string): Promise<boolean> {
    return [...this.rows.values()].some(
      (r) => r.destination === destination && r.email !== exceptEmail && r.lastSentAt !== null && r.lastSentAt > since,
    );
  }
  async upsertPending(input: UpsertPendingInput): Promise<PendingSignupRecord> {
    const existing = await this.findByEmail(input.email);
    const row: PendingSignupRecord = {
      id: existing?.id ?? randomUUID(),
      email: input.email,
      displayName: input.displayName,
      passwordHash: input.passwordHash,
      phone: input.phone,
      channel: input.channel,
      destination: input.destination,
      otpId: null,
      sendSeq: input.sendSeq,
      resendCount: 0,
      lastSentAt: null,
      wrongCodes: 0,
      expiresAt: input.expiresAt,
      consumedAt: null,
    };
    this.rows.set(row.id, row);
    return { ...row };
  }
  async saveSent(
    id: string,
    data: { otpId: string; sentAt: Date; sendSeq: number; resendCount: number },
  ): Promise<void> {
    const row = this.rows.get(id) as PendingSignupRecord;
    Object.assign(row, {
      otpId: data.otpId,
      lastSentAt: data.sentAt,
      sendSeq: data.sendSeq,
      resendCount: data.resendCount,
      wrongCodes: 0,
    });
  }
  async incrementWrongCodes(id: string): Promise<number> {
    const row = this.rows.get(id) as PendingSignupRecord;
    row.wrongCodes += 1;
    return row.wrongCodes;
  }
  async completeSignup(input: CompleteSignupInput): Promise<CreatedCustomer> {
    const row = this.rows.get(input.pendingId) as PendingSignupRecord;
    if (row.consumedAt) throw new SignupAlreadyConsumedError();
    row.consumedAt = input.now;
    const customer: CreatedCustomer = {
      id: `cust-${this.created.length + 1}`,
      displayName: input.displayName,
      email: input.email,
      phone: input.phone,
      emailVerified: input.emailVerified,
      phoneVerified: input.phoneVerified,
    };
    this.created.push(customer);
    return customer;
  }
}

class ScriptedOtp extends OtpProvider {
  requests: OtpRequestInput[] = [];
  verifies: OtpVerifyInput[] = [];
  requestError: OtpErrorKind | undefined;
  verifyError: OtpErrorKind | undefined;
  verified = true;
  lastBalance: number | undefined;

  async request(input: OtpRequestInput): Promise<OtpRequestResult> {
    this.requests.push(input);
    if (this.requestError) throw new OtpProviderError(this.requestError, 'scripted', this.requestError);
    return { otpId: `otp-${this.requests.length}`, lastBalance: this.lastBalance };
  }
  async verify(input: OtpVerifyInput): Promise<OtpVerifyResult> {
    this.verifies.push(input);
    if (this.verifyError) throw new OtpProviderError(this.verifyError, 'scripted', this.verifyError);
    return this.verified ? { verified: true } : { verified: false, reason: 'mismatch' };
  }
}

async function appError(promise: Promise<unknown>): Promise<AppException> {
  try {
    await promise;
  } catch (err) {
    if (err instanceof AppException) return err;
    throw err;
  }
  throw new Error('expected the call to fail with an AppException');
}

// ---- setup -------------------------------------------------------------------------------------

const START: StartSignupInput = {
  displayName: 'Ilham',
  email: 'Ilham@Example.com',
  password: 'correct horse battery',
  channel: 'email',
};

describe('SignupService', () => {
  let store: InMemoryStore;
  let otp: ScriptedOtp;
  let audit: { log: jest.Mock };
  let config: AppConfig;
  let service: SignupService;

  function build(overrides?: Partial<AppConfig['otp']>): void {
    const base = loadConfig({
      NODE_ENV: 'test',
      APP_ORIGIN: 'http://localhost:5173',
      DATABASE_URL: 'mysql://x',
      OTP_PROVIDER: 'fake',
    });
    config = { ...base, otp: { ...base.otp, ...overrides } };
    store = new InMemoryStore();
    otp = new ScriptedOtp();
    audit = { log: jest.fn(async () => undefined) };
    service = new SignupService(
      store,
      otp,
      { hash: async (p: string) => `hash:${p}` } as unknown as PasswordService,
      {
        createForCustomer: async (id: string) => ({ token: `token-${id}`, expiresAt: new Date(Date.now() + 1000) }),
      } as unknown as SessionService,
      audit as unknown as AuditService,
      config,
    );
  }

  const advance = (seconds: number): void => {
    jest.setSystemTime(Date.now() + seconds * 1000);
  };

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-11-03T06:00:00Z') });
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    build();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  // ---- start -----------------------------------------------------------------------------------

  describe('start', () => {
    it('sends the code to the chosen channel and never returns it', async () => {
      const challenge = await service.start({ ...START, channel: 'whatsapp', phone: '0812-3456-7890' });

      expect(otp.requests).toHaveLength(1);
      expect(otp.requests[0]).toMatchObject({ channel: 'whatsapp', destination: '6281234567890' });
      expect(otp.requests[0]?.externalId).toBe(`signup:${challenge.signupId}:1`);
      expect(challenge.channel).toBe('whatsapp');
      expect(challenge.destinationMasked).toBe('+62••••••••890');
      expect(JSON.stringify(challenge)).not.toMatch(/123456|6281234567890/);
      expect(store.rows.get(challenge.signupId)?.otpId).toBe('otp-1');
    });

    it('sends email codes to the normalised address', async () => {
      await service.start(START);
      expect(otp.requests[0]).toMatchObject({ channel: 'email', destination: 'ilham@example.com' });
    });

    it('requires a phone number for WhatsApp and SMS', async () => {
      const err = await appError(service.start({ ...START, channel: 'sms' }));
      expect(err.code).toBe('PHONE_REQUIRED');
      expect(err.getStatus()).toBe(400);
      expect(otp.requests).toHaveLength(0);
    });

    it('rejects a phone number that cannot be real', async () => {
      const err = await appError(service.start({ ...START, channel: 'sms', phone: 'abc' }));
      expect(err.code).toBe('INVALID_PHONE');
    });

    it('refuses a channel that is switched off', async () => {
      build({ enabledChannels: ['email'] });
      const err = await appError(service.start({ ...START, channel: 'sms', phone: '08123456789' }));
      expect(err.code).toBe('CHANNEL_UNAVAILABLE');
    });

    it('answers like a normal start but sends nothing when the email already has an account', async () => {
      store.accounts.add('email:ilham@example.com');
      const challenge = await service.start(START);

      expect(challenge.signupId).toMatch(/^[0-9a-f-]{36}$/);
      expect(challenge.destinationMasked).toBe('i••••@example.com');
      expect(otp.requests).toHaveLength(0);
      expect(store.rows.size).toBe(0);
    });

    it('does the same when the phone number already has an account', async () => {
      store.accounts.add('phone:6281234567890');
      await service.start({ ...START, email: 'new@example.com', channel: 'sms', phone: '081234567890' });
      expect(otp.requests).toHaveLength(0);
    });

    it('enforces the resend cooldown per email and uses a fresh external_id afterwards', async () => {
      const first = await service.start(START);
      const tooSoon = await appError(service.start(START));
      expect(tooSoon.code).toBe('OTP_COOLDOWN');
      expect(tooSoon.getStatus()).toBe(429);

      advance(61);
      const second = await service.start(START);
      expect(second.signupId).toBe(first.signupId);
      expect(otp.requests).toHaveLength(2);
      expect(otp.requests[0]?.externalId).not.toBe(otp.requests[1]?.externalId);
    });

    it('stops one phone number being flooded from different emails', async () => {
      await service.start({ ...START, email: 'a@example.com', channel: 'sms', phone: '081234567890' });
      const err = await appError(
        service.start({ ...START, email: 'b@example.com', channel: 'sms', phone: '081234567890' }),
      );
      expect(err.code).toBe('OTP_COOLDOWN');
      expect(otp.requests).toHaveLength(1);
    });

    it('tells the person to try another channel, and alerts operators, when credits run out', async () => {
      otp.requestError = 'INSUFFICIENT_BALANCE';
      const err = await appError(service.start({ ...START, channel: 'whatsapp', phone: '081234567890' }));

      expect(err.code).toBe('OTP_UNAVAILABLE');
      expect(err.getStatus()).toBe(503);
      expect(err.message).toContain('WhatsApp');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ actorType: 'SYSTEM', action: 'otp.alert.insufficient_balance' }),
      );
    });

    it('raises a low-balance alert when a successful send leaves few credits', async () => {
      otp.lastBalance = 100;
      await service.start(START);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'otp.alert.low_balance', after: { lastBalance: 100 } }),
      );
    });

    it('does not alert when credits are comfortable', async () => {
      otp.lastBalance = 9_999_999;
      await service.start(START);
      expect(audit.log).not.toHaveBeenCalled();
    });

    it.each([
      ['RATE_LIMITED', 'TRY_AGAIN_LATER', 429],
      ['DESTINATION_RATE_LIMITED', 'OTP_COOLDOWN', 429],
      ['INVALID_NUMBER', 'INVALID_PHONE', 400],
      ['UNAUTHORIZED', 'OTP_UNAVAILABLE', 503],
      ['UNAVAILABLE', 'OTP_UNAVAILABLE', 503],
    ] as const)('maps provider error %s to %s', async (kind, code, status) => {
      otp.requestError = kind;
      const err = await appError(service.start({ ...START, channel: 'sms', phone: '081234567890' }));
      expect(err.code).toBe(code);
      expect(err.getStatus()).toBe(status);
    });
  });

  // ---- resend ----------------------------------------------------------------------------------

  describe('resend', () => {
    it('sends a new code with a new external_id after the cooldown', async () => {
      const { signupId } = await service.start(START);
      advance(61);
      const result = await service.resend(signupId);

      expect(otp.requests).toHaveLength(2);
      expect(otp.requests[1]?.externalId).toBe(`signup:${signupId}:2`);
      expect(result.resendsLeft).toBe(config.otp.maxResends - 1);
      expect(store.rows.get(signupId)?.otpId).toBe('otp-2');
    });

    it('refuses to resend before the cooldown ends', async () => {
      const { signupId } = await service.start(START);
      const err = await appError(service.resend(signupId));
      expect(err.code).toBe('OTP_COOLDOWN');
    });

    it('stops after the maximum number of resends', async () => {
      const { signupId } = await service.start(START);
      for (let i = 0; i < config.otp.maxResends; i++) {
        advance(61);
        await service.resend(signupId);
      }
      advance(61);
      const err = await appError(service.resend(signupId));
      expect(err.code).toBe('RESEND_LIMIT');
    });

    it('acts normally for an unknown id without sending anything', async () => {
      await service.resend(randomUUID());
      expect(otp.requests).toHaveLength(0);
    });
  });

  // ---- verify ----------------------------------------------------------------------------------

  describe('verify', () => {
    it('creates the account only after the code is confirmed, and starts a session', async () => {
      const { signupId } = await service.start(START);
      expect(store.created).toHaveLength(0);

      const done = await service.verify({ signupId, code: '123456' }, { ip: '203.0.113.7' });

      expect(otp.verifies[0]).toEqual({ otpId: 'otp-1', code: '123456' });
      expect(store.created).toHaveLength(1);
      expect(done.customer).toMatchObject({
        displayName: 'Ilham',
        email: 'ilham@example.com',
        emailVerified: true,
        phoneVerified: false,
      });
      expect(done.session.token).toBe(`token-${done.customer.id}`);
    });

    it('marks the phone, not the email, as verified when the code came by WhatsApp', async () => {
      const { signupId } = await service.start({ ...START, channel: 'whatsapp', phone: '081234567890' });
      const done = await service.verify({ signupId, code: '123456' }, {});
      expect(done.customer).toMatchObject({ emailVerified: false, phoneVerified: true, phone: '6281234567890' });
    });

    it('creates nothing and counts the attempt when the code is wrong', async () => {
      const { signupId } = await service.start(START);
      otp.verified = false;

      const err = await appError(service.verify({ signupId, code: '000000' }, {}));
      expect(err.code).toBe('CODE_INVALID');
      expect(err.getStatus()).toBe(400);
      expect(err.details).toEqual({ attemptsLeft: config.otp.maxWrongCodes - 1 });
      expect(store.created).toHaveLength(0);
    });

    it('locks the signup after too many wrong codes, even if the next one is right', async () => {
      const { signupId } = await service.start(START);
      otp.verified = false;
      for (let i = 0; i < config.otp.maxWrongCodes; i++) {
        await appError(service.verify({ signupId, code: '000000' }, {}));
      }
      otp.verified = true;
      const callsBefore = otp.verifies.length;

      const err = await appError(service.verify({ signupId, code: '123456' }, {}));
      expect(err.code).toBe('TOO_MANY_ATTEMPTS');
      expect(err.getStatus()).toBe(429);
      expect(otp.verifies).toHaveLength(callsBefore); // refused before asking the provider
    });

    it('a resend gives a locked signup a fresh set of attempts', async () => {
      const { signupId } = await service.start(START);
      otp.verified = false;
      for (let i = 0; i < config.otp.maxWrongCodes; i++) {
        await appError(service.verify({ signupId, code: '000000' }, {}));
      }
      advance(61);
      await service.resend(signupId);
      otp.verified = true;
      await expect(service.verify({ signupId, code: '123456' }, {})).resolves.toBeDefined();
    });

    it.each([
      ['OTP_EXPIRED', 'CODE_EXPIRED', 410],
      ['ALREADY_USED', 'CODE_ALREADY_USED', 409],
      ['TOO_MANY_ATTEMPTS', 'TOO_MANY_ATTEMPTS', 429],
      ['UNAVAILABLE', 'OTP_UNAVAILABLE', 503],
    ] as const)('maps provider verify error %s to %s', async (kind, code, status) => {
      const { signupId } = await service.start(START);
      otp.verifyError = kind;
      const err = await appError(service.verify({ signupId, code: '123456' }, {}));
      expect(err.code).toBe(code);
      expect(err.getStatus()).toBe(status);
      expect(store.created).toHaveLength(0);
    });

    it('treats an unknown signup id exactly like a wrong code and never calls the provider', async () => {
      const err = await appError(service.verify({ signupId: randomUUID(), code: '123456' }, {}));
      expect(err.code).toBe('CODE_INVALID');
      expect(err.details).toBeUndefined();
      expect(otp.verifies).toHaveLength(0);
    });

    it('rejects a signup that has expired', async () => {
      const { signupId } = await service.start(START);
      advance(config.otp.signupTtlMinutes * 60 + 1);
      const err = await appError(service.verify({ signupId, code: '123456' }, {}));
      expect(err.code).toBe('SIGNUP_EXPIRED');
      expect(err.getStatus()).toBe(410);
    });

    it('rejects a second submit of an already completed signup', async () => {
      const { signupId } = await service.start(START);
      await service.verify({ signupId, code: '123456' }, {});
      const err = await appError(service.verify({ signupId, code: '123456' }, {}));
      expect(err.code).toBe('SIGNUP_EXPIRED');
      expect(store.created).toHaveLength(1);
    });

    it('reports a clear conflict when two submits race past the first check', async () => {
      const { signupId } = await service.start(START);
      // Simulate the losing side of a race: the row is claimed between the check and the commit.
      jest.spyOn(store, 'completeSignup').mockRejectedValueOnce(new SignupAlreadyConsumedError());
      const err = await appError(service.verify({ signupId, code: '123456' }, {}));
      expect(err.code).toBe('ALREADY_SUBMITTED');
      expect(err.getStatus()).toBe(409);
    });
  });
});
