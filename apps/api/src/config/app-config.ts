import { z } from 'zod';

export const APP_CONFIG = Symbol('APP_CONFIG');

export type OtpChannelName = 'email' | 'whatsapp' | 'sms';
const ALL_CHANNELS: OtpChannelName[] = ['email', 'whatsapp', 'sms'];

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  isProduction: boolean;
  port: number;
  appOrigin: string;
  trustProxy: number;
  session: { cookieName: string; ttlDays: number };
  otp: {
    provider: 'otpid' | 'fake';
    apiKey: string | undefined;
    baseUrl: string;
    lowBalanceThreshold: number;
    enabledChannels: OtpChannelName[];
    resendCooldownSeconds: number;
    maxResends: number;
    maxWrongCodes: number;
    signupTtlMinutes: number;
  };
}

const positiveInt = (fallback: number) => z.coerce.number().int().positive().default(fallback);

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: positiveInt(3000),
    APP_ORIGIN: z.string().url(),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    DATABASE_URL: z.string().min(1),
    SESSION_COOKIE_NAME: z.string().min(1).default('bunus_session'),
    SESSION_TTL_DAYS: positiveInt(30),
    OTP_PROVIDER: z.enum(['otpid', 'fake']).default('fake'),
    OTP_ID_API_KEY: z.string().optional(),
    OTP_ID_BASE_URL: z.string().url().default('https://api.otp.id'),
    OTP_ID_LOW_BALANCE_THRESHOLD: z.coerce.number().min(0).default(50000),
    OTP_ENABLED_CHANNELS: z.string().default('email,whatsapp,sms'),
    OTP_RESEND_COOLDOWN_SECONDS: positiveInt(60),
    OTP_MAX_RESENDS: z.coerce.number().int().min(0).default(3),
    OTP_MAX_WRONG_CODES: positiveInt(5),
    SIGNUP_TTL_MINUTES: positiveInt(30),
  })
  .superRefine((env, ctx) => {
    if (env.OTP_PROVIDER === 'otpid' && !env.OTP_ID_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['OTP_ID_API_KEY'],
        message: 'is required when OTP_PROVIDER=otpid',
      });
    }
    if (env.NODE_ENV === 'production' && env.OTP_PROVIDER === 'fake') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['OTP_PROVIDER'],
        message: 'the fake provider must never run in production',
      });
    }
    const requested = env.OTP_ENABLED_CHANNELS.split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    const unknown = requested.filter((c) => !ALL_CHANNELS.includes(c as OtpChannelName));
    if (unknown.length > 0 || requested.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['OTP_ENABLED_CHANNELS'],
        message: `must list one or more of ${ALL_CHANNELS.join(', ')}`,
      });
    }
  });

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  const e = parsed.data;
  return {
    nodeEnv: e.NODE_ENV,
    isProduction: e.NODE_ENV === 'production',
    port: e.PORT,
    appOrigin: e.APP_ORIGIN.replace(/\/+$/, ''),
    trustProxy: e.TRUST_PROXY,
    session: { cookieName: e.SESSION_COOKIE_NAME, ttlDays: e.SESSION_TTL_DAYS },
    otp: {
      provider: e.OTP_PROVIDER,
      apiKey: e.OTP_ID_API_KEY || undefined,
      baseUrl: e.OTP_ID_BASE_URL.replace(/\/+$/, ''),
      lowBalanceThreshold: e.OTP_ID_LOW_BALANCE_THRESHOLD,
      enabledChannels: e.OTP_ENABLED_CHANNELS.split(',')
        .map((c) => c.trim())
        .filter(Boolean) as OtpChannelName[],
      resendCooldownSeconds: e.OTP_RESEND_COOLDOWN_SECONDS,
      maxResends: e.OTP_MAX_RESENDS,
      maxWrongCodes: e.OTP_MAX_WRONG_CODES,
      signupTtlMinutes: e.SIGNUP_TTL_MINUTES,
    },
  };
}
