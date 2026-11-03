import { Logger, Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/app-config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FakeOtpProvider } from './otp/fake.provider';
import { OtpIdProvider } from './otp/otpid.provider';
import { OtpProvider } from './otp/otp-provider';
import { PasswordService } from './password.service';
import { CustomerSessionGuard } from './session.guard';
import { SessionService } from './session.service';
import { SignupService } from './signup.service';
import { PrismaSignupStore, SignupStore } from './signup.store';

export function createOtpProvider(config: AppConfig): OtpProvider {
  if (config.otp.provider === 'otpid') {
    // Config validation guarantees the key is present when this provider is selected.
    return new OtpIdProvider({ apiKey: config.otp.apiKey as string, baseUrl: config.otp.baseUrl });
  }
  new Logger('OtpProvider').warn('OTP_PROVIDER=fake: no codes are sent and 123456 always verifies. Development only.');
  return new FakeOtpProvider();
}

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    SignupService,
    PasswordService,
    SessionService,
    CustomerSessionGuard,
    { provide: SignupStore, useClass: PrismaSignupStore },
    { provide: OtpProvider, useFactory: createOtpProvider, inject: [APP_CONFIG] },
  ],
  exports: [SessionService, CustomerSessionGuard],
})
export class AuthModule {}
