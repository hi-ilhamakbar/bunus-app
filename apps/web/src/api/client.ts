import { apiMessage, copy } from '../i18n';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Field messages the API attaches to validation and phone errors. */
  fieldErrors(): Record<string, string> {
    const fields = (this.details?.fields ?? {}) as Record<string, string[] | string>;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      const first = Array.isArray(value) ? value[0] : value;
      if (first) out[key] = first;
    }
    return out;
  }
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, unknown> };
}

const BASE = '/api/v1';

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('NETWORK', copy.errors.network, 0);
  }

  let payload: Envelope<T> | null = null;
  try {
    payload = (await res.json()) as Envelope<T>;
  } catch {
    // Empty or non-JSON body (proxy error page, 204).
  }

  if (!res.ok || payload?.success === false) {
    const err = payload?.error;
    throw new ApiError(
      err?.code ?? 'UNKNOWN',
      err?.code ? apiMessage(err.code, err.details, err.message ?? copy.errors.generic) : copy.errors.generic,
      res.status,
      err?.details,
    );
  }
  return (payload?.data ?? undefined) as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
};

// -- typed endpoints ---------------------------------------------------------------------------

export type OtpChannel = 'email' | 'whatsapp' | 'sms';

export interface CustomerProfile {
  id: string;
  displayName: string;
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
}

export interface SignupChallenge {
  signupId: string;
  channel: OtpChannel;
  destinationMasked: string;
  resendAvailableAt: string;
  expiresAt: string;
  resendsLeft: number;
}

export interface ResendResult {
  resendAvailableAt: string;
  resendsLeft: number;
}

export const authApi = {
  channels: () => api.get<{ channels: OtpChannel[] }>('/auth/channels'),
  start: (input: {
    displayName: string;
    email: string;
    password: string;
    phone?: string;
    channel: OtpChannel;
  }) => api.post<SignupChallenge>('/auth/register/start', input),
  resend: (signupId: string) => api.post<ResendResult>('/auth/register/resend', { signupId }),
  verify: (signupId: string, code: string) =>
    api.post<{ customer: CustomerProfile }>('/auth/register/verify', { signupId, code }),
  login: (email: string, password: string) =>
    api.post<{ customer: CustomerProfile }>('/auth/login', { email, password }),
  logout: () => api.post<void>('/auth/logout'),
  me: () => api.get<{ customer: CustomerProfile }>('/customer/me'),
};
