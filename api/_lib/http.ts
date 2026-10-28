/**
 * Minimal Vercel Node runtime request/response typing.
 *
 * Declared by hand instead of adding `@vercel/node` so `npm install` stays
 * unchanged; the shapes match what Vercel actually passes to `api/*.ts`.
 */
export interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  setHeader(name: string, value: string | string[]): ApiResponse;
  json(payload: unknown): void;
  end(chunk?: string): void;
}

export function headerValue(req: ApiRequest, name: string): string | undefined {
  const raw = req.headers[name.toLowerCase()] ?? req.headers[name];
  return Array.isArray(raw) ? raw[0] : raw;
}
