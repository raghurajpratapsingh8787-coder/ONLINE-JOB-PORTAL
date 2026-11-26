import 'dotenv/config';
import http from 'http';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './backend/app';
import { initializeDatabase } from './backend/db/store';
import { initSocketServer } from './backend/realtime/socket';

async function startServer() {
  await initializeDatabase();

  const app = createApiApp();
  const httpServer = http.createServer(app);
  initSocketServer(httpServer);

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[vanguardhire] Full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
