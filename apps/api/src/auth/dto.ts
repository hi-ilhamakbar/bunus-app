import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, IsUUID, Length, Matches, MaxLength, MinLength } from 'class-validator';
import type { OtpChannel } from './otp/otp-provider';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class StartSignupDto {
  @Transform(trim)
  @IsString()
  @Length(1, 120)
  displayName!: string;

  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Use at least 8 characters.' })
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsIn(['email', 'whatsapp', 'sms'])
  channel!: OtpChannel;
}

export class ResendSignupDto {
  @IsUUID()
  signupId!: string;
}

export class VerifySignupDto {
  @IsUUID()
  signupId!: string;

  @Transform(trim)
  @Matches(/^\d{4,8}$/, { message: 'Enter the digits from your code.' })
  code!: string;
}

export class LoginDto {
  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
