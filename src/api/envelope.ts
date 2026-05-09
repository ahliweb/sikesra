export interface ApiSuccess<T> {
  ok: true;
  requestId: string;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  ok: false;
  requestId: string;
  error: {
    code: string;
    message: string;
    fields?: Array<{
      path: string;
      section?: string;
      message: string;
      code?: string;
    }>;
    details?: Record<string, unknown>;
  };
}

export function ok<T>(requestId: string, data: T, meta?: Record<string, unknown>): ApiSuccess<T> {
  return { ok: true, requestId, data, meta };
}

export function fail(
  requestId: string,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): ApiFailure {
  return {
    ok: false,
    requestId,
    error: {
      code,
      message,
      details,
    },
  };
}
