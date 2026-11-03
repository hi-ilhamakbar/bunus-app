import { HttpStatus, ValidationPipe, type ValidationError } from '@nestjs/common';
import { AppException } from './app-exception';

function collect(errors: ValidationError[], prefix = ''): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const e of errors) {
    const path = prefix ? `${prefix}.${e.property}` : e.property;
    if (e.constraints) out[path] = Object.values(e.constraints);
    if (e.children?.length) Object.assign(out, collect(e.children, path));
  }
  return out;
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new AppException('VALIDATION_FAILED', 'Check the highlighted fields.', HttpStatus.BAD_REQUEST, {
        fields: collect(errors),
      }),
  });
}
