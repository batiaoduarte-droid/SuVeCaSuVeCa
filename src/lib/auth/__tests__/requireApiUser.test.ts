import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { createRequireApiUser } from '../requireApiUser.server';

async function authenticate(headers: Record<string, string>, verify = vi.fn(async (_token: string) => ({ uid: 'firebase-user' })), adminAvailable = true) {
  const req = { header: (name: string) => headers[name] } as Request;
  const res = { locals: {}, status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  await createRequireApiUser(adminAvailable ? verify : null)(req, res, next);
  return { res, next, verify };
}

describe('API identity boundary', () => {
  afterEach(() => vi.unstubAllEnvs());
  it.each(['local-test-user', 'local-user-u_personal'])('preserves local identity %s without Firebase', async (id) => {
    vi.stubEnv('NODE_ENV', 'development');
    const { res, next, verify } = await authenticate({ authorization: 'Bearer local-dev-token', 'x-local-user-id': id }, undefined, false);
    expect(res.locals.userId).toBe(id);
    expect(next).toHaveBeenCalledOnce();
    expect(verify).not.toHaveBeenCalled();
  });
  it.each(['production', 'staging'])('rejects development token in %s', async (environment) => {
    vi.stubEnv('NODE_ENV', environment);
    const { res, next } = await authenticate({ authorization: 'Bearer local-dev-token' });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
  it.each([
    { 'x-local-dev-user': 'true' },
    { authorization: 'Bearer local-dev-token', 'x-local-user-id': 'cloud-victim' },
    { authorization: 'Bearer local-dev-token', 'x-local-user-id': 'local-user-../victim' },
  ])('rejects missing token and forged local identifiers', async (headers) => {
    vi.stubEnv('NODE_ENV', 'development');
    const { res, next } = await authenticate(headers);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
  it('fails closed when cloud verification is unavailable or rejects the token', async () => {
    const unavailable = await authenticate({ authorization: 'Bearer cloud-token' }, undefined, false);
    expect(unavailable.res.status).toHaveBeenCalledWith(503);
    expect(unavailable.res.locals.userId).toBeUndefined();
    const invalid = await authenticate({ authorization: 'Bearer bad-token' }, vi.fn().mockRejectedValue(new Error('invalid')));
    expect(invalid.res.status).toHaveBeenCalledWith(401);
    expect(invalid.next).not.toHaveBeenCalled();
  });
});
