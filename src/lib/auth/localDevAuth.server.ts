import type { IncomingHttpHeaders } from 'node:http';

type HeaderRequest = { headers?: IncomingHttpHeaders; header?: (name: string) => string | undefined };

export function isLocalDevUserId(userId: string): boolean {
  return userId === 'local-test-user' || /^local-user-[A-Za-z0-9_-]{1,100}$/.test(userId);
}

/** Local profiles are available only in the explicitly local development/test runtime. */
export function resolveLocalDevUserId(req: HeaderRequest, environment = process.env.NODE_ENV): string | undefined {
  if (environment !== 'development' && environment !== 'test') return undefined;
  const header = (name: string) => req.header ? req.header(name) : req.headers?.[name];
  if (header('authorization') !== 'Bearer local-dev-token') return undefined;
  const userId = header('x-local-user-id') ?? 'local-test-user';
  return typeof userId === 'string' && isLocalDevUserId(userId) ? userId : undefined;
}
