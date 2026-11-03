import { APIError, OtpIdClient } from '@otp-id/sdk';
import {
  OtpProvider,
  OtpProviderError,
  type OtpErrorKind,
  type OtpRequestInput,
  type OtpRequestResult,
  type OtpVerifyInput,
  type OtpVerifyResult,
} from './otp-provider';

/**
 * OTP.ID adapter on the official SDK (@otp-id/sdk). The SDK never retries; our idempotency comes from
 * `external_id`, which is new for every real send and stable for a repeat of the same send.
 */

/** The slice of the SDK client this adapter uses. Tests pass a stand-in. */
export interface OtpIdClientLike {
  requestOtp(params: {
    channel: OtpRequestInput['channel'];
    destination: string;
    brand?: string;
    external_id?: string;
  }): Promise<{
    otp_id: string | number;
    status?: string;
    last_balance?: number;
    price?: number;
    failure?: { code?: string; message?: string } | null;
  }>;
  verifyOtp(otpId: string, code: string): Promise<{ verified: boolean; reason?: string }>;
}

export interface OtpIdProviderOptions {
  apiKey: string;
  baseUrl: string;
  /** Shown in the message the person receives. */
  brand?: string;
  timeoutMs?: number;
  /** Injectable for tests. */
  client?: OtpIdClientLike;
}

const ERROR_KINDS: Record<string, OtpErrorKind> = {
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  RATE_LIMITED: 'RATE_LIMITED',
  DESTINATION_RATE_LIMITED: 'DESTINATION_RATE_LIMITED',
  INVALID_NUMBER: 'INVALID_NUMBER',
  UNAUTHORIZED: 'UNAUTHORIZED',
  OTP_EXPIRED: 'OTP_EXPIRED',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  ALREADY_USED: 'ALREADY_USED',
};

type ApiErrorShape = Error & { code: string; details?: Record<string, unknown> };

function isApiError(err: unknown): err is ApiErrorShape {
  if (err instanceof APIError) return true;
  // Duck-typed so a different copy of the SDK (or a test double) is still recognised.
  return err instanceof Error && typeof (err as { code?: unknown }).code === 'string' && err.name === 'APIError';
}

export class OtpIdProvider extends OtpProvider {
  private readonly client: OtpIdClientLike;
  private readonly brand: string;

  constructor(options: OtpIdProviderOptions) {
    super();
    this.brand = options.brand ?? 'Bunus';
    this.client =
      options.client ??
      (new OtpIdClient(options.apiKey, {
        baseURL: options.baseUrl,
        timeoutMs: options.timeoutMs ?? 10_000,
      }) as unknown as OtpIdClientLike);
  }

  async request(input: OtpRequestInput): Promise<OtpRequestResult> {
    try {
      const res = await this.client.requestOtp({
        channel: input.channel,
        destination: input.destination,
        brand: this.brand,
        external_id: input.externalId,
      });

      // A failed delivery is a normal response in this API, not an exception.
      if (res.status === 'failed') {
        const code = res.failure?.code;
        // "Number not on WhatsApp" and similar are about the destination, not about us.
        const kind: OtpErrorKind = code && /NUMBER|DESTINATION/i.test(code) ? 'INVALID_NUMBER' : 'UNAVAILABLE';
        throw new OtpProviderError(kind, `OTP.ID could not deliver the code: ${code ?? 'unknown'}`, code);
      }

      return this.toRequestResult(res.otp_id, res.price, res.last_balance);
    } catch (err) {
      // A repeat of a send we already made: carry on with the original transaction.
      if (isApiError(err) && err.code === 'DUPLICATE_EXTERNAL_ID') {
        const existing = err.details?.existing_otp_id;
        if (typeof existing === 'string' || typeof existing === 'number') return this.toRequestResult(existing);
      }
      throw this.toProviderError(err);
    }
  }

  async verify(input: OtpVerifyInput): Promise<OtpVerifyResult> {
    try {
      // A wrong code resolves with verified:false. Expired, locked and used codes throw.
      const res = await this.client.verifyOtp(input.otpId, input.code);
      return { verified: res.verified === true, reason: res.reason };
    } catch (err) {
      throw this.toProviderError(err);
    }
  }

  private toRequestResult(otpId: string | number | undefined, price?: number, lastBalance?: number): OtpRequestResult {
    if (otpId === undefined || otpId === null || otpId === '') {
      throw new OtpProviderError('UNAVAILABLE', 'OTP.ID response had no otp_id');
    }
    return {
      otpId: String(otpId),
      price: typeof price === 'number' ? price : undefined,
      lastBalance: typeof lastBalance === 'number' ? lastBalance : undefined,
    };
  }

  /** Never put request data in the message: it holds the destination and the typed code. */
  private toProviderError(err: unknown): OtpProviderError {
    if (err instanceof OtpProviderError) return err;
    if (isApiError(err)) {
      const mapped = ERROR_KINDS[err.code];
      if (mapped) return new OtpProviderError(mapped, `OTP.ID rejected the call: ${err.code}`, err.code);
      return new OtpProviderError('UNAVAILABLE', `OTP.ID returned ${err.code}`, err.code);
    }
    // Network error, timeout, or the SDK refusing an empty key/id.
    return new OtpProviderError('UNAVAILABLE', 'OTP.ID could not be reached');
  }
}
