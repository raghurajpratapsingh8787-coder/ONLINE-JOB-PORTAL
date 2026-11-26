import fs from 'fs';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PUBLIC_LOGOS_DIR, isMongoConnected } from './db/store';
import { csrfProtection, noSqlSanitizer } from './middleware/auth';
import { isAllowedOrigin, resolveSafeStoragePath } from './utils/rules';
import authRoutes from './routes/auth';
import publicRoutes from './routes/public';
import candidateRoutes from './routes/candidate';
import employerRoutes from './routes/employer';
import adminRoutes from './routes/admin';
import collabRoutes from './routes/collab';

export function createApiApp(): express.Express {
  const app = express();
  app.set('trust proxy', 1);

  // Security headers (frameguard & CSP adjusted for iframe preview hosting)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      frameguard: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // Strict CORS allowlist (never wildcard with credentials; parses URL hostname strictly)
  const configuredOrigins = [process.env.APP_URL, process.env.CORS_ORIGIN];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (isAllowedOrigin(origin, configuredOrigins)) {
          callback(null, origin);
          return;
        }
        callback(new Error('Origin not allowed by CORS policy'));
      },
      credentials: true,
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(noSqlSanitizer);

  // Rate limiters
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Please try again shortly.' },
  });

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded. Please slow down.' },
  });

  app.use('/api', apiLimiter);
  app.use('/api', csrfProtection);

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      database: isMongoConnected() ? 'mongodb_atlas' : 'persistent_local_store',
      timestamp: new Date().toISOString(),
    });
  });

  // Safe company logo file endpoint (with path confinement; private resumes are never served here)
  app.get('/api/uploads/logos/:filename', (req, res) => {
    const safePath = resolveSafeStoragePath(PUBLIC_LOGOS_DIR, req.params.filename);
    if (!safePath || !fs.existsSync(safePath)) {
      res.status(404).json({ error: 'Logo not found' });
      return;
    }
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(safePath);
  });

  // Mount REST API modules
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/candidate', candidateRoutes);
  app.use('/api/employer', employerRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/collab', collabRoutes);

  // 404 for unknown API routes
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Centralized secure error handler (never leaks stack traces to clients)
  app.use(
    (
      err: Error & { status?: number; code?: string },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'Uploaded file exceeds the maximum allowed size.' });
        return;
      }
      const status = err.status || 500;
      const message = status < 500 ? err.message : 'An unexpected server error occurred.';
      if (status >= 500) {
        console.error('[api-error]', err.message);
      }
      res.status(status).json({ error: message });
    }
  );

  return app;
}
