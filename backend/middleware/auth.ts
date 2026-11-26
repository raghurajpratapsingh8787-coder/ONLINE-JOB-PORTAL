import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/store';
import { sanitizeNoSqlInput } from '../utils/rules';
import type { UserRecord, UserRole } from '../types';

const FALLBACK_ACCESS_SECRET = crypto.randomBytes(32).toString('hex');
const FALLBACK_REFRESH_SECRET = crypto.randomBytes(32).toString('hex');

function getAccessSecret(): string {
  return process.env.JWT_ACCESS_SECRET || FALLBACK_ACCESS_SECRET;
}

function getRefreshSecret(): string {
  return process.env.JWT_REFRESH_SECRET || FALLBACK_REFRESH_SECRET;
}

export interface AuthTokenPayload {
  sub: string;
  role: UserRole;
  email: string;
  type: 'access' | 'refresh';
  jti?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: UserRecord;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function signAccessToken(user: UserRecord): string {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      type: 'access',
    } satisfies AuthTokenPayload,
    getAccessSecret(),
    { expiresIn: '15m' }
  );
}

export function signRefreshToken(user: UserRecord): string {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      type: 'refresh',
      jti: crypto.randomUUID(),
    } satisfies AuthTokenPayload,
    getRefreshSecret(),
    { expiresIn: '7d' }
  );
}

export function verifyAccessToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getAccessSecret()) as AuthTokenPayload;
    return decoded.type === 'access' ? decoded : null;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getRefreshSecret()) as AuthTokenPayload;
    return decoded.type === 'refresh' ? decoded : null;
  } catch {
    return null;
  }
}

function isHttpsRequest(req: Request): boolean {
  return req.secure || req.headers['x-forwarded-proto'] === 'https';
}

export function setAuthCookies(
  req: Request,
  res: Response,
  accessToken: string,
  refreshToken: string
): void {
  const https = isHttpsRequest(req);
  const commonFlags = https
    ? 'HttpOnly; Secure; SameSite=None; Partitioned; Path=/'
    : 'HttpOnly; SameSite=Lax; Path=/';

  res.append('Set-Cookie', `vh_access=${encodeURIComponent(accessToken)}; Max-Age=900; ${commonFlags}`);
  res.append(
    'Set-Cookie',
    `vh_refresh=${encodeURIComponent(refreshToken)}; Max-Age=${7 * 24 * 3600}; ${commonFlags}`
  );
}

export function clearAuthCookies(req: Request, res: Response): void {
  const https = isHttpsRequest(req);
  const commonFlags = https
    ? 'HttpOnly; Secure; SameSite=None; Partitioned; Path=/'
    : 'HttpOnly; SameSite=Lax; Path=/';

  res.append('Set-Cookie', `vh_access=; Max-Age=0; ${commonFlags}`);
  res.append('Set-Cookie', `vh_refresh=; Max-Age=0; ${commonFlags}`);
}

export function toPublicUser(user: UserRecord) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    avatarUrl: user.avatarUrl || null,
    notificationPrefs: user.notificationPrefs,
    createdAt: user.createdAt,
  };
}

function extractAccessToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (req.cookies?.vh_access) {
    return req.cookies.vh_access;
  }
  return null;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractAccessToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid token' });
    return;
  }
  const db = getDb();
  const user = db.users.find((u) => u.id === payload.sub);
  if (!user) {
    res.status(401).json({ error: 'Account not found' });
    return;
  }
  if (user.status === 'suspended') {
    res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    return;
  }
  req.user = user;
  next();
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const token = extractAccessToken(req);
  if (token) {
    const payload = verifyAccessToken(token);
    if (payload) {
      const user = getDb().users.find((u) => u.id === payload.sub && u.status !== 'suspended');
      if (user) {
        req.user = user;
      }
    }
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions for this resource' });
      return;
    }
    next();
  };
}

/**
 * CSRF protection for cookie-authenticated state-changing requests.
 * Requires either X-Requested-With header or matching Origin against Host / X-Forwarded-Host.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
  if (safeMethods.has(req.method)) {
    next();
    return;
  }

  // If authenticated via explicit Bearer header without cookies, CSRF does not apply
  if (req.headers.authorization?.startsWith('Bearer ')) {
    next();
    return;
  }

  const xRequestedWith = req.headers['x-requested-with'];
  if (xRequestedWith === 'XMLHttpRequest' || xRequestedWith === 'VanguardHire') {
    next();
    return;
  }

  const origin = req.headers.origin;
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) {
        next();
        return;
      }
    } catch {
      // fall through to rejection
    }
  }

  // Allow non-cookie unauthenticated login/register/newsletter from same-origin tools
  if (!req.cookies?.vh_access && !req.cookies?.vh_refresh) {
    next();
    return;
  }

  res.status(403).json({ error: 'CSRF validation failed' });
}

export function noSqlSanitizer(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeNoSqlInput(req.body);
  }
  next();
}
