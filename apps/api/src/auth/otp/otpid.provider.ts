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
 * OTP.ID API V3 adapter, written against the integration brief (endpoints, bearer auth, response
 * envelope, error codes, verify semantics).
 *
 * VERIFY AGAINST https://docs.otp.id BEFORE GOING LIVE. These details were not stated in the brief
 * and could not be read when this was written (the docs host was not reachable from the build
 * sandbox). Each is isolated in this block so a correction is a one-line change:
 */
const FIELDS = {
  /** Body field that carries the code the user typed into POST /v3/verify. */
  verifyCode: 'code',
  /** Body field for the email address on POST /v3/request (the brief allows `number` or `email`). */
  requestEmail: 'email',
  /** Body field for the phone number on POST /v3/request. */
  requestNumber: 'number',
} as const;

const REQUEST_TIMEOUT_MS = 10_000;

interface Envelope<T> {
  success?: boolean;
  data?: T | null;
  error?: { code?: string; message?: string } | null;
}

interface RequestData {
  otp_id?: string | number;
  price?: number;
  last_balance?: number;
}

interface VerifyData {
  verified?: boolean;
  reason?: string;
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

export interface OtpIdProviderOptions {
  apiKey: string;
  baseUrl: string;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
}

export class OtpIdProvider extends OtpProvider {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: OtpIdProviderOptions) {
    super();
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async request(input: OtpRequestInput): Promise<OtpRequestResult> {
    const body: Record<string, unknown> = {
      channel: input.channel,
      external_id: input.externalId,
    };
    body[input.channel === 'email' ? FIELDS.requestEmail : FIELDS.requestNumber] = input.destination;

    const data = await this.post<RequestData>('/v3/request', body);
    if (data.otp_id === undefined || data.otp_id === null || data.otp_id === '') {
      throw new OtpProviderError('UNAVAILABLE', 'OTP.ID response had no otp_id');
    }
    return {
      otpId: String(data.otp_id),
      price: typeof data.price === 'number' ? data.price : undefined,
      lastBalance: typeof data.last_balance === 'number' ? data.last_balance : undefined,
    };
  }

  async verify(input: OtpVerifyInput): Promise<OtpVerifyResult> {
    const data = await this.post<VerifyData>('/v3/verify', {
      otp_id: input.otpId,
      [FIELDS.verifyCode]: input.code,
    });
    // A wrong code is HTTP 200 with verified:false, not an error. Branch on `verified` only.
    return { verified: data.verified === true, reason: data.reason };
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.options.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new OtpProviderError('UNAVAILABLE', 'OTP.ID could not be reached');
    }

    let envelope: Envelope<T> | null = null;
    try {
      envelope = (await res.json()) as Envelope<T>;
    } catch {
      envelope = null;
    }

    if (res.ok && envelope?.success !== false && envelope?.data) {
      return envelope.data;
    }
    throw this.toError(res.status, envelope);
  }

  /** Never put request bodies in the message: they contain the destination and the typed code. */
  private toError(status: number, envelope: Envelope<unknown> | null): OtpProviderError {
    const providerCode = envelope?.error?.code;
    const mapped = providerCode ? ERROR_KINDS[providerCode] : undefined;
    if (mapped) {
      return new OtpProviderError(mapped, `OTP.ID rejected the call: ${providerCode}`, providerCode);
    }
    if (status === 401 || status === 403) {
      return new OtpProviderError('UNAUTHORIZED', 'OTP.ID refused the API key', providerCode);
    }
    if (status === 429) {
      return new OtpProviderError('RATE_LIMITED', 'OTP.ID rate limit reached', providerCode);
    }
    return new OtpProviderError('UNAVAILABLE', `OTP.ID returned HTTP ${status}`, providerCode);
  }
}
