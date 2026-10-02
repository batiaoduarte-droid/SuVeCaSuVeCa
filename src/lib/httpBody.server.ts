import express, { type Express, type ErrorRequestHandler } from 'express';

export function configureJsonBodies(app: Express) {
  app.use('/api/pedagogy/evaluate-explanation', express.json({ limit: '10mb' }));
  // Sessions contain saved attempts and tutor episodes, not just a short question.
  app.use('/api/pbl/session/sync', express.json({ limit: '1mb' }));
  app.use(['/api/pbl/tutor/turn', '/api/gemini/explain'], express.json({ limit: '128kb' }));
  app.use(express.json({ limit: '32kb' }));
  const bodyError: ErrorRequestHandler = (error, _req, res, next) => {
    if (error?.type === 'entity.too.large') {
      res.status(413).json({ code: 'REQUEST_TOO_LARGE', retryable: false,
        error: 'A conversa ou sessão excedeu o tamanho permitido para envio. Seus dados locais foram preservados.' });
      return;
    }
    next(error);
  };
  app.use(bodyError);
}
