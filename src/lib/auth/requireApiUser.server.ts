import type { RequestHandler } from 'express';
import { resolveLocalDevUserId } from './localDevAuth.server';

export function createRequireApiUser(verifyToken: ((token: string) => Promise<{ uid: string }>) | null): RequestHandler {
  return async (req, res, next) => {
    const localUserId = resolveLocalDevUserId(req);
    if (localUserId) {
      res.locals.userId = localUserId;
      return next();
    }
    const authorization = req.header('authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    if (!token || token === 'local-dev-token') {
      res.status(401).json({ error: 'Entre na sua conta para usar este recurso.' });
      return;
    }
    if (!verifyToken) {
      res.status(503).json({ error: 'Serviço de autenticação indisponível no servidor.' });
      return;
    }
    try {
      const decoded = await verifyToken(token);
      if (!decoded.uid || decoded.uid === 'guest') throw new Error('INVALID_IDENTITY');
      res.locals.userId = decoded.uid;
      next();
    } catch {
      res.status(401).json({ error: 'Sua sessão expirou. Entre novamente para continuar.' });
    }
  };
}
