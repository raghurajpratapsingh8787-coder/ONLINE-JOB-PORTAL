import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { appendAuditLog, getDb, persistDb, PRIVATE_RESUMES_DIR } from '../db/store';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/auth';
import { createAndPushNotification } from '../realtime/socket';
import {
  calculateProfileCompletion,
  canWithdrawApplication,
  checkApplicationEligibility,
  MAX_RESUME_BYTES,
  redactApplicationForCandidate,
  resolveSafeStoragePath,
  validateResumeFile,
} from '../utils/rules';
import {
  applicationSubmitSchema,
  candidateProfileSchema,
  savedSearchSchema,
} from '../validation/schemas';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Candidate Dashboard Overview
router.get(
  '/dashboard',
  authenticate,
  requireRole('candidate'),
  (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const userId = req.user!.id;
    const profile = db.candidateProfiles.find((p) => p.userId === userId) || null;
    const resumes = db.resumes.filter((r) => r.candidateUserId === userId);
    const completion = calculateProfileCompletion(profile, resumes.length);

    const myApps = db.applications
      .filter((a) => a.candidateUserId === userId)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    const myInterviews = db.interviews
      .filter((iv) => iv.candidateUserId === userId && iv.status === 'scheduled')
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
      .map((iv) => {
        const job = db.jobs.find((j) => j.id === iv.jobId);
        const company = db.companies.find((c) => c.id === iv.companyId);
        return {
          ...iv,
          jobTitle: job?.title || 'Role',
          companyName: company?.name || 'Employer',
        };
      });

    const savedJobsCount = db.savedJobs.filter((s) => s.candidateUserId === userId).length;

    const stats = {
      profileCompletion: completion.percentage,
      totalApplications: myApps.length,
      underReview: myApps.filter((a) => a.status === 'under_review' || a.status === 'submitted').length,
      interviewsScheduled: myApps.filter((a) => a.status === 'interview_scheduled').length,
      shortlisted: myApps.filter((a) => a.status === 'shortlisted').length,
      rejected: myApps.filter((a) => a.status === 'rejected').length,
      selected: myApps.filter((a) => a.status === 'selected').length,
      savedJobs: savedJobsCount,
    };

    const recentApplications = myApps.slice(0, 5).map((app) => {
      const job = db.jobs.find((j) => j.id === app.jobId);
      const company = db.companies.find((c) => c.id === app.companyId);
      return {
        ...redactApplicationForCandidate(app),
        jobTitle: job?.title || 'Job Posting',
        jobLocation: job?.location || '',
        companyName: company?.name || 'Company',
      };
    });

    // Recommended jobs based on candidate skills not yet applied to
    const appliedJobIds = new Set(myApps.map((a) => a.jobId));
    const skillSet = new Set((profile?.skills || []).map((s) => s.toLowerCase()));
    const recommendedJobs = db.jobs
      .filter((j) => j.status === 'published' && !appliedJobIds.has(j.id))
      .map((j) => {
        const matchCount = j.requiredSkills.filter((s) => skillSet.has(s.toLowerCase())).length;
        const company = db.companies.find((c) => c.id === j.companyId);
        return {
          id: j.id,
          title: j.title,
          companyName: company?.name || 'Company',
          location: j.location,
          workMode: j.workMode,
          salaryMin: j.salaryMin,
          salaryMax: j.salaryMax,
          salaryCurrency: j.salaryCurrency,
          employmentType: j.employmentType,
          matchCount,
        };
      })
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 4);

    res.json({
      stats,
      completion,
      recentApplications,
      upcomingInterviews: myInterviews,
      recommendedJobs,
    });
  }
);

// Profile GET & PUT
router.get('/profile', authenticate, requireRole('candidate'), (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const userId = req.user!.id;
  let profile = db.candidateProfiles.find((p) => p.userId === userId);
  if (!profile) {
    profile = {
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
      updatedAt: new Date().toISOString(),
    };
    db.candidateProfiles.push(profile);
    persistDb();
  }
  const resumeCount = db.resumes.filter((r) => r.candidateUserId === userId).length;
  res.json({
    profile,
    completion: calculateProfileCompletion(profile, resumeCount),
  });
});

router.put('/profile', authenticate, requireRole('candidate'), (req: AuthenticatedRequest, res) => {
  const parsed = candidateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid profile data' });
    return;
  }

  const db = getDb();
  const userId = req.user!.id;
  const now = new Date().toISOString();
  const { name, ...profileData } = parsed.data;

  if (name) {
    const user = db.users.find((u) => u.id === userId);
    if (user) {
      user.name = name;
      user.updatedAt = now;
    }
  }

  let profile = db.candidateProfiles.find((p) => p.userId === userId);
  if (!profile) {
    profile = {
      id: `cp-${crypto.randomUUID().slice(0, 8)}`,
      userId,
      ...profileData,
      updatedAt: now,
    };
    db.candidateProfiles.push(profile);
  } else {
    Object.assign(profile, profileData, { updatedAt: now });
  }
  persistDb();

  const resumeCount = db.resumes.filter((r) => r.candidateUserId === userId).length;
  res.json({
    profile,
    completion: calculateProfileCompletion(profile, resumeCount),
    message: 'Profile updated successfully.',
  });
});

// Saved Jobs
router.get('/saved-jobs', authenticate, requireRole('candidate'), (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const saved = db.savedJobs
    .filter((s) => s.candidateUserId === req.user!.id)
    .map((s) => {
      const job = db.jobs.find((j) => j.id === s.jobId);
      if (!job) return null;
      const company = db.companies.find((c) => c.id === job.companyId);
      return {
        savedId: s.id,
        savedAt: s.savedAt,
        job: {
          ...job,
          companyName: company?.name || 'Company',
          companyVerified: company?.verificationStatus === 'verified',
        },
      };
    })
    .filter(Boolean);

  res.json({ savedJobs: saved });
});

router.post(
  '/saved-jobs/:jobId',
  authenticate,
  requireRole('candidate'),
  (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const job = db.jobs.find((j) => j.id === req.params.jobId && j.status === 'published');
    if (!job) {
      res.status(404).json({ error: 'Job not found.' });
      return;
    }
    const existingIdx = db.savedJobs.findIndex(
      (s) => s.candidateUserId === req.user!.id && s.jobId === job.id
    );
    if (existingIdx !== -1) {
      db.savedJobs.splice(existingIdx, 1);
      persistDb();
      res.json({ saved: false, message: 'Removed from saved jobs.' });
      return;
    }
    db.savedJobs.unshift({
      id: `sj-${crypto.randomUUID().slice(0, 8)}`,
      candidateUserId: req.user!.id,
      jobId: job.id,
      savedAt: new Date().toISOString(),
    });
    persistDb();
    res.status(201).json({ saved: true, message: 'Job saved to your shortlist.' });
  }
);

// Saved Searches
router.get(
  '/saved-searches',
  authenticate,
  requireRole('candidate'),
  (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const searches = db.savedSearches.filter((s) => s.candidateUserId === req.user!.id);
    res.json({ savedSearches: searches });
  }
);

router.post(
  '/saved-searches',
  authenticate,
  requireRole('candidate'),
  (req: AuthenticatedRequest, res) => {
    const parsed = savedSearchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid search data' });
      return;
    }
    const db = getDb();
    const item = {
      id: `ss-${crypto.randomUUID().slice(0, 8)}`,
      candidateUserId: req.user!.id,
      ...parsed.data,
      createdAt: new Date().toISOString(),
    };
    db.savedSearches.unshift(item);
    persistDb();
    res.status(201).json({ savedSearch: item, message: 'Search alert saved.' });
  }
);

router.delete(
  '/saved-searches/:id',
  authenticate,
  requireRole('candidate'),
  (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const idx = db.savedSearches.findIndex(
      (s) => s.id === req.params.id && s.candidateUserId === req.user!.id
    );
    if (idx === -1) {
      res.status(404).json({ error: 'Saved search not found.' });
      return;
    }
    db.savedSearches.splice(idx, 1);
    persistDb();
    res.json({ message: 'Saved search deleted.' });
  }
);

// Resume Manager (Private Storage + Authorized Download)
router.get('/resumes', authenticate, requireRole('candidate'), (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const resumes = db.resumes
    .filter((r) => r.candidateUserId === req.user!.id)
    .map(({ storedFileName: _hidden, ...safe }) => safe);
  res.json({ resumes });
});

router.post(
  '/resumes',
  authenticate,
  requireRole('candidate'),
  upload.single('resume'),
  (req: AuthenticatedRequest, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Please upload a PDF or DOCX resume file.' });
      return;
    }

    const maxBytes = (getDb().platformSettings.maxResumeSizeMb || 5) * 1024 * 1024;
    const check = validateResumeFile(file.originalname, file.mimetype, file.buffer, maxBytes);
    if (!check.allowed) {
      res.status(400).json({ error: check.reason });
      return;
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const randomName = `${crypto.randomUUID()}${ext}`;
    const targetPath = resolveSafeStoragePath(PRIVATE_RESUMES_DIR, randomName);
    if (!targetPath) {
      res.status(400).json({ error: 'Invalid storage filename.' });
      return;
    }

    fs.mkdirSync(PRIVATE_RESUMES_DIR, { recursive: true });
    fs.writeFileSync(targetPath, file.buffer);

    const db = getDb();
    const userId = req.user!.id;
    const existing = db.resumes.filter((r) => r.candidateUserId === userId);
    const makeDefault = existing.length === 0 || req.body?.setDefault === 'true';

    if (makeDefault) {
      for (const r of existing) r.isDefault = false;
    }

    const now = new Date().toISOString();
    const record = {
      id: `res-${crypto.randomUUID().slice(0, 8)}`,
      candidateUserId: userId,
      originalName: path.basename(file.originalname).slice(0, 140),
      storedFileName: randomName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      isDefault: makeDefault,
      uploadedAt: now,
      updatedAt: now,
    };

    db.resumes.unshift(record);
    persistDb();

    const { storedFileName: _hidden, ...safe } = record;
    res.status(201).json({ resume: safe, message: 'Resume uploaded securely.' });
  }
);

router.put(
  '/resumes/:id/replace',
  authenticate,
  requireRole('candidate'),
  upload.single('resume'),
  (req: AuthenticatedRequest, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Please select a replacement PDF or DOCX file.' });
      return;
    }
    const maxBytes = (getDb().platformSettings.maxResumeSizeMb || 5) * 1024 * 1024;
    const check = validateResumeFile(file.originalname, file.mimetype, file.buffer, maxBytes);
    if (!check.allowed) {
      res.status(400).json({ error: check.reason });
      return;
    }

    const db = getDb();
    const record = db.resumes.find(
      (r) => r.id === req.params.id && r.candidateUserId === req.user!.id
    );
    if (!record) {
      res.status(404).json({ error: 'Resume not found.' });
      return;
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const randomName = `${crypto.randomUUID()}${ext}`;
    const newPath = resolveSafeStoragePath(PRIVATE_RESUMES_DIR, randomName);
    if (!newPath) {
      res.status(400).json({ error: 'Invalid file path.' });
      return;
    }

    // Remove previous file safely if it's not a shared seed file
    if (!record.storedFileName.startsWith('seed-')) {
      const oldPath = resolveSafeStoragePath(PRIVATE_RESUMES_DIR, record.storedFileName);
      if (oldPath && fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    fs.writeFileSync(newPath, file.buffer);
    record.originalName = path.basename(file.originalname).slice(0, 140);
    record.storedFileName = randomName;
    record.mimeType = file.mimetype;
    record.sizeBytes = file.size;
    record.updatedAt = new Date().toISOString();
    persistDb();

    const { storedFileName: _hidden, ...safe } = record;
    res.json({ resume: safe, message: 'Resume replaced successfully.' });
  }
);

router.patch(
  '/resumes/:id/default',
  authenticate,
  requireRole('candidate'),
  (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const userResumes = db.resumes.filter((r) => r.candidateUserId === req.user!.id);
    const target = userResumes.find((r) => r.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Resume not found.' });
      return;
    }
    for (const r of userResumes) {
      r.isDefault = r.id === target.id;
    }
    persistDb();
    res.json({ message: 'Default resume updated.' });
  }
);

router.delete(
  '/resumes/:id',
  authenticate,
  requireRole('candidate'),
  (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const idx = db.resumes.findIndex(
      (r) => r.id === req.params.id && r.candidateUserId === req.user!.id
    );
    if (idx === -1) {
      res.status(404).json({ error: 'Resume not found.' });
      return;
    }
    const [removed] = db.resumes.splice(idx, 1);
    if (!removed.storedFileName.startsWith('seed-')) {
      const targetPath = resolveSafeStoragePath(PRIVATE_RESUMES_DIR, removed.storedFileName);
      if (targetPath && fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
    }
    if (removed.isDefault) {
      const next = db.resumes.find((r) => r.candidateUserId === req.user!.id);
      if (next) next.isDefault = true;
    }
    persistDb();
    res.json({ message: 'Resume deleted.' });
  }
);

// Authorized Resume Download (Candidate owner, Authorized Employer for an applicant, or Super Admin)
router.get('/resumes/:id/download', authenticate, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const resume = db.resumes.find((r) => r.id === req.params.id);
  if (!resume) {
    res.status(404).json({ error: 'Resume not found.' });
    return;
  }

  const user = req.user!;
  let authorized = false;

  if (user.role === 'super_admin') {
    authorized = true;
  } else if (user.role === 'candidate' && resume.candidateUserId === user.id) {
    authorized = true;
  } else if (user.role === 'employer') {
    const employerProfile = db.employerProfiles.find((ep) => ep.userId === user.id);
    const ownedCompanyIds = new Set(
      db.companies
        .filter((c) => c.ownerUserId === user.id || c.id === employerProfile?.companyId)
        .map((c) => c.id)
    );
    authorized = db.applications.some(
      (app) => app.resumeId === resume.id && ownedCompanyIds.has(app.companyId)
    );
  }

  if (!authorized) {
    res.status(403).json({ error: 'You are not authorized to access this private resume.' });
    return;
  }

  const filePath = resolveSafeStoragePath(PRIVATE_RESUMES_DIR, resume.storedFileName);
  if (!filePath || !fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Resume file is unavailable in private storage.' });
    return;
  }

  res.setHeader('Content-Type', resume.mimeType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${resume.originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}"`
  );
  res.setHeader('Cache-Control', 'private, no-store');
  res.sendFile(filePath);
});

// Applications: List, Submit, Withdraw
router.get(
  '/applications',
  authenticate,
  requireRole('candidate'),
  (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const userId = req.user!.id;
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : 'all';

    let apps = db.applications.filter((a) => a.candidateUserId === userId);
    if (statusFilter !== 'all') {
      apps = apps.filter((a) => a.status === statusFilter);
    }

    const hydrated = apps
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .map((app) => {
        const job = db.jobs.find((j) => j.id === app.jobId);
        const company = db.companies.find((c) => c.id === app.companyId);
        const resume = db.resumes.find((r) => r.id === app.resumeId);
        const interviews = db.interviews.filter((iv) => iv.applicationId === app.id);
        return {
          ...redactApplicationForCandidate(app),
          jobTitle: job?.title || 'Job Posting',
          jobLocation: job?.location || '',
          workMode: job?.workMode || 'Remote',
          employmentType: job?.employmentType || 'Full-time',
          salaryMin: job?.salaryMin || 0,
          salaryMax: job?.salaryMax || 0,
          companyName: company?.name || 'Company',
          resumeName: resume?.originalName || 'Resume',
          interviews,
          canWithdraw: canWithdrawApplication(app.status),
        };
      });

    res.json({ applications: hydrated });
  }
);

router.post(
  '/applications',
  authenticate,
  requireRole('candidate'),
  (req: AuthenticatedRequest, res) => {
    const parsed = applicationSubmitSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid application data' });
      return;
    }

    const db = getDb();
    const user = req.user!;
    const { jobId, resumeId, coverLetter, screeningAnswers } = parsed.data;

    const job = db.jobs.find((j) => j.id === jobId);
    if (!job) {
      res.status(404).json({ error: 'Job posting not found.' });
      return;
    }

    const eligibility = checkApplicationEligibility(job, db.applications, user.id);
    if (!eligibility.allowed) {
      res.status(409).json({ error: eligibility.reason });
      return;
    }

    const resume = db.resumes.find((r) => r.id === resumeId && r.candidateUserId === user.id);
    if (!resume) {
      res.status(400).json({ error: 'Selected resume was not found in your account.' });
      return;
    }

    // Validate required screening questions
    for (const q of job.screeningQuestions) {
      if (q.required) {
        const match = screeningAnswers.find((a) => a.questionId === q.id);
        if (!match || !match.answer.trim()) {
          res.status(400).json({ error: `Please answer required question: "${q.question}"` });
          return;
        }
      }
    }

    const now = new Date().toISOString();
    const application = {
      id: `app-${crypto.randomUUID().slice(0, 8)}`,
      jobId: job.id,
      companyId: job.companyId,
      candidateUserId: user.id,
      resumeId: resume.id,
      coverLetter: coverLetter || '',
      screeningAnswers,
      status: 'submitted' as const,
      internalNotes: [],
      timeline: [{ status: 'submitted' as const, note: 'Application submitted by candidate', timestamp: now }],
      submittedAt: now,
      updatedAt: now,
    };

    db.applications.unshift(application);
    persistDb();

    // Notify employer in real-time
    createAndPushNotification({
      userId: job.employerUserId,
      type: 'application_submitted',
      title: `New Application — ${job.title}`,
      message: `${user.name} applied for ${job.title}.`,
      link: '/dashboard/employer/ats',
    });

    // Confirm to candidate
    createAndPushNotification({
      userId: user.id,
      type: 'application_submitted',
      title: `Application Confirmed — ${job.title}`,
      message: `Your application for ${job.title} has been submitted successfully.`,
      link: '/dashboard/candidate/applications',
    });

    appendAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'APPLICATION_SUBMITTED',
      resourceType: 'Application',
      resourceId: application.id,
      details: `Candidate submitted application for job ${job.title}.`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      application: redactApplicationForCandidate(application),
      message: 'Application submitted successfully.',
    });
  }
);

router.patch(
  '/applications/:id/withdraw',
  authenticate,
  requireRole('candidate'),
  (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const app = db.applications.find(
      (a) => a.id === req.params.id && a.candidateUserId === req.user!.id
    );
    if (!app) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }
    if (!canWithdrawApplication(app.status)) {
      res.status(400).json({ error: 'This application can no longer be withdrawn.' });
      return;
    }

    const now = new Date().toISOString();
    app.status = 'withdrawn';
    app.updatedAt = now;
    app.timeline.push({ status: 'withdrawn', note: 'Withdrawn by candidate', timestamp: now });
    persistDb();

    res.json({
      application: redactApplicationForCandidate(app),
      message: 'Application withdrawn.',
    });
  }
);

export default router;
