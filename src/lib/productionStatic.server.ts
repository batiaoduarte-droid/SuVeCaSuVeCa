import express from 'express';
import path from 'node:path';
import { access } from 'node:fs/promises';

export function productionStatic(root: string): express.RequestHandler {
  const headers = (res: express.Response, file: string) => {
    const immutable = /[\\/]assets[\\/].+-[A-Za-z0-9_-]{8,}\.[^.]+(?:\.(?:br|gz))?$/.test(file);
    res.setHeader('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'no-cache');
    res.setHeader('Vary', 'Accept-Encoding');
  };
  const fallback = express.static(root, { setHeaders: headers });
  return async (req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method)) return next();
    let pathname: string;
    try { pathname = decodeURIComponent(req.path); } catch { return next(); }
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(path.resolve(root) + path.sep)) return next();
    if (/\.(?:js|css|html|json|svg|webmanifest)$/.test(file) && !req.headers.range) {
      const accepted = req.acceptsEncodings('br', 'gzip', 'identity');
      const extension = accepted === 'br' ? '.br' : accepted === 'gzip' ? '.gz' : '';
      if (extension) {
        try {
          await access(file + extension);
          headers(res, file); res.type(path.extname(file));
          res.setHeader('Content-Encoding', accepted as string);
          res.sendFile(file + extension, error => { if (error) next(error); });
          return;
        } catch { /* Development builds may lack precompressed siblings. */ }
      }
    }
    fallback(req, res, next);
  };
}
