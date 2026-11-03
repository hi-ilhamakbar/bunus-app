/**
 * Provider-neutral OTP contract. The signup flow only knows this interface, so OTP.ID can be swapped
 * for another delivery service without touching auth logic (see the portability rules in the spec).
 */
export type OtpChannel = 'email' | 'whatsapp' | 'sms';

export type OtpErrorKind =
  | 'INSUFFICIENT_BALANCE'
  | 'RATE_LIMITED'
  | 'DESTINATION_RATE_LIMITED'
  | 'INVALID_NUMBER'
  | 'UNAUTHORIZED'
  | 'OTP_EXPIRED'
  | 'TOO_MANY_ATTEMPTS'
  | 'ALREADY_USED'
  | 'UNAVAILABLE';

export class OtpProviderError extends Error {
  constructor(
    public readonly kind: OtpErrorKind,
    message: string,
    public readonly providerCode?: string,
  ) {
    super(message);
    this.name = 'OtpProviderError';
  }
}

export interface OtpRequestInput {
  channel: OtpChannel;
  /** Email address for `email`; phone as E.164 digits without '+' for `whatsapp` and `sms`. */
  destination: string;
  /** Same value on a retry returns the original transaction instead of sending (and billing) again. */
  externalId: string;
}

export interface OtpRequestResult {
  otpId: string;
  /** Credits spent by this send, when the provider reports it. */
  price?: number;
  /** Credits left after this send, when the provider reports it. */
  lastBalance?: number;
}

export interface OtpVerifyInput {
  otpId: string;
  code: string;
}

export interface OtpVerifyResult {
  verified: boolean;
  reason?: string;
}

export abstract class OtpProvider {
  abstract request(input: OtpRequestInput): Promise<OtpRequestResult>;
  abstract verify(input: OtpVerifyInput): Promise<OtpVerifyResult>;
}
