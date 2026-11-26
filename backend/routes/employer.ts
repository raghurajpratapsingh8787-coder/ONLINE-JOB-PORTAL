import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { appendAuditLog, getDb, persistDb, PUBLIC_LOGOS_DIR } from '../db/store';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/auth';
import { createAndPushNotification } from '../realtime/socket';
import { publicCache } from '../utils/cache';
import { checkInterviewConflict, isUnsafeUrlScheme, resolveSafeStoragePath } from '../utils/rules';
import {
  applicationStatusUpdateSchema,
  companyProfileSchema,
  companyVerificationSchema,
  internalNoteSchema,
  interviewScheduleSchema,
  jobPostingSchema,
} from '../validation/schemas';

const router = Router();
const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

function getOwnedCompanies(userId: string) {
  const db = getDb();
  const profile = db.employerProfiles.find((ep) => ep.userId === userId);
  return db.companies.filter((c) => c.ownerUserId === userId || c.id === profile?.companyId);
}

function getPrimaryCompany(userId: string) {
  const db = getDb();
  const profile = db.employerProfiles.find((ep) => ep.userId === userId);
  if (profile) {
    const primary = db.companies.find((c) => c.id === profile.companyId);
    if (primary) return primary;
  }
  return db.companies.find((c) => c.ownerUserId === userId) || null;
}

function isValidImageSignature(ext: string, buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  if (ext === '.png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }
  if (ext === '.jpg' || ext === '.jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (ext === '.webp') {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}

// Employer Dashboard Overview & Recruitment Analytics
router.get(
  '/dashboard',
  authenticate,
  requireRole('employer'),
  (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const userId = req.user!.id;
    const companies = getOwnedCompanies(userId);
    const companyIds = new Set(companies.map((c) => c.id));
    const primaryCompany = getPrimaryCompany(userId);

    const myJobs = db.jobs.filter((j) => companyIds.has(j.companyId));
    const myApps = db.applications.filter((a) => companyIds.has(a.companyId));
    const myInterviews = db.interviews
      .filter((iv) => companyIds.has(iv.companyId))
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

    const stats = {
      totalJobs: myJobs.length,
      activeJobs: myJobs.filter((j) => j.status === 'published').length,
      closedJobs: myJobs.filter((j) => j.status === 'closed' || j.status === 'expired').length,
      pendingJobs: myJobs.filter((j) => j.status === 'pending_approval').length,
      totalApplications: myApps.length,
      newApplicants: myApps.filter((a) => a.status === 'submitted').length,
      shortlistedCandidates: myApps.filter((a) => a.status === 'shortlisted').length,
      interviewsScheduled: myApps.filter((a) => a.status === 'interview_scheduled').length,
      hiredCandidates: myApps.filter((a) => a.status === 'selected').length,
    };

    const funnelData = [
      { stage: 'Applied', count: myApps.length },
      { stage: 'Under Review', count: myApps.filter((a) => ['under_review', 'shortlisted', 'interview_scheduled', 'selected'].includes(a.status)).length },
      { stage: 'Shortlisted', count: myApps.filter((a) => ['shortlisted', 'interview_scheduled', 'selected'].includes(a.status)).length },
      { stage: 'Interview', count: myApps.filter((a) => ['interview_scheduled', 'selected'].includes(a.status)).length },
      { stage: 'Selected', count: myApps.filter((a) => a.status === 'selected').length },
    ];

    const jobPerformance = myJobs.slice(0, 6).map((j) => ({
      title: j.title.length > 26 ? `${j.title.slice(0, 26)}…` : j.title,
      views: j.viewsCount,
      applicants: myApps.filter((a) => a.jobId === j.id).length,
    }));

    const recentApplicants = myApps
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 5)
      .map((app) => {
        const cand = db.users.find((u) => u.id === app.candidateUserId);
        const job = db.jobs.find((j) => j.id === app.jobId);
        return {
          id: app.id,
          candidateName: cand?.name || 'Candidate',
          candidateAvatar: cand?.avatarUrl || null,
          jobTitle: job?.title || 'Job',
          status: app.status,
          submittedAt: app.submittedAt,
        };
      });

    const upcomingInterviews = myInterviews
      .filter((iv) => iv.status === 'scheduled')
      .slice(0, 5)
      .map((iv) => {
        const cand = db.users.find((u) => u.id === iv.candidateUserId);
        const job = db.jobs.find((j) => j.id === iv.jobId);
        return {
          ...iv,
          candidateName: cand?.name || 'Candidate',
          jobTitle: job?.title || 'Role',
        };
      });

    res.json({
      company: primaryCompany,
      stats,
      funnelData,
      jobPerformance,
      recentApplicants,
      upcomingInterviews,
    });
  }
);

// Company Profile Management
router.get('/company', authenticate, requireRole('employer'), (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const company = getPrimaryCompany(req.user!.id);
  const verification = company
    ? db.companyVerifications.find((v) => v.companyId === company.id) || null
    : null;
  res.json({ company, verification });
});

router.put('/company', authenticate, requireRole('employer'), (req: AuthenticatedRequest, res) => {
  const parsed = companyProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid company details' });
    return;
  }
  const company = getPrimaryCompany(req.user!.id);
  if (!company) {
    res.status(404).json({ error: 'Company profile not found.' });
    return;
  }
  Object.assign(company, parsed.data, { updatedAt: new Date().toISOString() });
  persistDb();
  publicCache.invalidateTag('companies');
  res.json({ company, message: 'Company profile updated successfully.' });
});

router.post(
  '/company/logo',
  authenticate,
  requireRole('employer'),
  logoUpload.single('logo'),
  (req: AuthenticatedRequest, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Please choose a PNG, JPG, or WebP logo.' });
      return;
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext) || !isValidImageSignature(ext, file.buffer)) {
      res.status(400).json({ error: 'Invalid image format. Upload a valid PNG, JPG, or WebP file.' });
      return;
    }
    const company = getPrimaryCompany(req.user!.id);
    if (!company) {
      res.status(404).json({ error: 'Company not found.' });
      return;
    }

    const randomName = `${crypto.randomUUID()}${ext}`;
    const targetPath = resolveSafeStoragePath(PUBLIC_LOGOS_DIR, randomName);
    if (!targetPath) {
      res.status(400).json({ error: 'Invalid logo path.' });
      return;
    }
    fs.mkdirSync(PUBLIC_LOGOS_DIR, { recursive: true });
    fs.writeFileSync(targetPath, file.buffer);

    company.logoUrl = `/api/uploads/logos/${randomName}`;
    company.updatedAt = new Date().toISOString();
    persistDb();
    publicCache.invalidateTag('companies');

    res.json({ logoUrl: company.logoUrl, message: 'Company logo updated.' });
  }
);

router.post(
  '/company/verification',
  authenticate,
  requireRole('employer'),
  (req: AuthenticatedRequest, res) => {
    const parsed = companyVerificationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid verification payload' });
      return;
    }
    const db = getDb();
    const company = getPrimaryCompany(req.user!.id);
    if (!company) {
      res.status(404).json({ error: 'Company not found.' });
      return;
    }
    const now = new Date().toISOString();
    const record = {
      id: `cv-${crypto.randomUUID().slice(0, 8)}`,
      companyId: company.id,
      submittedByUserId: req.user!.id,
      ...parsed.data,
      status: 'pending' as const,
      reviewerUserId: null,
      submittedAt: now,
      reviewedAt: null,
    };
    db.companyVerifications.unshift(record);
    company.verificationStatus = 'pending';
    company.updatedAt = now;
    persistDb();

    // Notify Super Admins
    for (const admin of db.users.filter((u) => u.role === 'super_admin')) {
      createAndPushNotification({
        userId: admin.id,
        type: 'company_verified',
        title: `Verification Request — ${company.name}`,
        message: `${company.name} submitted verification documents for review.`,
        link: '/dashboard/admin/moderation',
      });
    }

    res.status(201).json({ verification: record, message: 'Verification documents submitted for review.' });
  }
);

// Job Posting Management (Own Company Only)
router.get('/jobs', authenticate, requireRole('employer'), (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const companyIds = new Set(getOwnedCompanies(req.user!.id).map((c) => c.id));
  const jobs = db.jobs
    .filter((j) => companyIds.has(j.companyId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((j) => ({
      ...j,
      companyName: db.companies.find((c) => c.id === j.companyId)?.name || 'Company',
      applicantsCount: db.applications.filter((a) => a.jobId === j.id).length,
    }));
  res.json({ jobs });
});

router.post('/jobs', authenticate, requireRole('employer'), (req: AuthenticatedRequest, res) => {
  const parsed = jobPostingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid job posting fields' });
    return;
  }

  const db = getDb();
  const company = getPrimaryCompany(req.user!.id);
  if (!company) {
    res.status(400).json({ error: 'Create your company profile before posting jobs.' });
    return;
  }

  const now = new Date().toISOString();
  let desiredStatus = parsed.data.status || 'published';

  // Business Rule: Only verified/approved employers may publish directly
  if (
    desiredStatus === 'published' &&
    (company.verificationStatus !== 'verified' || db.platformSettings.requireJobApproval)
  ) {
    desiredStatus = 'pending_approval';
  }

  const job = {
    id: `job-${crypto.randomUUID().slice(0, 8)}`,
    companyId: company.id,
    employerUserId: req.user!.id,
    ...parsed.data,
    status: desiredStatus,
    featured: false,
    viewsCount: 0,
    history: [
      {
        action:
          desiredStatus === 'published'
            ? 'Created & Published'
            : desiredStatus === 'draft'
              ? 'Saved as Draft'
              : 'Submitted for Admin Approval',
        actorId: req.user!.id,
        actorName: req.user!.name,
        timestamp: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  db.jobs.unshift(job);
  persistDb();
  publicCache.invalidateTag('jobs');

  appendAuditLog({
    actorUserId: req.user!.id,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'JOB_CREATED',
    resourceType: 'Job',
    resourceId: job.id,
    details: `Created job "${job.title}" with status ${job.status}.`,
    ipAddress: req.ip,
  });

  if (job.status === 'pending_approval') {
    for (const admin of db.users.filter((u) => u.role === 'super_admin')) {
      createAndPushNotification({
        userId: admin.id,
        type: 'job_match',
        title: `Job Pending Approval — ${job.title}`,
        message: `${company.name} submitted "${job.title}" for review.`,
        link: '/dashboard/admin/moderation',
      });
    }
  }

  res.status(201).json({
    job,
    message:
      job.status === 'pending_approval'
        ? 'Job submitted for Super Admin approval (required before publishing for unverified companies).'
        : job.status === 'draft'
          ? 'Job saved as draft.'
          : 'Job posting published live.',
  });
});

router.put('/jobs/:id', authenticate, requireRole('employer'), (req: AuthenticatedRequest, res) => {
  const parsed = jobPostingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid job fields' });
    return;
  }

  const db = getDb();
  const companyIds = new Set(getOwnedCompanies(req.user!.id).map((c) => c.id));
  const job = db.jobs.find((j) => j.id === req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Job not found.' });
    return;
  }
  if (!companyIds.has(job.companyId)) {
    res.status(403).json({ error: 'You are not authorized to edit another employer’s job.' });
    return;
  }

  const company = db.companies.find((c) => c.id === job.companyId);
  let nextStatus = parsed.data.status || job.status;
  if (
    nextStatus === 'published' &&
    (company?.verificationStatus !== 'verified' || db.platformSettings.requireJobApproval)
  ) {
    nextStatus = 'pending_approval';
  }

  const now = new Date().toISOString();
  Object.assign(job, parsed.data, { status: nextStatus, updatedAt: now });
  job.history.unshift({
    action: `Updated (${nextStatus})`,
    actorId: req.user!.id,
    actorName: req.user!.name,
    timestamp: now,
  });
  persistDb();
  publicCache.invalidateTag('jobs');

  res.json({ job, message: 'Job posting updated.' });
});

router.patch(
  '/jobs/:id/status',
  authenticate,
  requireRole('employer'),
  (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const companyIds = new Set(getOwnedCompanies(req.user!.id).map((c) => c.id));
    const job = db.jobs.find((j) => j.id === req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Job not found.' });
      return;
    }
    if (!companyIds.has(job.companyId)) {
      res.status(403).json({ error: 'Unauthorized job status update.' });
      return;
    }

    const requested = req.body?.status;
    if (!['draft', 'pending_approval', 'published', 'paused', 'closed'].includes(requested)) {
      res.status(400).json({ error: 'Invalid status value.' });
      return;
    }

    const company = db.companies.find((c) => c.id === job.companyId);
    const finalStatus =
      requested === 'published' &&
      (company?.verificationStatus !== 'verified' || db.platformSettings.requireJobApproval)
        ? 'pending_approval'
        : requested;

    const now = new Date().toISOString();
    job.status = finalStatus;
    job.updatedAt = now;
    job.history.unshift({
      action: `Status changed to ${finalStatus}`,
      actorId: req.user!.id,
      actorName: req.user!.name,
      timestamp: now,
    });
    persistDb();
    publicCache.invalidateTag('jobs');

    res.json({ job, message: `Job status updated to ${finalStatus.replace('_', ' ')}.` });
  }
);

// Applicant Tracking System (ATS)
router.get('/applicants', authenticate, requireRole('employer'), (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const companyIds = new Set(getOwnedCompanies(req.user!.id).map((c) => c.id));

  const q = String(req.query.q || '').trim().toLowerCase();
  const statusFilter = String(req.query.status || 'all');
  const jobIdFilter = String(req.query.jobId || 'all');

  let apps = db.applications.filter((a) => companyIds.has(a.companyId));
  if (statusFilter !== 'all') apps = apps.filter((a) => a.status === statusFilter);
  if (jobIdFilter !== 'all') apps = apps.filter((a) => a.jobId === jobIdFilter);

  const hydrated = apps
    .map((app) => {
      const candidate = db.users.find((u) => u.id === app.candidateUserId);
      const profile = db.candidateProfiles.find((p) => p.userId === app.candidateUserId);
      const job = db.jobs.find((j) => j.id === app.jobId);
      const resume = db.resumes.find((r) => r.id === app.resumeId);
      const interviews = db.interviews.filter((iv) => iv.applicationId === app.id);

      return {
        ...app,
        candidate: {
          id: candidate?.id || app.candidateUserId,
          name: candidate?.name || 'Candidate',
          email: candidate?.email || '',
          avatarUrl: candidate?.avatarUrl || null,
          headline: profile?.headline || '',
          location: profile?.location || '',
          yearsOfExperience: profile?.yearsOfExperience || 0,
          skills: profile?.skills || [],
          education: profile?.education || [],
          experience: profile?.experience || [],
          projects: profile?.projects || [],
          portfolioLinks: profile?.portfolioLinks || {},
        },
        jobTitle: job?.title || 'Job',
        resume: resume
          ? { id: resume.id, originalName: resume.originalName, sizeBytes: resume.sizeBytes }
          : null,
        interviews,
      };
    })
    .filter((item) => {
      if (!q) return true;
      return (
        item.candidate.name.toLowerCase().includes(q) ||
        item.jobTitle.toLowerCase().includes(q) ||
        item.candidate.skills.some((s) => s.toLowerCase().includes(q)) ||
        item.candidate.headline.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  res.json({ applicants: hydrated });
});

router.patch(
  '/applicants/:id/status',
  authenticate,
  requireRole('employer'),
  (req: AuthenticatedRequest, res) => {
    const parsed = applicationStatusUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid status update' });
      return;
    }

    const db = getDb();
    const companyIds = new Set(getOwnedCompanies(req.user!.id).map((c) => c.id));
    const app = db.applications.find((a) => a.id === req.params.id);
    if (!app) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }
    if (!companyIds.has(app.companyId)) {
      res.status(403).json({ error: 'Unauthorized application access.' });
      return;
    }

    const now = new Date().toISOString();
    app.status = parsed.data.status;
    app.updatedAt = now;
    app.timeline.push({
      status: parsed.data.status,
      note: parsed.data.note || `Updated to ${parsed.data.status.replace('_', ' ')}`,
      timestamp: now,
    });
    persistDb();

    const job = db.jobs.find((j) => j.id === app.jobId);
    const company = db.companies.find((c) => c.id === app.companyId);

    const notifMap: Record<string, { type: any; title: string; msg: string }> = {
      under_review: {
        type: 'application_viewed',
        title: `Application Under Review — ${company?.name || 'Employer'}`,
        msg: `Your application for ${job?.title || 'the role'} is now under review.`,
      },
      shortlisted: {
        type: 'shortlisted',
        title: `Shortlisted — ${job?.title || 'Role'}`,
        msg: `Congratulations! ${company?.name || 'The hiring team'} shortlisted your application for ${job?.title}.`,
      },
      selected: {
        type: 'candidate_selected',
        title: `Selected for Offer — ${job?.title || 'Role'}`,
        msg: `${company?.name || 'Employer'} selected you for ${job?.title}! Check messages for next steps.`,
      },
      rejected: {
        type: 'application_rejected',
        title: `Application Update — ${job?.title || 'Role'}`,
        msg: `${company?.name || 'The hiring team'} has decided not to move forward for ${job?.title} at this time.`,
      },
    };

    const meta = notifMap[parsed.data.status];
    if (meta) {
      createAndPushNotification({
        userId: app.candidateUserId,
        type: meta.type,
        title: meta.title,
        message: meta.msg,
        link: '/dashboard/candidate/applications',
      });
    }

    appendAuditLog({
      actorUserId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'APPLICATION_STATUS_CHANGED',
      resourceType: 'Application',
      resourceId: app.id,
      details: `Updated application ${app.id} status to ${parsed.data.status}.`,
      ipAddress: req.ip,
    });

    res.json({ application: app, message: 'Candidate stage updated.' });
  }
);

router.post(
  '/applicants/:id/notes',
  authenticate,
  requireRole('employer'),
  (req: AuthenticatedRequest, res) => {
    const parsed = internalNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid note' });
      return;
    }

    const db = getDb();
    const companyIds = new Set(getOwnedCompanies(req.user!.id).map((c) => c.id));
    const app = db.applications.find((a) => a.id === req.params.id);
    if (!app || !companyIds.has(app.companyId)) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }

    const note = {
      id: `note-${crypto.randomUUID().slice(0, 8)}`,
      authorId: req.user!.id,
      authorName: req.user!.name,
      content: parsed.data.content,
      createdAt: new Date().toISOString(),
    };
    app.internalNotes.unshift(note);
    app.updatedAt = note.createdAt;
    persistDb();

    res.status(201).json({ note, message: 'Private recruiter note added.' });
  }
);

// Interview Scheduling
router.get('/interviews', authenticate, requireRole('employer'), (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const companyIds = new Set(getOwnedCompanies(req.user!.id).map((c) => c.id));
  const interviews = db.interviews
    .filter((iv) => companyIds.has(iv.companyId))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .map((iv) => ({
      ...iv,
      candidateName: db.users.find((u) => u.id === iv.candidateUserId)?.name || 'Candidate',
      candidateEmail: db.users.find((u) => u.id === iv.candidateUserId)?.email || '',
      jobTitle: db.jobs.find((j) => j.id === iv.jobId)?.title || 'Job',
    }));

  res.json({ interviews });
});

router.post('/interviews', authenticate, requireRole('employer'), (req: AuthenticatedRequest, res) => {
  const parsed = interviewScheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid interview details' });
    return;
  }

  const db = getDb();
  const companyIds = new Set(getOwnedCompanies(req.user!.id).map((c) => c.id));
  const app = db.applications.find((a) => a.id === parsed.data.applicationId);
  if (!app || !companyIds.has(app.companyId)) {
    res.status(404).json({ error: 'Authorized application not found.' });
    return;
  }

  const conflict = checkInterviewConflict(
    db.interviews,
    app.id,
    parsed.data.date,
    parsed.data.time
  );
  if (!conflict.allowed) {
    res.status(409).json({ error: conflict.reason });
    return;
  }

  const now = new Date().toISOString();
  const interview = {
    id: `iv-${crypto.randomUUID().slice(0, 8)}`,
    applicationId: app.id,
    jobId: app.jobId,
    companyId: app.companyId,
    candidateUserId: app.candidateUserId,
    employerUserId: req.user!.id,
    date: parsed.data.date,
    time: parsed.data.time,
    durationMinutes: parsed.data.durationMinutes,
    type: parsed.data.type,
    locationOrLink: parsed.data.locationOrLink,
    notes: parsed.data.notes || '',
    status: 'scheduled' as const,
    createdAt: now,
    updatedAt: now,
  };

  db.interviews.unshift(interview);
  app.status = 'interview_scheduled';
  app.updatedAt = now;
  app.timeline.push({
    status: 'interview_scheduled',
    note: `${interview.type} interview scheduled for ${interview.date} at ${interview.time}`,
    timestamp: now,
  });
  persistDb();

  const job = db.jobs.find((j) => j.id === app.jobId);
  const company = db.companies.find((c) => c.id === app.companyId);

  createAndPushNotification({
    userId: app.candidateUserId,
    type: 'interview_scheduled',
    title: `Interview Scheduled — ${company?.name || 'Employer'}`,
    message: `${interview.type} interview for ${job?.title || 'role'} on ${interview.date} at ${interview.time}.`,
    link: '/dashboard/candidate/applications',
  });

  appendAuditLog({
    actorUserId: req.user!.id,
    actorEmail: req.user!.email,
    actorRole: req.user!.role,
    action: 'INTERVIEW_SCHEDULED',
    resourceType: 'Interview',
    resourceId: interview.id,
    details: `Scheduled ${interview.type} interview on ${interview.date} ${interview.time} for application ${app.id}.`,
    ipAddress: req.ip,
  });

  res.status(201).json({ interview, message: 'Interview scheduled and candidate notified.' });
});

router.patch(
  '/interviews/:id',
  authenticate,
  requireRole('employer'),
  (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const companyIds = new Set(getOwnedCompanies(req.user!.id).map((c) => c.id));
    const interview = db.interviews.find((iv) => iv.id === req.params.id);
    if (!interview || !companyIds.has(interview.companyId)) {
      res.status(404).json({ error: 'Interview not found.' });
      return;
    }

    const status = req.body?.status;
    if (status && ['scheduled', 'completed', 'cancelled', 'rescheduled'].includes(status)) {
      interview.status = status;
    }
    if (typeof req.body?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.body.date)) {
      interview.date = req.body.date;
    }
    if (typeof req.body?.time === 'string' && /^\d{2}:\d{2}$/.test(req.body.time)) {
      interview.time = req.body.time;
    }
    if (typeof req.body?.locationOrLink === 'string' && req.body.locationOrLink.trim()) {
      const trimmedLoc = req.body.locationOrLink.trim();
      if (trimmedLoc.length < 3 || trimmedLoc.length > 300 || isUnsafeUrlScheme(trimmedLoc)) {
        res.status(400).json({ error: 'Provide a valid meeting link or office location.' });
        return;
      }
      interview.locationOrLink = trimmedLoc;
    }
    interview.updatedAt = new Date().toISOString();
    persistDb();

    createAndPushNotification({
      userId: interview.candidateUserId,
      type: 'interview_scheduled',
      title: 'Interview Updated',
      message: `Your interview schedule was updated (${interview.date} at ${interview.time} · ${interview.status}).`,
      link: '/dashboard/candidate/applications',
    });

    res.json({ interview, message: 'Interview updated.' });
  }
);

export default router;
