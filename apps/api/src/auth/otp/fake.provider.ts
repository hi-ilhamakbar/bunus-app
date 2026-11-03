import {
  OtpProvider,
  type OtpRequestInput,
  type OtpRequestResult,
  type OtpVerifyInput,
  type OtpVerifyResult,
} from './otp-provider';

/** Local development only. Sends nothing; the code is always 123456. Config refuses it in production. */
export const FAKE_OTP_CODE = '123456';

export class FakeOtpProvider extends OtpProvider {
  async request(input: OtpRequestInput): Promise<OtpRequestResult> {
    return { otpId: `fake_${input.externalId}` };
  }

  async verify(input: OtpVerifyInput): Promise<OtpVerifyResult> {
    return input.code === FAKE_OTP_CODE ? { verified: true } : { verified: false, reason: 'mismatch' };
  }
}
