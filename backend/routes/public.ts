import crypto from 'crypto';
import { Router } from 'express';
import { getDb, persistDb } from '../db/store';
import { authenticate, optionalAuth, type AuthenticatedRequest } from '../middleware/auth';
import { publicCache } from '../utils/cache';
import { checkApplicationEligibility, filterAndPaginateJobs } from '../utils/rules';
import { complaintSchema, newsletterSchema } from '../validation/schemas';

const router = Router();

function enrichJob(jobId: string) {
  const db = getDb();
  const job = db.jobs.find((j) => j.id === jobId);
  if (!job) return null;
  const company = db.companies.find((c) => c.id === job.companyId);
  const applicantsCount = db.applications.filter((a) => a.jobId === job.id).length;
  return {
    ...job,
    company: company
      ? {
          id: company.id,
          name: company.name,
          slug: company.slug,
          logoUrl: company.logoUrl || null,
          industry: company.industry,
          size: company.size,
          headquarters: company.headquarters,
          website: company.website,
          verificationStatus: company.verificationStatus,
          description: company.description,
        }
      : null,
    applicantsCount,
  };
}

router.get('/home', (_req, res) => {
  const cached = publicCache.get<Record<string, unknown>>('public:home');
  if (cached) {
    res.json(cached);
    return;
  }

  const db = getDb();
  const now = Date.now();
  const companiesMap = new Map(db.companies.map((c) => [c.id, c]));
  const activeJobs = db.jobs.filter(
    (j) => j.status === 'published' && new Date(j.deadline).getTime() >= now
  );

  const hydrate = (j: (typeof activeJobs)[number]) => {
    const comp = companiesMap.get(j.companyId);
    return {
      ...j,
      companyName: comp?.name || 'Verified Employer',
      companyLogo: comp?.logoUrl || null,
      companyVerified: comp?.verificationStatus === 'verified',
      companyIndustry: comp?.industry || '',
    };
  };

  const featuredJobs = activeJobs
    .filter((j) => j.featured)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)
    .map(hydrate);

  const recentJobs = [...activeJobs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)
    .map(hydrate);

  const remoteJobs = activeJobs
    .filter((j) => j.workMode === 'Remote')
    .sort((a, b) => b.salaryMax - a.salaryMax)
    .slice(0, 4)
    .map(hydrate);

  const categories = db.categories
    .filter((c) => c.active)
    .map((c) => ({
      ...c,
      openRolesCount: activeJobs.filter((j) => j.category === c.name).length,
    }))
    .sort((a, b) => b.openRolesCount - a.openRolesCount);

  const topCompanies = db.companies
    .filter((c) => c.verificationStatus === 'verified')
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      logoUrl: c.logoUrl || null,
      industry: c.industry,
      size: c.size,
      headquarters: c.headquarters,
      description: c.description,
      verificationStatus: c.verificationStatus,
      openRolesCount: activeJobs.filter((j) => j.companyId === c.id).length,
    }))
    .sort((a, b) => b.openRolesCount - a.openRolesCount);

  const stats = {
    activeJobs: activeJobs.length,
    verifiedCompanies: db.companies.filter((c) => c.verificationStatus === 'verified').length,
    registeredCandidates: db.users.filter((u) => u.role === 'candidate').length,
    placementsCompleted: db.applications.filter((a) => a.status === 'selected').length,
    remoteRoles: activeJobs.filter((j) => j.workMode === 'Remote').length,
  };

  const payload = {
    featuredJobs,
    recentJobs,
    remoteJobs,
    categories,
    topCompanies,
    stats,
    platformOwner: {
      name: db.platformSettings.ownerName,
      email: db.platformSettings.ownerEmail,
    },
  };

  publicCache.set('public:home', payload, 30, ['jobs', 'companies', 'categories']);
  res.json(payload);
});

router.get('/jobs/suggestions', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q || q.length < 2) {
    res.json({ suggestions: [] });
    return;
  }
  const db = getDb();
  const activeJobs = db.jobs.filter((j) => j.status === 'published');
  const set = new Set<string>();

  for (const job of activeJobs) {
    if (job.title.toLowerCase().includes(q)) set.add(job.title);
    for (const skill of job.requiredSkills) {
      if (skill.toLowerCase().includes(q)) set.add(skill);
    }
  }
  for (const comp of db.companies) {
    if (comp.name.toLowerCase().includes(q)) set.add(comp.name);
  }

  res.json({ suggestions: Array.from(set).slice(0, 8) });
});

router.get('/jobs', optionalAuth, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const companiesMap = new Map(db.companies.map((c) => [c.id, c]));

  const params = {
    q: typeof req.query.q === 'string' ? req.query.q : undefined,
    location: typeof req.query.location === 'string' ? req.query.location : undefined,
    category: typeof req.query.category === 'string' ? req.query.category : undefined,
    experienceLevel:
      typeof req.query.experienceLevel === 'string' ? req.query.experienceLevel : undefined,
    employmentType:
      typeof req.query.employmentType === 'string' ? req.query.employmentType : undefined,
    workMode: typeof req.query.workMode === 'string' ? req.query.workMode : undefined,
    minSalary: req.query.minSalary ? Number(req.query.minSalary) : undefined,
    maxSalary: req.query.maxSalary ? Number(req.query.maxSalary) : undefined,
    datePosted: typeof req.query.datePosted === 'string' ? req.query.datePosted : undefined,
    education: typeof req.query.education === 'string' ? req.query.education : undefined,
    companyId: typeof req.query.companyId === 'string' ? req.query.companyId : undefined,
    sort: typeof req.query.sort === 'string' ? req.query.sort : undefined,
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 9,
  };

  const cacheKey = `public:jobs:${JSON.stringify(params)}`;
  let result = publicCache.get<ReturnType<typeof filterAndPaginateJobs>>(cacheKey);
  if (!result) {
    result = filterAndPaginateJobs(db.jobs, companiesMap, params);
    publicCache.set(cacheKey, result, 30, ['jobs', 'companies']);
  }

  const savedSet = req.user
    ? new Set(db.savedJobs.filter((s) => s.candidateUserId === req.user!.id).map((s) => s.jobId))
    : new Set<string>();

  const appliedSet = req.user
    ? new Set(
        db.applications
          .filter((a) => a.candidateUserId === req.user!.id && a.status !== 'withdrawn')
          .map((a) => a.jobId)
      )
    : new Set<string>();

  const items = result.items.map((item) => {
    const comp = companiesMap.get(item.companyId);
    return {
      ...item,
      companyLogo: comp?.logoUrl || null,
      companyVerified: comp?.verificationStatus === 'verified',
      companyIndustry: comp?.industry || '',
      isSaved: savedSet.has(item.id),
      hasApplied: appliedSet.has(item.id),
    };
  });

  res.json({
    ...result,
    items,
  });
});

router.get('/jobs/:id', optionalAuth, (req: AuthenticatedRequest, res) => {
  const db = getDb();
  const job = db.jobs.find((j) => j.id === req.params.id);
  if (!job) {
    res.status(404).json({ error: 'Job posting not found.' });
    return;
  }

  // Only published jobs are visible to public/candidates; owners & admins can view any status
  const isOwnerOrAdmin =
    req.user && (req.user.role === 'super_admin' || job.employerUserId === req.user.id);
  if (job.status !== 'published' && !isOwnerOrAdmin) {
    res.status(404).json({ error: 'Job posting is not publicly available.' });
    return;
  }

  job.viewsCount += 1;
  persistDb();

  const hydrated = enrichJob(job.id);
  const isSaved = req.user
    ? db.savedJobs.some((s) => s.candidateUserId === req.user!.id && s.jobId === job.id)
    : false;
  const eligibility = req.user
    ? checkApplicationEligibility(job, db.applications, req.user.id)
    : { allowed: job.status === 'published' && new Date(job.deadline).getTime() >= Date.now() };

  const similarJobs = db.jobs
    .filter((j) => j.id !== job.id && j.status === 'published' && j.category === job.category)
    .slice(0, 3)
    .map((j) => ({
      id: j.id,
      title: j.title,
      companyName: db.companies.find((c) => c.id === j.companyId)?.name || 'Employer',
      location: j.location,
      workMode: j.workMode,
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      salaryCurrency: j.salaryCurrency,
      employmentType: j.employmentType,
    }));

  res.json({
    job: {
      ...hydrated,
      isSaved,
      eligibility,
    },
    similarJobs,
  });
});

router.get('/companies', (_req, res) => {
  const cached = publicCache.get<unknown>('public:companies');
  if (cached) {
    res.json(cached);
    return;
  }
  const db = getDb();
  const activeJobs = db.jobs.filter((j) => j.status === 'published');
  const companies = db.companies.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    logoUrl: c.logoUrl || null,
    website: c.website,
    industry: c.industry,
    size: c.size,
    foundedYear: c.foundedYear,
    headquarters: c.headquarters,
    description: c.description,
    verificationStatus: c.verificationStatus,
    openRolesCount: activeJobs.filter((j) => j.companyId === c.id).length,
  }));
  const payload = { companies };
  publicCache.set('public:companies', payload, 30, ['companies', 'jobs']);
  res.json(payload);
});

router.get('/companies/:id', (req, res) => {
  const db = getDb();
  const company = db.companies.find((c) => c.id === req.params.id || c.slug === req.params.id);
  if (!company) {
    res.status(404).json({ error: 'Company not found.' });
    return;
  }
  const jobs = db.jobs.filter((j) => j.companyId === company.id && j.status === 'published');
  const { ownerUserId: _hidden, ...publicCompany } = company;
  res.json({ company: publicCompany, jobs });
});

router.get('/categories', (_req, res) => {
  const cached = publicCache.get<unknown>('public:categories');
  if (cached) {
    res.json(cached);
    return;
  }
  const db = getDb();
  const activeJobs = db.jobs.filter((j) => j.status === 'published');
  const categories = db.categories
    .filter((c) => c.active)
    .map((c) => ({
      ...c,
      openRolesCount: activeJobs.filter((j) => j.category === c.name).length,
    }));
  const payload = { categories };
  publicCache.set('public:categories', payload, 30, ['categories', 'jobs']);
  res.json(payload);
});

router.post('/newsletter', (req, res) => {
  const parsed = newsletterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid email address' });
    return;
  }
  const db = getDb();
  const email = parsed.data.email.toLowerCase();
  if (!db.newsletterSubscribers.some((s) => s.email === email)) {
    db.newsletterSubscribers.push({
      id: `nl-${crypto.randomUUID().slice(0, 8)}`,
      email,
      subscribedAt: new Date().toISOString(),
    });
    persistDb();
  }
  res.status(201).json({ message: 'Subscribed to weekly career briefs and curated roles.' });
});

router.post('/complaints', authenticate, (req: AuthenticatedRequest, res) => {
  const parsed = complaintSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid report payload' });
    return;
  }
  const db = getDb();
  const now = new Date().toISOString();
  const report = {
    id: `rep-${crypto.randomUUID().slice(0, 8)}`,
    reporterUserId: req.user!.id,
    reporterEmail: req.user!.email,
    ...parsed.data,
    status: 'open' as const,
    createdAt: now,
    updatedAt: now,
  };
  db.complaints.unshift(report);
  persistDb();
  res.status(201).json({ report, message: 'Report submitted to platform trust & safety team.' });
});

export default router;
