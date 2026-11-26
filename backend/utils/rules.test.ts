import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import {
  calculateProfileCompletion,
  canWithdrawApplication,
  checkApplicationEligibility,
  checkInterviewConflict,
  filterAndPaginateJobs,
  isAllowedOrigin,
  isSafeHttpUrl,
  isUnsafeUrlScheme,
  redactApplicationForCandidate,
  resolveSafeStoragePath,
  sanitizeNoSqlInput,
  validateResumeFile,
} from './rules';
import type {
  ApplicationRecord,
  CandidateProfileRecord,
  CompanyRecord,
  InterviewRecord,
  JobRecord,
} from '../types';

test('calculateProfileCompletion returns accurate percentage and actionable suggestions', () => {
  const partial: CandidateProfileRecord = {
    id: 'cp1',
    userId: 'u1',
    headline: 'Senior Backend Engineer',
    summary: 'Distributed systems architect focused on resilient Node.js APIs and MongoDB clusters.',
    phone: '+1 415-555-0190',
    location: 'San Francisco, CA',
    yearsOfExperience: 6,
    skills: ['TypeScript', 'Node.js', 'MongoDB'],
    education: [],
    experience: [],
    certifications: [],
    projects: [],
    portfolioLinks: {},
    openToRemote: true,
    updatedAt: new Date().toISOString(),
  };

  const res = calculateProfileCompletion(partial, 1);
  // Headline+Summary(15) + Contact(10) + Skills(15) + Resume(10) = 50%
  assert.equal(res.percentage, 50);
  assert.ok(res.suggestions.some((s) => s.includes('work experience')));
  assert.ok(res.suggestions.some((s) => s.includes('educational')));
});

test('filterAndPaginateJobs filters by keyword, salary, work mode, excludes expired, and sorts properly', () => {
  const now = new Date('2026-11-26T12:00:00Z');
  const companies = new Map<string, CompanyRecord>([
    [
      'c1',
      {
        id: 'c1',
        ownerUserId: 'emp1',
        name: 'ApexCloud Systems',
        slug: 'apexcloud',
        industry: 'Cloud Infrastructure',
        size: '201-500',
        headquarters: 'Seattle, WA',
        description: 'Cloud native tooling.',
        verificationStatus: 'verified',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
  ]);

  const baseJob: JobRecord = {
    id: 'j1',
    companyId: 'c1',
    employerUserId: 'emp1',
    title: 'Senior Full-Stack Engineer',
    category: 'Software Development',
    description: 'Build TypeScript microservices and React dashboards.',
    responsibilities: ['Build APIs'],
    qualifications: ['5+ years'],
    requiredSkills: ['TypeScript', 'React', 'Node.js'],
    experienceLevel: 'Senior Level',
    employmentType: 'Full-time',
    salaryMin: 150000,
    salaryMax: 190000,
    salaryCurrency: 'USD',
    location: 'Remote (US)',
    workMode: 'Remote',
    vacancies: 2,
    deadline: '2027-01-15T00:00:00Z',
    educationRequirement: "Bachelor's in CS",
    benefits: ['401k'],
    resumeRequired: true,
    allowReapply: false,
    screeningQuestions: [],
    status: 'published',
    featured: true,
    viewsCount: 20,
    history: [],
    createdAt: '2026-11-20T00:00:00Z',
    updatedAt: '2026-11-20T00:00:00Z',
  };

  const expiredJob: JobRecord = {
    ...baseJob,
    id: 'j2',
    title: 'Expired TypeScript Role',
    deadline: '2026-11-01T00:00:00Z',
  };

  const onsiteHighSalaryJob: JobRecord = {
    ...baseJob,
    id: 'j3',
    title: 'Principal Security Architect',
    category: 'Cybersecurity',
    requiredSkills: ['Zero Trust', 'IAM'],
    salaryMin: 210000,
    salaryMax: 250000,
    workMode: 'On-site',
    location: 'New York, NY',
    createdAt: '2026-11-25T00:00:00Z',
  };

  const remoteSearch = filterAndPaginateJobs(
    [baseJob, expiredJob, onsiteHighSalaryJob],
    companies,
    { q: 'TypeScript', workMode: 'Remote' },
    now
  );
  assert.equal(remoteSearch.total, 1);
  assert.equal(remoteSearch.items[0].id, 'j1');

  const salarySorted = filterAndPaginateJobs(
    [baseJob, expiredJob, onsiteHighSalaryJob],
    companies,
    { sort: 'salary' },
    now
  );
  assert.equal(salarySorted.total, 2);
  assert.equal(salarySorted.items[0].id, 'j3');
});

test('checkApplicationEligibility prevents duplicates, expired deadlines, and respects allowReapply', () => {
  const now = new Date('2026-11-26T12:00:00Z');
  const job: JobRecord = {
    id: 'j1',
    companyId: 'c1',
    employerUserId: 'emp1',
    title: 'Data Engineer',
    category: 'Data Science',
    description: 'Pipelines',
    responsibilities: [],
    qualifications: [],
    requiredSkills: ['Python'],
    experienceLevel: 'Mid Level',
    employmentType: 'Full-time',
    salaryMin: 120000,
    salaryMax: 150000,
    salaryCurrency: 'USD',
    location: 'Austin, TX',
    workMode: 'Hybrid',
    vacancies: 1,
    deadline: '2026-12-31T00:00:00Z',
    educationRequirement: 'BS',
    benefits: [],
    resumeRequired: true,
    allowReapply: false,
    screeningQuestions: [],
    status: 'published',
    featured: false,
    viewsCount: 0,
    history: [],
    createdAt: '2026-11-10T00:00:00Z',
    updatedAt: '2026-11-10T00:00:00Z',
  };

  const existingApp: ApplicationRecord = {
    id: 'a1',
    jobId: 'j1',
    companyId: 'c1',
    candidateUserId: 'cand1',
    resumeId: 'r1',
    screeningAnswers: [],
    status: 'withdrawn',
    internalNotes: [{ id: 'n1', authorId: 'emp1', authorName: 'David', content: 'Strong fit', createdAt: '2026-11-12T00:00:00Z' }],
    timeline: [],
    submittedAt: '2026-11-12T00:00:00Z',
    updatedAt: '2026-11-12T00:00:00Z',
  };

  // Duplicate blocked when allowReapply is false
  assert.equal(checkApplicationEligibility(job, [existingApp], 'cand1', now).allowed, false);
  // Allowed when allowReapply is true and prior was withdrawn
  assert.equal(
    checkApplicationEligibility({ ...job, allowReapply: true }, [existingApp], 'cand1', now).allowed,
    true
  );
  // Expired deadline blocked
  assert.equal(
    checkApplicationEligibility({ ...job, deadline: '2026-11-01T00:00:00Z' }, [], 'cand2', now).allowed,
    false
  );

  // Recruiter internal notes must be redacted from candidate payload
  const redacted = redactApplicationForCandidate(existingApp) as Record<string, unknown>;
  assert.equal('internalNotes' in redacted, false);
  assert.equal(canWithdrawApplication('shortlisted'), true);
  assert.equal(canWithdrawApplication('selected'), false);
});

test('validateResumeFile enforces extension, MIME, magic bytes, and size limits', () => {
  const validPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n');
  assert.equal(validateResumeFile('maya_resume.pdf', 'application/pdf', validPdf).allowed, true);

  const disguisedExe = Buffer.from('MZ\x90\x00executable');
  assert.equal(validateResumeFile('malware.pdf', 'application/pdf', disguisedExe).allowed, false);
  assert.equal(validateResumeFile('script.exe', 'application/octet-stream', disguisedExe).allowed, false);

  const validDocx = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
  assert.equal(
    validateResumeFile(
      'cv.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      validDocx
    ).allowed,
    true
  );
});

test('resolveSafeStoragePath blocks path traversal attempts and sanitizeNoSqlInput strips $ operators', () => {
  const baseDir = path.resolve('/tmp/private_resumes');
  assert.equal(resolveSafeStoragePath(baseDir, '../../../etc/passwd'), null);
  assert.equal(resolveSafeStoragePath(baseDir, 'nested/file.pdf'), null);
  const valid = resolveSafeStoragePath(baseDir, 'abc-123.pdf');
  assert.ok(valid && valid.startsWith(baseDir + path.sep));

  const cleaned = sanitizeNoSqlInput({
    email: 'user@test.com',
    $gt: '',
    nested: { 'a.b': 1, safe: 'ok', $where: '1==1' },
  });
  assert.deepEqual(cleaned, { email: 'user@test.com', nested: { safe: 'ok' } });
});

test('checkInterviewConflict prevents duplicate slot scheduling', () => {
  const interviews: InterviewRecord[] = [
    {
      id: 'iv1',
      applicationId: 'app1',
      jobId: 'j1',
      companyId: 'c1',
      candidateUserId: 'cand1',
      employerUserId: 'emp1',
      date: '2026-12-04',
      time: '14:00',
      durationMinutes: 45,
      type: 'Video',
      locationOrLink: 'https://meet.vanguardhire.io/room-1',
      status: 'scheduled',
      createdAt: '2026-11-26T00:00:00Z',
      updatedAt: '2026-11-26T00:00:00Z',
    },
  ];
  assert.equal(checkInterviewConflict(interviews, 'app1', '2026-12-04', '14:00').allowed, false);
  assert.equal(checkInterviewConflict(interviews, 'app1', '2026-12-04', '16:00').allowed, true);
});

test('isAllowedOrigin enforces strict URL hostname matching and blocks spoofed origins', () => {
  assert.equal(isAllowedOrigin('http://localhost:3000'), true);
  assert.equal(isAllowedOrigin('https://demo-app.asia-east1.run.app'), true);
  assert.equal(isAllowedOrigin('https://portal.example.com', ['https://portal.example.com']), true);

  // Spoofed prefix/suffix & plain HTTP cloud origins must be rejected
  assert.equal(isAllowedOrigin('http://localhost:3000.evil.com'), false);
  assert.equal(isAllowedOrigin('https://evil.com'), false);
  assert.equal(isAllowedOrigin('http://spoofed.run.app'), false);
  assert.equal(isAllowedOrigin('javascript:alert(1)'), false);
});

test('isSafeHttpUrl and isUnsafeUrlScheme block script/data URLs and validateResumeFile honors custom max size', () => {
  assert.equal(isSafeHttpUrl('https://meet.vanguardhire.io/panel-1'), true);
  assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
  assert.equal(isSafeHttpUrl('http:malformed'), false);
  assert.equal(isUnsafeUrlScheme('javascript:alert(1)'), true);
  assert.equal(isUnsafeUrlScheme('data:text/html,<script>alert(1)</script>'), true);
  assert.equal(isUnsafeUrlScheme('Conference Room 4B, HQ'), false);

  const twoMbPdf = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(2 * 1024 * 1024)]);
  assert.equal(validateResumeFile('cv.pdf', 'application/pdf', twoMbPdf, 1 * 1024 * 1024).allowed, false);
  assert.equal(validateResumeFile('cv.pdf', 'application/pdf', twoMbPdf, 3 * 1024 * 1024).allowed, true);
});
