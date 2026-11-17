export class ApiError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export async function fetchJson<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  if (!response.ok) {
    let message = 'An unexpected error occurred';
    let code: string | undefined;
    try {
      const errorData = await response.json();
      message = errorData.message || message;
      code = errorData.error || errorData.code;
    } catch {}
    throw new ApiError(message, response.status, code);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
