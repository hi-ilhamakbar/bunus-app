import { OtpIdProvider, type OtpIdClientLike } from './otpid.provider';
import { OtpProviderError } from './otp-provider';

type Params = Parameters<OtpIdClientLike['requestOtp']>[0];

function apiError(code: string, details?: Record<string, unknown>): Error {
  return Object.assign(new Error(`${code} (message may contain 987654)`), { name: 'APIError', code, details });
}

function build(overrides: Partial<OtpIdClientLike> = {}): { otp: OtpIdProvider; sent: Params[]; verified: unknown[][] } {
  const sent: Params[] = [];
  const verified: unknown[][] = [];
  const client: OtpIdClientLike = {
    requestOtp: async (params) => {
      sent.push(params);
      return { otp_id: 12345, status: 'sent', price: 350, last_balance: 99000 };
    },
    verifyOtp: async (...args) => {
      verified.push(args);
      return { verified: true };
    },
    ...overrides,
  };
  return { otp: new OtpIdProvider({ apiKey: 'k', baseUrl: 'https://api.otp.test', client }), sent, verified };
}

describe('OtpIdProvider.request', () => {
  it('sends channel, destination, brand and external_id, and maps the result', async () => {
    const { otp, sent } = build();
    const result = await otp.request({ channel: 'whatsapp', destination: '6281234567890', externalId: 'signup:a:1' });
    expect(result).toEqual({ otpId: '12345', price: 350, lastBalance: 99000 });
    expect(sent).toEqual([
      { channel: 'whatsapp', destination: '6281234567890', brand: 'Bunus', external_id: 'signup:a:1' },
    ]);
  });

  it('uses the same destination field for email', async () => {
    const { otp, sent } = build();
    await otp.request({ channel: 'email', destination: 'a@b.co', externalId: 'e' });
    expect(sent[0]).toMatchObject({ channel: 'email', destination: 'a@b.co' });
  });

  it('treats status "failed" as an error even though the call resolved', async () => {
    const { otp } = build({
      requestOtp: async () => ({
        otp_id: 1,
        status: 'failed',
        failure: { code: 'NUMBER_NOT_ON_WHATSAPP', message: 'x' },
      }),
    });
    await expect(otp.request({ channel: 'whatsapp', destination: '62', externalId: 'e' })).rejects.toMatchObject({
      kind: 'INVALID_NUMBER',
    });
  });

  it('treats other delivery failures as UNAVAILABLE', async () => {
    const { otp } = build({
      requestOtp: async () => ({ otp_id: 1, status: 'failed', failure: { code: 'PROVIDER_ERROR' } }),
    });
    await expect(otp.request({ channel: 'sms', destination: '62', externalId: 'e' })).rejects.toMatchObject({
      kind: 'UNAVAILABLE',
    });
  });

  it.each([
    'INSUFFICIENT_BALANCE',
    'RATE_LIMITED',
    'DESTINATION_RATE_LIMITED',
    'INVALID_NUMBER',
    'UNAUTHORIZED',
  ])('maps API error %s to the same kind', async (code) => {
    const { otp } = build({
      requestOtp: async () => {
        throw apiError(code);
      },
    });
    await expect(otp.request({ channel: 'sms', destination: '62', externalId: 'e' })).rejects.toMatchObject({
      name: 'OtpProviderError',
      kind: code,
    });
  });

  it('continues with the original transaction on DUPLICATE_EXTERNAL_ID', async () => {
    const { otp } = build({
      requestOtp: async () => {
        throw apiError('DUPLICATE_EXTERNAL_ID', { existing_otp_id: 777 });
      },
    });
    await expect(otp.request({ channel: 'sms', destination: '62', externalId: 'e' })).resolves.toMatchObject({
      otpId: '777',
    });
  });

  it('treats network failures and unknown codes as UNAVAILABLE', async () => {
    const down = build({
      requestOtp: async () => {
        throw new TypeError('fetch failed');
      },
    });
    await expect(down.otp.request({ channel: 'sms', destination: '62', externalId: 'e' })).rejects.toMatchObject({
      kind: 'UNAVAILABLE',
    });

    const odd = build({
      requestOtp: async () => {
        throw apiError('SOMETHING_NEW');
      },
    });
    await expect(odd.otp.request({ channel: 'sms', destination: '62', externalId: 'e' })).rejects.toMatchObject({
      kind: 'UNAVAILABLE',
    });
  });

  it('rejects a response without an otp_id', async () => {
    const { otp } = build({ requestOtp: async () => ({ otp_id: '' }) });
    await expect(otp.request({ channel: 'sms', destination: '62', externalId: 'e' })).rejects.toBeInstanceOf(
      OtpProviderError,
    );
  });
});

describe('OtpIdProvider.verify', () => {
  it('passes otp_id and code and returns verified:true', async () => {
    const { otp, verified } = build();
    await expect(otp.verify({ otpId: '12345', code: '654321' })).resolves.toEqual({ verified: true, reason: undefined });
    expect(verified).toEqual([['12345', '654321']]);
  });

  it('treats a wrong code as a normal result', async () => {
    const { otp } = build({ verifyOtp: async () => ({ verified: false, reason: 'mismatch' }) });
    await expect(otp.verify({ otpId: '1', code: '000000' })).resolves.toEqual({ verified: false, reason: 'mismatch' });
  });

  it.each(['OTP_EXPIRED', 'TOO_MANY_ATTEMPTS', 'ALREADY_USED'])('maps %s', async (code) => {
    const { otp } = build({
      verifyOtp: async () => {
        throw apiError(code);
      },
    });
    await expect(otp.verify({ otpId: '1', code: '123456' })).rejects.toMatchObject({ kind: code });
  });

  it('never leaks the typed code into the error message', async () => {
    const { otp } = build({
      verifyOtp: async () => {
        throw apiError('OTP_EXPIRED');
      },
    });
    const err = await otp.verify({ otpId: '1', code: '987654' }).catch((e: unknown) => e as Error);
    expect(err.message).not.toContain('987654');
  });
});
