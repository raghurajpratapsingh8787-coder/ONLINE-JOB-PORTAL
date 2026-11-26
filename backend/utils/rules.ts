import path from 'path';
import type {
  ApplicationRecord,
  ApplicationStatus,
  CandidateProfileRecord,
  CompanyRecord,
  InterviewRecord,
  JobRecord,
} from '../types';

export interface ProfileCompletionResult {
  percentage: number;
  completedSections: string[];
  suggestions: string[];
}

export function calculateProfileCompletion(
  profile: CandidateProfileRecord | null | undefined,
  resumeCount: number
): ProfileCompletionResult {
  if (!profile) {
    return {
      percentage: 0,
      completedSections: [],
      suggestions: ['Complete your headline and summary', 'Upload a resume'],
    };
  }

  const checks: { weight: number; done: boolean; section: string; suggestion: string }[] = [
    {
      weight: 15,
      done: Boolean(profile.headline.trim().length >= 5 && profile.summary.trim().length >= 30),
      section: 'Headline & Summary',
      suggestion: 'Add a clear professional headline and bio summary (30+ characters)',
    },
    {
      weight: 10,
      done: Boolean(profile.location.trim() && profile.phone.trim()),
      section: 'Contact & Location',
      suggestion: 'Add your city/location and phone number',
    },
    {
      weight: 15,
      done: profile.skills.length >= 3,
      section: 'Core Skills',
      suggestion: 'List at least 3 core technical or domain skills',
    },
    {
      weight: 20,
      done: profile.experience.length >= 1,
      section: 'Work Experience',
      suggestion: 'Add at least one work experience entry',
    },
    {
      weight: 15,
      done: profile.education.length >= 1,
      section: 'Education',
      suggestion: 'Add your educational background',
    },
    {
      weight: 10,
      done: profile.projects.length >= 1 || profile.certifications.length >= 1,
      section: 'Projects & Certifications',
      suggestion: 'Showcase a portfolio project or industry certification',
    },
    {
      weight: 5,
      done: Boolean(
        profile.portfolioLinks.github ||
          profile.portfolioLinks.linkedin ||
          profile.portfolioLinks.website
      ),
      section: 'Portfolio Links',
      suggestion: 'Link your GitHub, LinkedIn, or personal portfolio',
    },
    {
      weight: 10,
      done: resumeCount > 0,
      section: 'Resume Uploaded',
      suggestion: 'Upload a PDF or DOCX resume to apply in one click',
    },
  ];

  let percentage = 0;
  const completedSections: string[] = [];
  const suggestions: string[] = [];

  for (const item of checks) {
    if (item.done) {
      percentage += item.weight;
      completedSections.push(item.section);
    } else {
      suggestions.push(item.suggestion);
    }
  }

  return { percentage: Math.min(100, percentage), completedSections, suggestions };
}

export interface JobSearchParams {
  q?: string;
  location?: string;
  category?: string;
  experienceLevel?: string;
  employmentType?: string;
  workMode?: string;
  minSalary?: number;
  maxSalary?: number;
  datePosted?: '24h' | '7d' | '30d' | 'all' | string;
  education?: string;
  companyId?: string;
  sort?: 'newest' | 'salary' | 'relevance' | string;
  page?: number;
  limit?: number;
}

export interface JobSearchResult {
  items: (JobRecord & { companyName: string; relevanceScore: number })[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function filterAndPaginateJobs(
  jobs: JobRecord[],
  companiesById: Map<string, CompanyRecord>,
  params: JobSearchParams,
  now: Date = new Date()
): JobSearchResult {
  const q = (params.q || '').trim().toLowerCase();
  const tokens = q ? q.split(/\s+/).filter(Boolean) : [];
  const loc = (params.location || '').trim().toLowerCase();
  const edu = (params.education || '').trim().toLowerCase();

  const filtered: (JobRecord & { companyName: string; relevanceScore: number })[] = [];

  for (const job of jobs) {
    if (job.status !== 'published') continue;
    // Exclude expired deadline roles from active search
    if (new Date(job.deadline).getTime() < now.getTime()) continue;

    const company = companiesById.get(job.companyId);
    const companyName = company?.name || 'Verified Employer';

    if (params.category && params.category !== 'all' && job.category !== params.category) continue;
    if (
      params.experienceLevel &&
      params.experienceLevel !== 'all' &&
      job.experienceLevel !== params.experienceLevel
    ) {
      continue;
    }
    if (
      params.employmentType &&
      params.employmentType !== 'all' &&
      job.employmentType !== params.employmentType
    ) {
      continue;
    }
    if (params.workMode && params.workMode !== 'all' && job.workMode !== params.workMode) continue;
    if (params.companyId && job.companyId !== params.companyId) continue;

    if (typeof params.minSalary === 'number' && !Number.isNaN(params.minSalary)) {
      if (job.salaryMax < params.minSalary) continue;
    }
    if (typeof params.maxSalary === 'number' && !Number.isNaN(params.maxSalary)) {
      if (job.salaryMin > params.maxSalary) continue;
    }

    if (loc) {
      const matchesLoc =
        job.location.toLowerCase().includes(loc) ||
        (loc === 'remote' && job.workMode === 'Remote');
      if (!matchesLoc) continue;
    }

    if (edu && !job.educationRequirement.toLowerCase().includes(edu)) continue;

    if (params.datePosted && params.datePosted !== 'all') {
      const ageMs = now.getTime() - new Date(job.createdAt).getTime();
      const dayMs = 24 * 60 * 60 * 1000;
      if (params.datePosted === '24h' && ageMs > dayMs) continue;
      if (params.datePosted === '7d' && ageMs > 7 * dayMs) continue;
      if (params.datePosted === '30d' && ageMs > 30 * dayMs) continue;
    }

    let relevanceScore = job.featured ? 5 : 0;
    if (tokens.length > 0) {
      const titleLower = job.title.toLowerCase();
      const companyLower = companyName.toLowerCase();
      const skillsLower = job.requiredSkills.map((s) => s.toLowerCase());
      const descLower = job.description.toLowerCase();
      const catLower = job.category.toLowerCase();

      let matchedAll = true;
      for (const tok of tokens) {
        let tokenScore = 0;
        if (titleLower.includes(tok)) tokenScore += 10;
        if (skillsLower.some((s) => s.includes(tok))) tokenScore += 8;
        if (companyLower.includes(tok)) tokenScore += 7;
        if (catLower.includes(tok)) tokenScore += 5;
        if (descLower.includes(tok)) tokenScore += 2;
        if (tokenScore === 0) {
          matchedAll = false;
          break;
        }
        relevanceScore += tokenScore;
      }
      if (!matchedAll) continue;
    }

    filtered.push({ ...job, companyName, relevanceScore });
  }

  const sortBy = params.sort || (tokens.length > 0 ? 'relevance' : 'newest');
  filtered.sort((a, b) => {
    if (sortBy === 'salary') {
      return b.salaryMax - a.salaryMax || b.salaryMin - a.salaryMin;
    }
    if (sortBy === 'relevance') {
      return (
        b.relevanceScore - a.relevanceScore ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    // newest
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const limit = Math.max(1, Math.min(50, Number(params.limit) || 9));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.max(1, Math.min(totalPages, Number(params.page) || 1));
  const start = (page - 1) * limit;

  return {
    items: filtered.slice(start, start + limit),
    total,
    page,
    limit,
    totalPages,
  };
}

export interface EligibilityCheck {
  allowed: boolean;
  reason?: string;
}

export function checkApplicationEligibility(
  job: JobRecord,
  existingApplications: ApplicationRecord[],
  candidateUserId: string,
  now: Date = new Date()
): EligibilityCheck {
  if (job.status !== 'published') {
    return { allowed: false, reason: 'This job posting is no longer accepting applications.' };
  }
  if (new Date(job.deadline).getTime() < now.getTime()) {
    return { allowed: false, reason: 'The application deadline for this role has passed.' };
  }
  const previous = existingApplications.filter(
    (app) => app.jobId === job.id && app.candidateUserId === candidateUserId
  );
  if (previous.length > 0) {
    const latest = previous[previous.length - 1];
    const canReapply =
      job.allowReapply && (latest.status === 'withdrawn' || latest.status === 'rejected');
    if (!canReapply) {
      return {
        allowed: false,
        reason: 'You have already applied to this position.',
      };
    }
  }
  return { allowed: true };
}

export function checkInterviewConflict(
  existingInterviews: InterviewRecord[],
  applicationId: string,
  date: string,
  time: string
): EligibilityCheck {
  const duplicate = existingInterviews.find(
    (iv) =>
      iv.applicationId === applicationId &&
      iv.status === 'scheduled' &&
      iv.date === date &&
      iv.time === time
  );
  if (duplicate) {
    return {
      allowed: false,
      reason: 'An interview is already scheduled for this candidate at the selected date and time.',
    };
  }
  return { allowed: true };
}

export function redactApplicationForCandidate(
  application: ApplicationRecord
): Omit<ApplicationRecord, 'internalNotes'> {
  const { internalNotes: _redacted, ...safe } = application;
  return safe;
}

export const ALLOWED_RESUME_EXTENSIONS = new Set(['.pdf', '.docx']);
export const ALLOWED_RESUME_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
export const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5MB

export function validateResumeFile(
  originalName: string,
  mimeType: string,
  buffer: Buffer,
  maxBytes: number = MAX_RESUME_BYTES
): EligibilityCheck {
  const ext = path.extname(originalName).toLowerCase();
  if (!ALLOWED_RESUME_EXTENSIONS.has(ext)) {
    return { allowed: false, reason: 'Only PDF and DOCX resume files are accepted.' };
  }
  if (!ALLOWED_RESUME_MIMES.has(mimeType)) {
    return { allowed: false, reason: 'Invalid resume MIME type.' };
  }
  if (!buffer || buffer.length === 0) {
    return { allowed: false, reason: 'Uploaded file is empty.' };
  }
  const effectiveLimit = Math.max(1024 * 1024, Math.min(10 * 1024 * 1024, maxBytes));
  if (buffer.length > effectiveLimit) {
    const limitMb = Math.round(effectiveLimit / (1024 * 1024));
    return { allowed: false, reason: `Resume file exceeds the ${limitMb} MB size limit.` };
  }
  // Magic byte verification to prevent disguised executables
  if (ext === '.pdf') {
    const header = buffer.subarray(0, 5).toString('ascii');
    if (header !== '%PDF-') {
      return { allowed: false, reason: 'File contents do not match a valid PDF signature.' };
    }
  } else if (ext === '.docx') {
    // DOCX is a ZIP container starting with PK\x03\x04
    if (
      buffer.length < 4 ||
      buffer[0] !== 0x50 ||
      buffer[1] !== 0x4b ||
      buffer[2] !== 0x03 ||
      buffer[3] !== 0x04
    ) {
      return { allowed: false, reason: 'File contents do not match a valid DOCX archive.' };
    }
  }
  return { allowed: true };
}

export function resolveSafeStoragePath(baseDir: string, fileName: string): string | null {
  const safeName = path.basename(fileName);
  if (!safeName || safeName !== fileName || safeName.includes('..')) {
    return null;
  }
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, safeName);
  if (!resolvedTarget.startsWith(resolvedBase + path.sep)) {
    return null;
  }
  return resolvedTarget;
}

export function sanitizeNoSqlInput<T>(value: T): T {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeNoSqlInput(item)) as unknown as T;
  }
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    clean[key] = sanitizeNoSqlInput(val);
  }
  return clean as T;
}

export const VALID_WITHDRAWABLE_STATUSES: Set<ApplicationStatus> = new Set([
  'submitted',
  'under_review',
  'shortlisted',
  'interview_scheduled',
]);

export function canWithdrawApplication(status: ApplicationStatus): boolean {
  return VALID_WITHDRAWABLE_STATUSES.has(status);
}

/**
 * Strictly validates browser Origin headers using URL parsing (prevents prefix/suffix host spoofing).
 */
export function isAllowedOrigin(
  origin: string,
  configuredOrigins: (string | undefined)[] = []
): boolean {
  if (!origin) return false;
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  for (const cfg of configuredOrigins) {
    if (!cfg) continue;
    try {
      const allowedUrl = new URL(cfg);
      if (parsed.origin === allowedUrl.origin) return true;
    } catch {
      if (parsed.origin === cfg) return true;
    }
  }

  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
    return true;
  }
  if (parsed.protocol === 'https:' && parsed.hostname.endsWith('.run.app')) {
    return true;
  }
  return false;
}

/**
 * Validates that a user-provided string is a well-formed http:// or https:// URL.
 */
export function isSafeHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const u = new URL(trimmed);
    return (u.protocol === 'http:' || u.protocol === 'https:') && Boolean(u.hostname);
  } catch {
    return false;
  }
}

export function isUnsafeUrlScheme(value: string): boolean {
  return /^\s*(javascript|data|vbscript):/i.test(value);
}
