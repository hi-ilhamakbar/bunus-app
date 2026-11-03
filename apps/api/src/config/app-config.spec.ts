import { loadConfig } from './app-config';

const base = {
  NODE_ENV: 'test',
  APP_ORIGIN: 'http://localhost:5173/',
  DATABASE_URL: 'mysql://u:p@localhost:3306/bunus',
};

describe('loadConfig', () => {
  it('applies the documented defaults', () => {
    const config = loadConfig({ ...base, OTP_PROVIDER: 'fake' });
    expect(config.appOrigin).toBe('http://localhost:5173'); // trailing slash removed
    expect(config.otp.resendCooldownSeconds).toBe(60);
    expect(config.otp.maxWrongCodes).toBe(5);
    expect(config.otp.enabledChannels).toEqual(['email', 'whatsapp', 'sms']);
  });

  it('requires an API key when the OTP.ID provider is selected', () => {
    expect(() => loadConfig({ ...base, OTP_PROVIDER: 'otpid' })).toThrow(/OTP_ID_API_KEY/);
    expect(() => loadConfig({ ...base, OTP_PROVIDER: 'otpid', OTP_ID_API_KEY: '' })).toThrow(/OTP_ID_API_KEY/);
    expect(loadConfig({ ...base, OTP_PROVIDER: 'otpid', OTP_ID_API_KEY: 'k' }).otp.apiKey).toBe('k');
  });

  it('refuses the fake OTP provider in production', () => {
    expect(() => loadConfig({ ...base, NODE_ENV: 'production', OTP_PROVIDER: 'fake' })).toThrow(/fake provider/);
  });

  it('rejects unknown channels', () => {
    expect(() => loadConfig({ ...base, OTP_ENABLED_CHANNELS: 'email,carrier-pigeon' })).toThrow(
      /OTP_ENABLED_CHANNELS/,
    );
  });

  it('can switch a channel off', () => {
    expect(loadConfig({ ...base, OTP_ENABLED_CHANNELS: 'email, sms' }).otp.enabledChannels).toEqual(['email', 'sms']);
  });
});
