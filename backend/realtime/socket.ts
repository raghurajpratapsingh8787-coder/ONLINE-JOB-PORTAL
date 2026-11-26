import type { Server as HttpServer } from 'http';
import crypto from 'crypto';
import { Server as SocketIOServer } from 'socket.io';
import { verifyAccessToken } from '../middleware/auth';
import { getDb, persistDb } from '../db/store';
import { sendEmailNotification } from '../utils/mailer';
import { isAllowedOrigin } from '../utils/rules';
import type { NotificationRecord } from '../types';

let ioInstance: SocketIOServer | null = null;

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    try {
      result[k] = decodeURIComponent(v);
    } catch {
      result[k] = v;
    }
  }
  return result;
}

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  const configuredOrigins = [process.env.APP_URL, process.env.CORS_ORIGIN];

  ioInstance = new SocketIOServer(httpServer, {
    path: '/socket.io',
    cors: {
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
    },
  });

  ioInstance.use((socket, next) => {
    const authToken =
      (socket.handshake.auth?.token as string | undefined) ||
      parseCookies(socket.handshake.headers.cookie).vh_access;

    if (!authToken) {
      return next(new Error('Unauthorized'));
    }
    const payload = verifyAccessToken(authToken);
    if (!payload) {
      return next(new Error('Invalid token'));
    }
    const user = getDb().users.find((u) => u.id === payload.sub);
    if (!user || user.status === 'suspended') {
      return next(new Error('Account unavailable'));
    }
    socket.data.userId = user.id;
    socket.data.role = user.role;
    next();
  });

  ioInstance.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    if (userId) {
      socket.join(`user:${userId}`);
    }
  });

  return ioInstance;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit(event, payload);
  }
}

export function evictUserSockets(userId: string): void {
  if (ioInstance) {
    ioInstance.in(`user:${userId}`).disconnectSockets(true);
  }
}

export function createAndPushNotification(params: {
  userId: string;
  type: NotificationRecord['type'];
  title: string;
  message: string;
  link?: string;
  sendEmail?: boolean;
}): NotificationRecord {
  const db = getDb();
  const notif: NotificationRecord = {
    id: `notif-${crypto.randomUUID().slice(0, 8)}`,
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link,
    read: false,
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(notif);
  persistDb();

  emitToUser(params.userId, 'notification:new', notif);

  if (params.sendEmail !== false) {
    const targetUser = db.users.find((u) => u.id === params.userId);
    if (targetUser) {
      void sendEmailNotification({
        to: targetUser.email,
        subject: `VanguardHire: ${params.title}`,
        text: params.message,
      });
    }
  }

  return notif;
}
