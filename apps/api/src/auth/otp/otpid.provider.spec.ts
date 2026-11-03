import { OtpIdProvider } from './otpid.provider';
import { OtpProviderError } from './otp-provider';

type Call = { url: string; init: RequestInit };

function provider(respond: () => Response | Promise<Response>): { otp: OtpIdProvider; calls: Call[] } {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return respond();
  }) as unknown as typeof fetch;
  return { otp: new OtpIdProvider({ apiKey: 'test-key', baseUrl: 'https://api.otp.test', fetchImpl }), calls };
}

const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status });

describe('OtpIdProvider.request', () => {
  it('posts to /v3/request with bearer auth, external_id and the phone in `number`', async () => {
    const { otp, calls } = provider(() =>
      json({ success: true, data: { otp_id: 12345, price: 350, last_balance: 99000 }, error: null }),
    );

    const result = await otp.request({ channel: 'whatsapp', destination: '6281234567890', externalId: 'signup:a:1' });

    expect(result).toEqual({ otpId: '12345', price: 350, lastBalance: 99000 });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('https://api.otp.test/v3/request');
    expect((calls[0]?.init.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
    expect(JSON.parse(calls[0]?.init.body as string)).toEqual({
      channel: 'whatsapp',
      external_id: 'signup:a:1',
      number: '6281234567890',
    });
  });

  it('sends the address in `email` for the email channel', async () => {
    const { otp, calls } = provider(() => json({ success: true, data: { otp_id: 'abc' }, error: null }));
    await otp.request({ channel: 'email', destination: 'a@b.co', externalId: 'signup:a:1' });
    expect(JSON.parse(calls[0]?.init.body as string)).toMatchObject({ channel: 'email', email: 'a@b.co' });
  });

  it.each([
    ['INSUFFICIENT_BALANCE', 402, 'INSUFFICIENT_BALANCE'],
    ['RATE_LIMITED', 429, 'RATE_LIMITED'],
    ['DESTINATION_RATE_LIMITED', 429, 'DESTINATION_RATE_LIMITED'],
    ['INVALID_NUMBER', 422, 'INVALID_NUMBER'],
    ['UNAUTHORIZED', 401, 'UNAUTHORIZED'],
  ])('maps provider error %s to kind %s', async (code, status, kind) => {
    const { otp } = provider(() => json({ success: false, data: null, error: { code, message: 'x' } }, status));
    await expect(otp.request({ channel: 'sms', destination: '6281', externalId: 'e' })).rejects.toMatchObject({
      name: 'OtpProviderError',
      kind,
    });
  });

  it('treats an unreachable provider as UNAVAILABLE', async () => {
    const { otp } = provider(() => {
      throw new TypeError('fetch failed');
    });
    await expect(otp.request({ channel: 'sms', destination: '6281', externalId: 'e' })).rejects.toMatchObject({
      kind: 'UNAVAILABLE',
    });
  });

  it('rejects a success response that has no otp_id', async () => {
    const { otp } = provider(() => json({ success: true, data: {}, error: null }));
    await expect(otp.request({ channel: 'sms', destination: '6281', externalId: 'e' })).rejects.toBeInstanceOf(
      OtpProviderError,
    );
  });
});

describe('OtpIdProvider.verify', () => {
  it('returns verified:true on success', async () => {
    const { otp, calls } = provider(() => json({ success: true, data: { verified: true }, error: null }));
    await expect(otp.verify({ otpId: '12345', code: '654321' })).resolves.toEqual({ verified: true, reason: undefined });
    expect(calls[0]?.url).toBe('https://api.otp.test/v3/verify');
    expect(JSON.parse(calls[0]?.init.body as string)).toEqual({ otp_id: '12345', code: '654321' });
  });

  it('treats a wrong code as a normal result, not an error', async () => {
    const { otp } = provider(() =>
      json({ success: true, data: { verified: false, reason: 'mismatch' }, error: null }),
    );
    await expect(otp.verify({ otpId: '1', code: '000000' })).resolves.toEqual({
      verified: false,
      reason: 'mismatch',
    });
  });

  it.each([
    ['OTP_EXPIRED', 'OTP_EXPIRED'],
    ['TOO_MANY_ATTEMPTS', 'TOO_MANY_ATTEMPTS'],
    ['ALREADY_USED', 'ALREADY_USED'],
  ])('maps 422 %s to kind %s', async (code, kind) => {
    const { otp } = provider(() => json({ success: false, data: null, error: { code, message: 'x' } }, 422));
    await expect(otp.verify({ otpId: '1', code: '123456' })).rejects.toMatchObject({ kind });
  });

  it('never leaks the typed code or destination into error messages', async () => {
    const { otp } = provider(() =>
      json({ success: false, data: null, error: { code: 'OTP_EXPIRED', message: 'code 987654 expired' } }, 422),
    );
    const err = await otp.verify({ otpId: '1', code: '987654' }).catch((e: unknown) => e as Error);
    expect(err.message).not.toContain('987654');
  });
});
