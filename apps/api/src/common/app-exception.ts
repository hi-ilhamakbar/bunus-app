import { HttpException } from '@nestjs/common';

/**
 * Every error the API raises on purpose. `code` is a stable machine-readable string the web app
 * switches on; `message` is plain-language text that is safe to show to the person.
 */
export class AppException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: number,
    public readonly details?: unknown,
  ) {
    super({ code, message, details }, status);
  }
}
