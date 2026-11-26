import crypto from 'crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { appendAuditLog, getDb, persistDb } from '../db/store';
import {
  authenticate,
  clearAuthCookies,
  hashToken,
  optionalAuth,
  setAuthCookies,
  signAccessToken,
  signRefreshToken,
  toPublicUser,
  verifyRefreshToken,
  type AuthenticatedRequest,
} from '../middleware/auth';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '../validation/schemas';
import { sendEmailNotification } from '../utils/mailer';
import { publicCache } from '../utils/cache';

const router = Router();

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation failed' });
    return;
  }

  const db = getDb();
  const data = parsed.data;
  const emailLower = data.email.toLowerCase();

  if (data.role === 'candidate' && !db.platformSettings.allowCandidateRegistration) {
    res.status(403).json({ error: 'Candidate registration is currently paused.' });
    return;
  }
  if (data.role === 'employer' && !db.platformSettings.allowEmployerRegistration) {
    res.status(403).json({ error: 'Employer registration is currently paused.' });
    return;
  }

  if (db.users.some((u) => u.email.toLowerCase() === emailLower)) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const now = new Date().toISOString();
  const userId = `usr-${crypto.randomUUID().slice(0, 8)}`;
  const passwordHash = await bcrypt.hash(data.password, 10);
  const verificationToken = crypto.randomBytes(24).toString('hex');

  const newUser = {
    id: userId,
    name: data.name,
    email: emailLower,
    passwordHash,
    role: data.role,
    status: 'active' as const,
    emailVerified: false,
    emailVerificationToken: verificationToken,
    refreshTokenHashes: [] as string[],
    notificationPrefs: {
      emailApplications: true,
      emailInterviews: true,
      emailJobAlerts: true,
    },
    createdAt: now,
    updatedAt: now,
  };

  db.users.push(newUser);

  if (data.role === 'candidate') {
    db.candidateProfiles.push({
      id: `cp-${crypto.randomUUID().slice(0, 8)}`,
      userId,
      headline: '',
      summary: '',
      phone: '',
      location: '',
      yearsOfExperience: 0,
      skills: [],
      education: [],
      experience: [],
      certifications: [],
      projects: [],
      portfolioLinks: {},
      openToRemote: true,
      updatedAt: now,
    });
  } else if (data.role === 'employer') {
    const companyName = data.companyName?.trim() || `${data.name}'s Organization`;
    const slugBase = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const companyId = `comp-${crypto.randomUUID().slice(0, 8)}`;

    db.companies.push({
      id: companyId,
      ownerUserId: userId,
      name: companyName,
      slug: `${slugBase || 'company'}-${companyId.slice(-4)}`,
      industry: data.industry?.trim() || 'Technology',
      size: '11-50 employees',
      headquarters: data.headquarters?.trim() || 'Remote',
      description: `${companyName} is hiring on VanguardHire. Complete your company profile and verification to publish directly.`,
      verificationStatus: 'unsubmitted',
      verifiedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    db.employerProfiles.push({
      id: `ep-${crypto.randomUUID().slice(0, 8)}`,
      userId,
      companyId,
      jobTitle: 'Recruiting Lead',
      department: 'Talent Acquisition',
      createdAt: now,
      updatedAt: now,
    });
    publicCache.invalidateTag('companies');
  }

  const accessToken = signAccessToken(newUser);
  const refreshToken = signRefreshToken(newUser);
  newUser.refreshTokenHashes.push(hashToken(refreshToken));
  persistDb();

  setAuthCookies(req, res, accessToken, refreshToken);

  appendAuditLog({
    actorUserId: userId,
    actorEmail: emailLower,
    actorRole: data.role,
    action: 'USER_REGISTERED',
    resourceType: 'User',
    resourceId: userId,
    details: `Registered new ${data.role} account.`,
    ipAddress: req.ip,
  });

  void sendEmailNotification({
    to: emailLower,
    subject: 'Verify your VanguardHire account',
    text: `Welcome ${data.name}! Use verification token ${verificationToken} to verify your email.`,
  });

  res.status(201).json({
    user: toPublicUser(newUser),
    accessToken,
    ...(process.env.NODE_ENV !== 'production' ? { emailVerificationTokenPreview: verificationToken } : {}),
    message: 'Account created successfully.',
  });
});

router.post('/verify-email', (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  if (!token) {
    res.status(400).json({ error: 'Verification token is required.' });
    return;
  }
  const db = getDb();
  const user = db.users.find((u) => u.emailVerificationToken === token);
  if (!user) {
    res.status(400).json({ error: 'Invalid or expired verification token.' });
    return;
  }
  user.emailVerified = true;
  user.emailVerificationToken = null;
  user.updatedAt = new Date().toISOString();
  persistDb();
  res.json({ message: 'Email verified successfully.', user: toPublicUser(user) });
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid credentials' });
    return;
  }

  const db = getDb();
  const emailLower = parsed.data.email.toLowerCase();
  const user = db.users.find((u) => u.email.toLowerCase() === emailLower);

  if (!user) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  if (user.status === 'suspended') {
    res.status(403).json({ error: 'This account has been suspended by an administrator.' });
    return;
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHashes = [...user.refreshTokenHashes.slice(-4), hashToken(refreshToken)];
  user.updatedAt = new Date().toISOString();
  persistDb();

  setAuthCookies(req, res, accessToken, refreshToken);

  res.json({
    user: toPublicUser(user),
    accessToken,
  });
});

router.post('/refresh', (req, res) => {
  const incomingToken = req.cookies?.vh_refresh;
  if (!incomingToken) {
    res.status(401).json({ error: 'No refresh token present.' });
    return;
  }

  const payload = verifyRefreshToken(incomingToken);
  if (!payload) {
    clearAuthCookies(req, res);
    res.status(401).json({ error: 'Refresh token invalid or expired.' });
    return;
  }

  const db = getDb();
  const user = db.users.find((u) => u.id === payload.sub);
  if (!user || user.status === 'suspended') {
    clearAuthCookies(req, res);
    res.status(401).json({ error: 'Account unavailable.' });
    return;
  }

  const incomingHash = hashToken(incomingToken);
  if (!user.refreshTokenHashes.includes(incomingHash)) {
    // Possible token reuse: revoke all active refresh sessions for this user
    user.refreshTokenHashes = [];
    persistDb();
    clearAuthCookies(req, res);
    res.status(401).json({ error: 'Session invalidated. Please sign in again.' });
    return;
  }

  // Rotate refresh token
  const newAccess = signAccessToken(user);
  const newRefresh = signRefreshToken(user);
  user.refreshTokenHashes = user.refreshTokenHashes
    .filter((h) => h !== incomingHash)
    .concat(hashToken(newRefresh));
  persistDb();

  setAuthCookies(req, res, newAccess, newRefresh);
  res.json({ user: toPublicUser(user), accessToken: newAccess });
});

router.post('/logout', (req, res) => {
  const incomingRefresh = req.cookies?.vh_refresh;
  if (incomingRefresh) {
    const payload = verifyRefreshToken(incomingRefresh);
    if (payload) {
      const db = getDb();
      const user = db.users.find((u) => u.id === payload.sub);
      if (user) {
        const h = hashToken(incomingRefresh);
        user.refreshTokenHashes = user.refreshTokenHashes.filter((item) => item !== h);
        persistDb();
      }
    }
  }
  clearAuthCookies(req, res);
  res.json({ message: 'Signed out successfully.' });
});

router.post('/forgot-password', (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid email' });
    return;
  }
  const db = getDb();
  const user = db.users.find((u) => u.email.toLowerCase() === parsed.data.email.toLowerCase());
  let previewToken: string | undefined;

  if (user) {
    const rawToken = crypto.randomBytes(24).toString('hex');
    user.passwordResetTokenHash = hashToken(rawToken);
    user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    persistDb();
    previewToken = rawToken;
    void sendEmailNotification({
      to: user.email,
      subject: 'VanguardHire Password Reset Request',
      text: `Use this single-use reset token within 30 minutes: ${rawToken}`,
    });
  }

  res.json({
    message: 'If an account matches that email, a password reset token has been issued (expires in 30 minutes).',
    // Provided in non-production preview so users can test end-to-end reset without SMTP
    ...(process.env.NODE_ENV !== 'production' && previewToken ? { resetTokenPreview: previewToken } : {}),
  });
});

router.post('/reset-password', async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid reset request' });
    return;
  }
  const db = getDb();
  const tokenHash = hashToken(parsed.data.token);
  const user = db.users.find(
    (u) =>
      u.passwordResetTokenHash === tokenHash &&
      u.passwordResetExpiresAt &&
      new Date(u.passwordResetExpiresAt).getTime() > Date.now()
  );

  if (!user) {
    res.status(400).json({ error: 'Reset token is invalid or has expired.' });
    return;
  }

  user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  user.refreshTokenHashes = [];
  user.updatedAt = new Date().toISOString();
  persistDb();

  res.json({ message: 'Password updated successfully. You may now sign in.' });
});

router.get('/session', optionalAuth, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  if (req.user) {
    const unreadNotifications = db.notifications.filter((n) => n.userId === req.user!.id && !n.read).length;
    res.json({
      authenticated: true,
      user: toPublicUser(req.user),
      unreadNotifications,
    });
    return;
  }

  const incomingRefresh = req.cookies?.vh_refresh;
  if (incomingRefresh) {
    const payload = verifyRefreshToken(incomingRefresh);
    if (payload) {
      const user = db.users.find((u) => u.id === payload.sub);
      const incomingHash = hashToken(incomingRefresh);
      if (user && user.status !== 'suspended' && user.refreshTokenHashes.includes(incomingHash)) {
        const newAccess = signAccessToken(user);
        const newRefresh = signRefreshToken(user);
        user.refreshTokenHashes = user.refreshTokenHashes
          .filter((h) => h !== incomingHash)
          .slice(-4);
        user.refreshTokenHashes.push(hashToken(newRefresh));
        persistDb();
        setAuthCookies(req, res, newAccess, newRefresh);
        const unreadNotifications = db.notifications.filter((n) => n.userId === user.id && !n.read).length;
        res.json({
          authenticated: true,
          user: toPublicUser(user),
          accessToken: newAccess,
          unreadNotifications,
        });
        return;
      }
    }
    clearAuthCookies(req, res);
  }

  res.json({
    authenticated: false,
    user: null,
    unreadNotifications: 0,
  });
});

router.get('/me', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const db = getDb();
  const unreadNotifications = db.notifications.filter((n) => n.userId === user.id && !n.read).length;
  res.json({
    user: toPublicUser(user),
    unreadNotifications,
  });
});

router.patch('/settings', authenticate, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const db = getDb();
  const target = db.users.find((u) => u.id === user.id);
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (typeof req.body?.name === 'string' && req.body.name.trim().length >= 2) {
    target.name = req.body.name.trim().slice(0, 100);
  }
  if (req.body?.notificationPrefs && typeof req.body.notificationPrefs === 'object') {
    target.notificationPrefs = {
      emailApplications: Boolean(req.body.notificationPrefs.emailApplications),
      emailInterviews: Boolean(req.body.notificationPrefs.emailInterviews),
      emailJobAlerts: Boolean(req.body.notificationPrefs.emailJobAlerts),
    };
  }
  target.updatedAt = new Date().toISOString();
  persistDb();

  res.json({ user: toPublicUser(target), message: 'Account settings saved.' });
});

router.post('/change-password', authenticate, async (req: AuthenticatedRequest, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid password payload' });
    return;
  }
  const db = getDb();
  const user = db.users.find((u) => u.id === req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) {
    res.status(400).json({ error: 'Current password is incorrect.' });
    return;
  }
  user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  user.updatedAt = new Date().toISOString();
  persistDb();
  res.json({ message: 'Password updated successfully.' });
});

export default router;
