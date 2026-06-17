/**
 * apiActions - HTTP wrapper for API/Data validation steps.
 *
 * Intentionally tiny: builds a node-fetch-style request from a base URL +
 * relative path, returns status + parsed body. Swap the implementation for
 * axios/supertest when the validation suite grows. No driver dependency.
 */

export interface ApiResponse<T = unknown> {
  status: number;
  body: T;
  headers: Record<string, string>;
}

export class ApiActions {
  constructor(
    private readonly baseUrl: string = process.env.API_BASE_URL ?? 'http://localhost:8080',
    private readonly authToken: string | undefined = process.env.API_AUTH_TOKEN,
  ) {}

  async get<T = unknown>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path);
  }

  async post<T = unknown>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (this.authToken) headers.authorization = `Bearer ${this.authToken}`;

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((v, k) => { responseHeaders[k] = v; });

    const text = await res.text();
    const parsed = text ? (JSON.parse(text) as T) : (undefined as unknown as T);
    return { status: res.status, body: parsed, headers: responseHeaders };
  }
}
