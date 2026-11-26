import crypto from 'crypto';
import { Router } from 'express';
import { getDb, persistDb } from '../db/store';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import { createAndPushNotification, emitToUser } from '../realtime/socket';
import { messageCreateSchema } from '../validation/schemas';

const router = Router();
router.use(authenticate);

// Notifications Center
router.get('/notifications', (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const list = db.notifications
    .filter((n) => n.userId === req.user!.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const unreadCount = list.filter((n) => !n.read).length;
  res.json({ notifications: list, unreadCount });
});

router.patch('/notifications/:id/read', (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const item = db.notifications.find(
    (n) => n.id === req.params.id && n.userId === req.user!.id
  );
  if (!item) {
    res.status(404).json({ error: 'Notification not found.' });
    return;
  }
  item.read = true;
  persistDb();
  res.json({ notification: item });
});

router.post('/notifications/read-all', (req: AuthenticatedRequest, res) => {
  const db = getDb();
  for (const n of db.notifications) {
    if (n.userId === req.user!.id) n.read = true;
  }
  persistDb();
  res.json({ message: 'All notifications marked as read.' });
});

// Controlled Application-Linked Messaging
function getAuthorizedApplicationsForUser(userId: string, role: string) {
  const db = getDb();
  if (role === 'candidate') {
    return db.applications.filter((a) => a.candidateUserId === userId);
  }
  if (role === 'employer') {
    const profile = db.employerProfiles.find((ep) => ep.userId === userId);
    const ownedCompanyIds = new Set(
      db.companies
        .filter((c) => c.ownerUserId === userId || c.id === profile?.companyId)
        .map((c) => c.id)
    );
    return db.applications.filter((a) => ownedCompanyIds.has(a.companyId));
  }
  // Super Admin can audit threads
  return db.applications;
}

router.get('/messages/threads', (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const user = req.user!;
  const apps = getAuthorizedApplicationsForUser(user.id, user.role);

  const threads = apps
    .map((app) => {
      const job = db.jobs.find((j) => j.id === app.jobId);
      const company = db.companies.find((c) => c.id === app.companyId);
      const candidate = db.users.find((u) => u.id === app.candidateUserId);
      const recruiter = db.users.find((u) => u.id === (job?.employerUserId || company?.ownerUserId));
      const threadMsgs = db.messages
        .filter((m) => m.applicationId === app.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const lastMsg = threadMsgs[threadMsgs.length - 1] || null;
      const unreadCount = threadMsgs.filter(
        (m) => m.recipientUserId === user.id && !m.readAt
      ).length;

      const counterpart =
        user.role === 'candidate'
          ? {
              id: recruiter?.id || '',
              name: recruiter?.name || 'Hiring Team',
              subtitle: company?.name || 'Employer',
              avatarUrl: recruiter?.avatarUrl || null,
            }
          : {
              id: candidate?.id || '',
              name: candidate?.name || 'Candidate',
              subtitle: job?.title || 'Applicant',
              avatarUrl: candidate?.avatarUrl || null,
            };

      return {
        applicationId: app.id,
        applicationStatus: app.status,
        jobTitle: job?.title || 'Role',
        companyName: company?.name || 'Company',
        counterpart,
        lastMessage: lastMsg,
        unreadCount,
        messageCount: threadMsgs.length,
        updatedAt: lastMsg?.createdAt || app.updatedAt,
      };
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  res.json({ threads });
});

router.get('/messages/:applicationId', (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const user = req.user!;
  const authorized = getAuthorizedApplicationsForUser(user.id, user.role).some(
    (a) => a.id === req.params.applicationId
  );

  if (!authorized) {
    res.status(403).json({ error: 'Not authorized to view this conversation.' });
    return;
  }

  const now = new Date().toISOString();
  let updated = false;
  const messages = db.messages
    .filter((m) => m.applicationId === req.params.applicationId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((m) => {
      if (m.recipientUserId === user.id && !m.readAt) {
        m.readAt = now;
        updated = true;
      }
      const sender = db.users.find((u) => u.id === m.senderUserId);
      return {
        ...m,
        senderName: sender?.name || 'User',
        senderRole: sender?.role || 'candidate',
      };
    });

  if (updated) persistDb();
  res.json({ messages });
});

router.post('/messages', (req: AuthenticatedRequest, res) => {
  const parsed = messageCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid message' });
    return;
  }

  const db = getDb();
  const user = req.user!;
  const app = getAuthorizedApplicationsForUser(user.id, user.role).find(
    (a) => a.id === parsed.data.applicationId
  );

  if (!app) {
    res.status(403).json({ error: 'You are not authorized to message on this application.' });
    return;
  }

  const job = db.jobs.find((j) => j.id === app.jobId);
  const company = db.companies.find((c) => c.id === app.companyId);
  const recruiterUserId = job?.employerUserId || company?.ownerUserId || '';
  const recipientUserId =
    user.id === app.candidateUserId ? recruiterUserId : app.candidateUserId;

  if (!recipientUserId) {
    res.status(400).json({ error: 'Unable to determine authorized recipient.' });
    return;
  }

  const msg = {
    id: `msg-${crypto.randomUUID().slice(0, 8)}`,
    applicationId: app.id,
    senderUserId: user.id,
    recipientUserId,
    body: parsed.data.body,
    readAt: null,
    createdAt: new Date().toISOString(),
  };

  db.messages.push(msg);
  persistDb();

  const payload = {
    ...msg,
    senderName: user.name,
    senderRole: user.role,
  };

  emitToUser(recipientUserId, 'message:new', payload);
  emitToUser(user.id, 'message:new', payload);

  createAndPushNotification({
    userId: recipientUserId,
    type: 'message_received',
    title: `New Message from ${user.name}`,
    message: `${job?.title || 'Application'}: ${msg.body.slice(0, 90)}`,
    link:
      user.role === 'candidate'
        ? '/dashboard/employer/messages'
        : '/dashboard/candidate/messages',
    sendEmail: false,
  });

  res.status(201).json({ message: payload });
});

export default router;
