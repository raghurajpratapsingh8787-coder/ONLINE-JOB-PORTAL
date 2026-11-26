import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import type { PortalDatabase, AuditLogRecord, UserRole } from '../types';

export const DATA_DIR = path.resolve(process.cwd(), 'backend/data');
export const DB_FILE = path.join(DATA_DIR, 'portal-db.json');
export const PRIVATE_RESUMES_DIR = path.resolve(process.cwd(), 'backend/private_uploads/resumes');
export const PUBLIC_LOGOS_DIR = path.resolve(process.cwd(), 'backend/public_uploads/logos');

function ensureDirectories(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(PRIVATE_RESUMES_DIR, { recursive: true });
  fs.mkdirSync(PUBLIC_LOGOS_DIR, { recursive: true });
}

function createMinimalValidPdf(title: string, bodyLines: string[]): Buffer {
  const safeText = (s: string) => s.replace(/[()\\]/g, '');
  const streamLines = [
    'BT',
    '/F1 16 Tf',
    '50 750 Td',
    `(${safeText(title)}) Tj`,
    '/F1 11 Tf',
    ...bodyLines.map((line, idx) => `0 ${idx === 0 ? -28 : -18} Td (${safeText(line)}) Tj`),
    'ET',
  ].join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(streamLines, 'utf8')} >>\nstream\n${streamLines}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8');
}

function seedSampleResumes(): void {
  ensureDirectories();
  const sampleFiles: { file: string; title: string; lines: string[] }[] = [
    {
      file: 'seed-maya-lin-resume.pdf',
      title: 'Maya Lin - Senior Full-Stack Software Engineer',
      lines: [
        'Email: maya.lin@candidate.io | San Francisco, CA | 6+ Years Experience',
        'Skills: TypeScript, React, Node.js, PostgreSQL, MongoDB, AWS, GraphQL, Docker',
        'Experience: Senior Software Engineer at CloudScale Labs (2023 - Present)',
        'Experience: Full-Stack Engineer at Veridian Systems (2020 - 2023)',
        'Education: B.S. Computer Science, University of California, Berkeley',
      ],
    },
    {
      file: 'seed-arjun-mehta-resume.pdf',
      title: 'Arjun Mehta - Applied Machine Learning Engineer',
      lines: [
        'Email: arjun.mehta@candidate.io | Bengaluru / Remote | 5 Years Experience',
        'Skills: Python, PyTorch, Kubernetes, MLflow, SQL, Spark, Distributed Training',
        'Experience: ML Engineer at QuantEdge Analytics (2022 - Present)',
        'Education: M.Tech Artificial Intelligence, IIT Delhi',
      ],
    },
    {
      file: 'seed-elena-rostova-resume.pdf',
      title: 'Elena Rostova - Principal Product Designer',
      lines: [
        'Email: elena.rostova@candidate.io | London, UK / Hybrid | 7 Years Experience',
        'Skills: Design Systems, Figma, User Research, Prototyping, Accessibility WCAG AA',
        'Experience: Staff Product Designer at Northstar FinTech (2021 - Present)',
        'Education: B.A. Interaction Design, University of the Arts London',
      ],
    },
  ];

  for (const item of sampleFiles) {
    const dest = path.join(PRIVATE_RESUMES_DIR, item.file);
    if (!fs.existsSync(dest)) {
      fs.writeFileSync(dest, createMinimalValidPdf(item.title, item.lines));
    }
  }
}

export function buildInitialSeedData(): PortalDatabase {
  seedSampleResumes();
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@1234';
  const adminHash = bcrypt.hashSync(adminPassword, 10);
  const employerHash = bcrypt.hashSync('Employer@1234', 10);
  const candidateHash = bcrypt.hashSync('Candidate@1234', 10);

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
  const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000).toISOString();

  const categories = [
    { id: 'cat-1', name: 'Software Development', slug: 'software-development', description: 'Backend, distributed systems, mobile, and platform engineering roles.', active: true, createdAt: daysAgo(120) },
    { id: 'cat-2', name: 'Data Science', slug: 'data-science', description: 'Analytics engineering, experimentation, and predictive modeling.', active: true, createdAt: daysAgo(120) },
    { id: 'cat-3', name: 'Artificial Intelligence', slug: 'artificial-intelligence', description: 'Machine learning infrastructure, applied research, and MLOps.', active: true, createdAt: daysAgo(120) },
    { id: 'cat-4', name: 'Cybersecurity', slug: 'cybersecurity', description: 'Application security, cloud IAM, threat detection, and compliance.', active: true, createdAt: daysAgo(120) },
    { id: 'cat-5', name: 'Web Development', slug: 'web-development', description: 'Frontend architecture, React/TypeScript ecosystems, and web performance.', active: true, createdAt: daysAgo(120) },
    { id: 'cat-6', name: 'Digital Marketing', slug: 'digital-marketing', description: 'Growth marketing, demand generation, SEO, and lifecycle analytics.', active: true, createdAt: daysAgo(120) },
    { id: 'cat-7', name: 'Finance', slug: 'finance', description: 'FP&A, treasury operations, quantitative risk, and corporate finance.', active: true, createdAt: daysAgo(120) },
    { id: 'cat-8', name: 'Human Resources', slug: 'human-resources', description: 'Talent acquisition, people operations, total rewards, and L&D.', active: true, createdAt: daysAgo(120) },
    { id: 'cat-9', name: 'Sales', slug: 'sales', description: 'Enterprise account executives, solutions engineering, and partnerships.', active: true, createdAt: daysAgo(120) },
    { id: 'cat-10', name: 'Design', slug: 'design', description: 'Product design, UX research, brand systems, and interaction design.', active: true, createdAt: daysAgo(120) },
    { id: 'cat-11', name: 'Engineering', slug: 'engineering', description: 'Hardware, robotics, embedded firmware, and systems reliability.', active: true, createdAt: daysAgo(120) },
    { id: 'cat-12', name: 'Other', slug: 'other', description: 'Operations, legal counsel, program management, and executive staff.', active: true, createdAt: daysAgo(120) },
  ];

  const users: PortalDatabase['users'] = [
    {
      id: 'usr-admin-1',
      name: 'Raghuraj Pratap Singh',
      email: 'raghurajpratapsingh8787@gmail.com',
      passwordHash: adminHash,
      role: 'super_admin',
      status: 'active',
      emailVerified: true,
      avatarUrl: '/src/assets/images/avatar_admin_rajput_1795709933820.jpg',
      refreshTokenHashes: [],
      notificationPrefs: { emailApplications: true, emailInterviews: true, emailJobAlerts: true },
      createdAt: daysAgo(150),
      updatedAt: daysAgo(1),
    },
    {
      id: 'usr-emp-1',
      name: 'David Chen',
      email: 'recruiter@apexcloud.io',
      passwordHash: employerHash,
      role: 'employer',
      status: 'active',
      emailVerified: true,
      avatarUrl: '/src/assets/images/avatar_recruiter_david_1795709932968.jpg',
      refreshTokenHashes: [],
      notificationPrefs: { emailApplications: true, emailInterviews: true, emailJobAlerts: true },
      createdAt: daysAgo(95),
      updatedAt: daysAgo(2),
    },
    {
      id: 'usr-emp-2',
      name: 'Claire Bennett',
      email: 'talent@meridianfin.com',
      passwordHash: employerHash,
      role: 'employer',
      status: 'active',
      emailVerified: true,
      refreshTokenHashes: [],
      notificationPrefs: { emailApplications: true, emailInterviews: true, emailJobAlerts: false },
      createdAt: daysAgo(80),
      updatedAt: daysAgo(4),
    },
    {
      id: 'usr-emp-3',
      name: 'Marcus Vance',
      email: 'hr@heliosrobotics.ai',
      passwordHash: employerHash,
      role: 'employer',
      status: 'active',
      emailVerified: true,
      refreshTokenHashes: [],
      notificationPrefs: { emailApplications: true, emailInterviews: true, emailJobAlerts: true },
      createdAt: daysAgo(25),
      updatedAt: daysAgo(1),
    },
    {
      id: 'usr-cand-1',
      name: 'Maya Lin',
      email: 'maya.lin@candidate.io',
      passwordHash: candidateHash,
      role: 'candidate',
      status: 'active',
      emailVerified: true,
      avatarUrl: '/src/assets/images/avatar_candidate_maya_1795709934680.jpg',
      refreshTokenHashes: [],
      notificationPrefs: { emailApplications: true, emailInterviews: true, emailJobAlerts: true },
      createdAt: daysAgo(62),
      updatedAt: daysAgo(1),
    },
    {
      id: 'usr-cand-2',
      name: 'Arjun Mehta',
      email: 'arjun.mehta@candidate.io',
      passwordHash: candidateHash,
      role: 'candidate',
      status: 'active',
      emailVerified: true,
      refreshTokenHashes: [],
      notificationPrefs: { emailApplications: true, emailInterviews: true, emailJobAlerts: true },
      createdAt: daysAgo(45),
      updatedAt: daysAgo(3),
    },
    {
      id: 'usr-cand-3',
      name: 'Elena Rostova',
      email: 'elena.rostova@candidate.io',
      passwordHash: candidateHash,
      role: 'candidate',
      status: 'active',
      emailVerified: true,
      refreshTokenHashes: [],
      notificationPrefs: { emailApplications: true, emailInterviews: true, emailJobAlerts: false },
      createdAt: daysAgo(18),
      updatedAt: daysAgo(2),
    },
  ];

  const companies: PortalDatabase['companies'] = [
    {
      id: 'comp-1',
      ownerUserId: 'usr-emp-1',
      name: 'ApexCloud Systems',
      slug: 'apexcloud-systems',
      website: 'https://apexcloud.example.com',
      industry: 'Cloud Infrastructure',
      size: '201-500 employees',
      foundedYear: 2019,
      headquarters: 'San Francisco, CA',
      description: 'ApexCloud builds globally distributed edge compute, observability pipelines, and developer infrastructure trusted by enterprise engineering teams across 34 regions.',
      verificationStatus: 'verified',
      verifiedAt: daysAgo(90),
      createdAt: daysAgo(95),
      updatedAt: daysAgo(3),
    },
    {
      id: 'comp-2',
      ownerUserId: 'usr-emp-2',
      name: 'Meridian Financial Labs',
      slug: 'meridian-financial-labs',
      website: 'https://meridianfin.example.com',
      industry: 'Financial Technology',
      size: '501-1,000 employees',
      foundedYear: 2017,
      headquarters: 'New York, NY',
      description: 'Institutional treasury automation, real-time clearing rails, and regulatory compliance analytics built for modern capital markets.',
      verificationStatus: 'verified',
      verifiedAt: daysAgo(76),
      createdAt: daysAgo(80),
      updatedAt: daysAgo(5),
    },
    {
      id: 'comp-3',
      ownerUserId: 'usr-emp-3',
      name: 'Helios Robotics',
      slug: 'helios-robotics',
      website: 'https://heliosrobotics.example.com',
      industry: 'Autonomous Systems',
      size: '51-200 employees',
      foundedYear: 2022,
      headquarters: 'Austin, TX',
      description: 'Autonomous warehouse perception, fleet orchestration software, and precision actuator systems for high-throughput logistics hubs.',
      verificationStatus: 'pending',
      verifiedAt: null,
      createdAt: daysAgo(25),
      updatedAt: daysAgo(1),
    },
    {
      id: 'comp-4',
      ownerUserId: 'usr-emp-1',
      name: 'CipherShield Security',
      slug: 'ciphershield-security',
      website: 'https://ciphershield.example.com',
      industry: 'Cybersecurity',
      size: '101-250 employees',
      foundedYear: 2020,
      headquarters: 'Seattle, WA',
      description: 'Zero-trust identity governance, automated cloud posture management, and runtime threat containment for regulated industries.',
      verificationStatus: 'verified',
      verifiedAt: daysAgo(60),
      createdAt: daysAgo(65),
      updatedAt: daysAgo(4),
    },
    {
      id: 'comp-5',
      ownerUserId: 'usr-emp-2',
      name: 'Lumina Design Studio',
      slug: 'lumina-design-studio',
      website: 'https://luminadesign.example.com',
      industry: 'Design & Digital Product',
      size: '51-200 employees',
      foundedYear: 2018,
      headquarters: 'London, UK',
      description: 'Multidisciplinary product design and front-end engineering consultancy partnering with category-leading SaaS and healthcare platforms.',
      verificationStatus: 'verified',
      verifiedAt: daysAgo(50),
      createdAt: daysAgo(55),
      updatedAt: daysAgo(2),
    },
  ];

  const employerProfiles: PortalDatabase['employerProfiles'] = [
    {
      id: 'ep-1',
      userId: 'usr-emp-1',
      companyId: 'comp-1',
      jobTitle: 'Director of Engineering Talent',
      department: 'Engineering Recruiting',
      phone: '+1 415-555-0142',
      createdAt: daysAgo(95),
      updatedAt: daysAgo(2),
    },
    {
      id: 'ep-2',
      userId: 'usr-emp-2',
      companyId: 'comp-2',
      jobTitle: 'Head of People Acquisition',
      department: 'Talent Operations',
      phone: '+1 212-555-0188',
      createdAt: daysAgo(80),
      updatedAt: daysAgo(4),
    },
    {
      id: 'ep-3',
      userId: 'usr-emp-3',
      companyId: 'comp-3',
      jobTitle: 'Technical Recruiter',
      department: 'Robotics & AI Hiring',
      phone: '+1 512-555-0174',
      createdAt: daysAgo(25),
      updatedAt: daysAgo(1),
    },
  ];

  const candidateProfiles: PortalDatabase['candidateProfiles'] = [
    {
      id: 'cp-1',
      userId: 'usr-cand-1',
      headline: 'Senior Full-Stack Engineer · TypeScript, React & Distributed Systems',
      summary:
        'Product-minded full-stack software engineer with 6+ years building low-latency web platforms, secure multi-tenant APIs, and design-system architecture for B2B cloud products.',
      phone: '+1 415-555-0192',
      location: 'San Francisco, CA',
      yearsOfExperience: 6,
      expectedSalaryMin: 165000,
      expectedSalaryMax: 205000,
      skills: ['TypeScript', 'React', 'Node.js', 'MongoDB', 'PostgreSQL', 'AWS', 'GraphQL', 'Docker'],
      education: [
        {
          id: 'edu-1',
          institution: 'University of California, Berkeley',
          degree: 'Bachelor of Science',
          fieldOfStudy: 'Computer Science',
          startYear: '2016',
          endYear: '2020',
          grade: '3.88 GPA',
        },
      ],
      experience: [
        {
          id: 'exp-1',
          company: 'CloudScale Labs',
          title: 'Senior Full-Stack Engineer',
          location: 'San Francisco, CA',
          startDate: '2023-03',
          endDate: 'Present',
          current: true,
          description:
            'Led frontend and API architecture for real-time telemetry workspace serving 120,000+ monthly active engineers; reduced P95 query latency by 48%.',
        },
        {
          id: 'exp-2',
          company: 'Veridian Systems',
          title: 'Software Engineer II',
          location: 'Seattle, WA',
          startDate: '2020-07',
          endDate: '2023-02',
          current: false,
          description:
            'Built multi-region billing and RBAC authorization services in Node.js, TypeScript, and MongoDB Atlas.',
        },
      ],
      certifications: [
        {
          id: 'cert-1',
          name: 'AWS Certified Solutions Architect – Associate',
          issuer: 'Amazon Web Services',
          issueDate: '2024-06',
          credentialUrl: 'https://aws.amazon.com/certification',
        },
      ],
      projects: [
        {
          id: 'proj-1',
          title: 'EdgeTrace Distributed Profiler',
          description: 'Open-source trace ingestion pipeline and flamegraph visualizer written in TypeScript and Rust.',
          techStack: ['TypeScript', 'React', 'WebSockets', 'ClickHouse'],
          url: 'https://github.com/mayalin/edgetrace',
        },
      ],
      portfolioLinks: {
        website: 'https://mayalin.dev',
        github: 'https://github.com/mayalin',
        linkedin: 'https://linkedin.com/in/mayalin-eng',
      },
      openToRemote: true,
      updatedAt: daysAgo(2),
    },
    {
      id: 'cp-2',
      userId: 'usr-cand-2',
      headline: 'Applied Machine Learning Engineer · Production LLM & Vision Pipelines',
      summary:
        'ML systems engineer specializing in distributed training, model evaluation frameworks, and sub-50ms inference services at enterprise scale.',
      phone: '+91 98100-55192',
      location: 'Bengaluru, India (Remote)',
      yearsOfExperience: 5,
      expectedSalaryMin: 140000,
      expectedSalaryMax: 185000,
      skills: ['Python', 'PyTorch', 'Kubernetes', 'SQL', 'Spark', 'Docker', 'FastAPI'],
      education: [
        {
          id: 'edu-2',
          institution: 'Indian Institute of Technology Delhi',
          degree: 'M.Tech',
          fieldOfStudy: 'Artificial Intelligence',
          startYear: '2019',
          endYear: '2021',
          grade: '9.1 CGPA',
        },
      ],
      experience: [
        {
          id: 'exp-3',
          company: 'QuantEdge Analytics',
          title: 'Machine Learning Engineer',
          location: 'Bengaluru',
          startDate: '2021-08',
          endDate: 'Present',
          current: true,
          description: 'Architected automated feature stores and anomaly detection models processing 4B events/day.',
        },
      ],
      certifications: [],
      projects: [
        {
          id: 'proj-2',
          title: 'TensorBench Serving Profiler',
          description: 'Latency and throughput benchmarking harness for quantized PyTorch models.',
          techStack: ['Python', 'PyTorch', 'CUDA'],
          url: 'https://github.com/arjunmehta/tensorbench',
        },
      ],
      portfolioLinks: {
        github: 'https://github.com/arjunmehta',
        linkedin: 'https://linkedin.com/in/arjunmehta-ml',
      },
      openToRemote: true,
      updatedAt: daysAgo(3),
    },
    {
      id: 'cp-3',
      userId: 'usr-cand-3',
      headline: 'Staff Product Designer · Enterprise Design Systems & FinTech UX',
      summary:
        'Design systems architect and UX researcher focused on complex financial workflows, data-dense analytics interfaces, and WCAG AA accessibility.',
      phone: '+44 20 7946 0921',
      location: 'London, UK',
      yearsOfExperience: 7,
      expectedSalaryMin: 135000,
      expectedSalaryMax: 170000,
      skills: ['Figma', 'Design Systems', 'UX Research', 'Prototyping', 'Accessibility', 'HTML/CSS'],
      education: [
        {
          id: 'edu-3',
          institution: 'University of the Arts London',
          degree: 'B.A. Honours',
          fieldOfStudy: 'Interaction Design',
          startYear: '2015',
          endYear: '2018',
        },
      ],
      experience: [
        {
          id: 'exp-4',
          company: 'Northstar FinTech',
          title: 'Staff Product Designer',
          location: 'London, UK',
          startDate: '2021-04',
          endDate: 'Present',
          current: true,
          description: 'Unified 4 institutional treasury products under a single component library used by 35 engineers.',
        },
      ],
      certifications: [],
      projects: [],
      portfolioLinks: {
        website: 'https://elenarostova.design',
        linkedin: 'https://linkedin.com/in/elenarostova',
      },
      openToRemote: true,
      updatedAt: daysAgo(4),
    },
  ];

  const jobs: PortalDatabase['jobs'] = [
    {
      id: 'job-1',
      companyId: 'comp-1',
      employerUserId: 'usr-emp-1',
      title: 'Senior Full-Stack Platform Engineer',
      category: 'Software Development',
      description:
        'Join ApexCloud core platform engineering to architect our multi-region developer control plane, real-time log ingestion UI, and enterprise RBAC APIs.',
      responsibilities: [
        'Design and ship end-to-end TypeScript services and React control-plane workflows.',
        'Optimize high-throughput MongoDB and Redis data access patterns for sub-50ms reads.',
        'Partner with security engineers on token rotation, audit trails, and zero-trust boundaries.',
        'Mentor engineers through design RFCs and rigorous code reviews.',
      ],
      qualifications: [
        '5+ years of production full-stack experience with TypeScript, React, and Node.js.',
        'Proven track record designing REST APIs, indexing strategies, and distributed caching.',
        'Strong command of web security fundamentals (OWASP Top 10, CSRF, RBAC).',
      ],
      requiredSkills: ['TypeScript', 'React', 'Node.js', 'MongoDB', 'Redis', 'AWS'],
      experienceLevel: 'Senior Level',
      employmentType: 'Full-time',
      salaryMin: 175000,
      salaryMax: 215000,
      salaryCurrency: 'USD',
      location: 'San Francisco, CA',
      workMode: 'Hybrid',
      vacancies: 2,
      deadline: daysFromNow(45),
      educationRequirement: "Bachelor's in Computer Science or equivalent practical experience",
      benefits: ['Comprehensive Health & Dental', 'Equity Package', '$3,500 Learning Budget', '401(k) 5% Match', 'Flexible PTO'],
      resumeRequired: true,
      allowReapply: false,
      screeningQuestions: [
        { id: 'sq-1', question: 'Describe a production API latency bottleneck you resolved.', required: true },
        { id: 'sq-2', question: 'Are you comfortable working hybrid 2 days/week in San Francisco?', required: true },
      ],
      status: 'published',
      featured: true,
      viewsCount: 418,
      history: [{ action: 'Created & Published', actorId: 'usr-emp-1', actorName: 'David Chen', timestamp: daysAgo(5) }],
      createdAt: daysAgo(5),
      updatedAt: daysAgo(2),
    },
    {
      id: 'job-2',
      companyId: 'comp-1',
      employerUserId: 'usr-emp-1',
      title: 'Staff Distributed Systems Engineer',
      category: 'Software Development',
      description:
        'Lead the architecture of our globally replicated edge routing fabric handling 18M requests per second across 34 points of presence.',
      responsibilities: [
        'Own consensus, failover, and regional traffic shedding architecture.',
        'Profile and eliminate tail-latency spikes across Go and Node.js control planes.',
        'Drive technical roadmap across 3 infrastructure squads.',
      ],
      qualifications: [
        '8+ years building distributed infrastructure or cloud networking systems.',
        'Deep familiarity with Kubernetes, Linux networking, and observability stacks.',
      ],
      requiredSkills: ['Go', 'Kubernetes', 'Distributed Systems', 'AWS', 'Terraform'],
      experienceLevel: 'Lead / Staff',
      employmentType: 'Full-time',
      salaryMin: 210000,
      salaryMax: 260000,
      salaryCurrency: 'USD',
      location: 'United States (Remote)',
      workMode: 'Remote',
      vacancies: 1,
      deadline: daysFromNow(60),
      educationRequirement: "Bachelor's or Master's in Computer Science",
      benefits: ['Remote-First Stipend', 'Top-Tier Equity', 'Full Family Healthcare', 'Annual Retreat'],
      resumeRequired: true,
      allowReapply: false,
      screeningQuestions: [
        { id: 'sq-3', question: 'Share an example of a high-availability failover system you architected.', required: true },
      ],
      status: 'published',
      featured: true,
      viewsCount: 312,
      history: [{ action: 'Created & Published', actorId: 'usr-emp-1', actorName: 'David Chen', timestamp: daysAgo(8) }],
      createdAt: daysAgo(8),
      updatedAt: daysAgo(4),
    },
    {
      id: 'job-3',
      companyId: 'comp-2',
      employerUserId: 'usr-emp-2',
      title: 'Senior Quantitative Data Scientist',
      category: 'Data Science',
      description:
        'Develop institutional liquidity forecasting models, real-time fraud scoring pipelines, and causal experimentation tooling for global treasury desks.',
      responsibilities: [
        'Build and validate time-series forecasting models in Python and SQL.',
        'Collaborate with risk leadership to translate model outputs into automated clearing rules.',
        'Establish reproducible model monitoring and drift detection alerts.',
      ],
      qualifications: [
        '4+ years in quantitative data science, FinTech analytics, or risk modeling.',
        'Fluency in Python, SQL, PyTorch/scikit-learn, and statistical inference.',
      ],
      requiredSkills: ['Python', 'SQL', 'Machine Learning', 'Spark', 'Statistics'],
      experienceLevel: 'Senior Level',
      employmentType: 'Full-time',
      salaryMin: 165000,
      salaryMax: 210000,
      salaryCurrency: 'USD',
      location: 'New York, NY',
      workMode: 'Hybrid',
      vacancies: 2,
      deadline: daysFromNow(35),
      educationRequirement: "Master's or PhD in Statistics, Mathematics, CS, or Quantitative Finance",
      benefits: ['Performance Bonus', '401(k) Match', 'Commuter Benefits', 'Comprehensive Medical'],
      resumeRequired: true,
      allowReapply: false,
      screeningQuestions: [
        { id: 'sq-4', question: 'Have you deployed real-time scoring models in regulated financial environments?', required: true },
      ],
      status: 'published',
      featured: true,
      viewsCount: 289,
      history: [{ action: 'Created & Published', actorId: 'usr-emp-2', actorName: 'Claire Bennett', timestamp: daysAgo(3) }],
      createdAt: daysAgo(3),
      updatedAt: daysAgo(1),
    },
    {
      id: 'job-4',
      companyId: 'comp-4',
      employerUserId: 'usr-emp-1',
      title: 'Cloud Security & Zero-Trust Architect',
      category: 'Cybersecurity',
      description:
        'Architect identity-first cloud security controls, automated threat detection rules, and SOC2/ISO27001 guardrails for Fortune 500 enterprises.',
      responsibilities: [
        'Lead threat modeling reviews for authentication, key management, and API gateways.',
        'Build automated IAM least-privilege policies across AWS and GCP.',
        'Partner with customers on incident response architecture.',
      ],
      qualifications: [
        '5+ years in cloud security engineering or application security.',
        'Hands-on expertise with OAuth2/OIDC, KMS, Kubernetes security, and SIEM tooling.',
      ],
      requiredSkills: ['Zero Trust', 'Cloud Security', 'IAM', 'Kubernetes', 'Python'],
      experienceLevel: 'Senior Level',
      employmentType: 'Full-time',
      salaryMin: 180000,
      salaryMax: 225000,
      salaryCurrency: 'USD',
      location: 'Seattle, WA (Remote)',
      workMode: 'Remote',
      vacancies: 2,
      deadline: daysFromNow(50),
      educationRequirement: "Bachelor's in Information Security or equivalent certifications (CISSP/CCSP)",
      benefits: ['100% Remote Flexibility', 'Certification Sponsorship', 'Equity', 'Wellness Allowance'],
      resumeRequired: true,
      allowReapply: true,
      screeningQuestions: [
        { id: 'sq-5', question: 'Which cloud security certifications or threat modeling frameworks do you apply most?', required: false },
      ],
      status: 'published',
      featured: true,
      viewsCount: 254,
      history: [{ action: 'Created & Published', actorId: 'usr-emp-1', actorName: 'David Chen', timestamp: daysAgo(2) }],
      createdAt: daysAgo(2),
      updatedAt: daysAgo(1),
    },
    {
      id: 'job-5',
      companyId: 'comp-5',
      employerUserId: 'usr-emp-2',
      title: 'Lead Product Designer — Enterprise SaaS',
      category: 'Design',
      description:
        'Shape the interaction language and design systems for data-intensive SaaS platforms used by engineering and finance teams worldwide.',
      responsibilities: [
        'Lead end-to-end UX research, wireframing, and high-fidelity prototyping in Figma.',
        'Maintain multi-brand token architecture and WCAG AA accessibility standards.',
        'Pair directly with frontend engineers during implementation sprints.',
      ],
      qualifications: [
        '6+ years designing complex B2B web applications and component libraries.',
        'Portfolio showcasing measurable UX improvements in data-dense workflows.',
      ],
      requiredSkills: ['Figma', 'Design Systems', 'UX Research', 'Prototyping', 'Accessibility'],
      experienceLevel: 'Lead / Staff',
      employmentType: 'Full-time',
      salaryMin: 140000,
      salaryMax: 175000,
      salaryCurrency: 'USD',
      location: 'London, UK / Remote EU',
      workMode: 'Remote',
      vacancies: 1,
      deadline: daysFromNow(40),
      educationRequirement: "Bachelor's in Interaction Design, HCI, or equivalent portfolio",
      benefits: ['Remote Work Budget', '30 Days Paid Holiday', 'Design Conference Stipend'],
      resumeRequired: true,
      allowReapply: false,
      screeningQuestions: [
        { id: 'sq-6', question: 'Please provide a link to your product design portfolio.', required: true },
      ],
      status: 'published',
      featured: false,
      viewsCount: 198,
      history: [{ action: 'Created & Published', actorId: 'usr-emp-2', actorName: 'Claire Bennett', timestamp: daysAgo(4) }],
      createdAt: daysAgo(4),
      updatedAt: daysAgo(2),
    },
    {
      id: 'job-6',
      companyId: 'comp-1',
      employerUserId: 'usr-emp-1',
      title: 'Frontend Architecture Engineer (React & TypeScript)',
      category: 'Web Development',
      description:
        'Build blazing-fast interactive data visualizations, virtualized log tables, and accessible component primitives for our cloud console.',
      responsibilities: [
        'Engineer modular React 19 and TypeScript interfaces with strict type safety.',
        'Establish performance budgets, bundle monitoring, and Playwright regression suites.',
      ],
      qualifications: [
        '3+ years shipping production React, TypeScript, and Tailwind CSS applications.',
        'Deep understanding of browser rendering, state caching, and WebSockets.',
      ],
      requiredSkills: ['React', 'TypeScript', 'Tailwind CSS', 'WebSockets', 'Vite'],
      experienceLevel: 'Mid Level',
      employmentType: 'Full-time',
      salaryMin: 145000,
      salaryMax: 178000,
      salaryCurrency: 'USD',
      location: 'Remote (Global)',
      workMode: 'Remote',
      vacancies: 3,
      deadline: daysFromNow(55),
      educationRequirement: "Bachelor's Degree or equivalent engineering track record",
      benefits: ['Global Remote', 'Home Office Grant', 'Health Coverage', 'Stock Options'],
      resumeRequired: true,
      allowReapply: false,
      screeningQuestions: [],
      status: 'published',
      featured: false,
      viewsCount: 341,
      history: [{ action: 'Created & Published', actorId: 'usr-emp-1', actorName: 'David Chen', timestamp: daysAgo(1) }],
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      id: 'job-7',
      companyId: 'comp-2',
      employerUserId: 'usr-emp-2',
      title: 'Applied AI Infrastructure Engineer',
      category: 'Artificial Intelligence',
      description:
        'Scale GPU inference clusters, evaluation harnesses, and low-latency document extraction pipelines for institutional financial filings.',
      responsibilities: [
        'Deploy and benchmark PyTorch/vLLM inference services on Kubernetes.',
        'Design automated accuracy and latency regression benchmarks.',
      ],
      qualifications: [
        '4+ years in ML infrastructure, MLOps, or distributed Python/Go systems.',
      ],
      requiredSkills: ['Python', 'PyTorch', 'Kubernetes', 'Docker', 'MLOps'],
      experienceLevel: 'Senior Level',
      employmentType: 'Full-time',
      salaryMin: 185000,
      salaryMax: 235000,
      salaryCurrency: 'USD',
      location: 'New York, NY / Remote US',
      workMode: 'Remote',
      vacancies: 2,
      deadline: daysFromNow(38),
      educationRequirement: "Bachelor's or Master's in Computer Science or AI",
      benefits: ['Annual Bonus', 'GPU Compute Stipend', 'Full Health Benefits'],
      resumeRequired: true,
      allowReapply: false,
      screeningQuestions: [],
      status: 'published',
      featured: false,
      viewsCount: 276,
      history: [{ action: 'Created & Published', actorId: 'usr-emp-2', actorName: 'Claire Bennett', timestamp: daysAgo(6) }],
      createdAt: daysAgo(6),
      updatedAt: daysAgo(3),
    },
    {
      id: 'job-8',
      companyId: 'comp-2',
      employerUserId: 'usr-emp-2',
      title: 'Corporate FP&A Manager',
      category: 'Finance',
      description:
        'Own annual operating models, SaaS cohort unit economics, and board-level financial reporting across North America and EMEA.',
      responsibilities: [
        'Lead quarterly forecasting, variance analysis, and department budget reviews.',
        'Partner with sales leadership on ARR capacity and margin optimization.',
      ],
      qualifications: [
        '5+ years in corporate FP&A, investment banking, or SaaS strategic finance.',
      ],
      requiredSkills: ['Financial Modeling', 'SQL', 'Forecasting', 'SaaS Metrics', 'Excel'],
      experienceLevel: 'Senior Level',
      employmentType: 'Full-time',
      salaryMin: 135000,
      salaryMax: 165000,
      salaryCurrency: 'USD',
      location: 'New York, NY',
      workMode: 'On-site',
      vacancies: 1,
      deadline: daysFromNow(30),
      educationRequirement: "Bachelor's in Finance, Economics, or Accounting (MBA/CFA preferred)",
      benefits: ['Performance Bonus', '401(k) Match', 'Catered Lunches', 'Healthcare'],
      resumeRequired: true,
      allowReapply: false,
      screeningQuestions: [],
      status: 'published',
      featured: false,
      viewsCount: 112,
      history: [{ action: 'Created & Published', actorId: 'usr-emp-2', actorName: 'Claire Bennett', timestamp: daysAgo(9) }],
      createdAt: daysAgo(9),
      updatedAt: daysAgo(5),
    },
    {
      id: 'job-9',
      companyId: 'comp-1',
      employerUserId: 'usr-emp-1',
      title: 'Enterprise Account Executive — Cloud Platform',
      category: 'Sales',
      description:
        'Drive net-new enterprise adoption of ApexCloud infrastructure with CTOs, VP Engineering, and platform teams across Fortune 1000 accounts.',
      responsibilities: [
        'Manage full-cycle enterprise deals ($150K–$1M+ ACV) alongside solutions architects.',
        'Build executive relationships and run structured proof-of-value engagements.',
      ],
      qualifications: [
        '5+ years exceeding quota selling developer tools, cloud infrastructure, or security SaaS.',
      ],
      requiredSkills: ['Enterprise Sales', 'MEDDPICC', 'Cloud SaaS', 'Negotiation'],
      experienceLevel: 'Senior Level',
      employmentType: 'Full-time',
      salaryMin: 140000,
      salaryMax: 240000,
      salaryCurrency: 'USD',
      location: 'Austin, TX',
      workMode: 'Hybrid',
      vacancies: 2,
      deadline: daysFromNow(42),
      educationRequirement: "Bachelor's Degree or equivalent enterprise sales record",
      benefits: ['Uncapped Commission', 'Equity', 'President Club', 'Full Benefits'],
      resumeRequired: true,
      allowReapply: false,
      screeningQuestions: [],
      status: 'published',
      featured: false,
      viewsCount: 145,
      history: [{ action: 'Created & Published', actorId: 'usr-emp-1', actorName: 'David Chen', timestamp: daysAgo(7) }],
      createdAt: daysAgo(7),
      updatedAt: daysAgo(3),
    },
    {
      id: 'job-10',
      companyId: 'comp-5',
      employerUserId: 'usr-emp-2',
      title: 'Demand Generation & Growth Marketing Lead',
      category: 'Digital Marketing',
      description:
        'Scale qualified B2B pipeline through content strategy, SEO architecture, paid acquisition attribution, and lifecycle email programs.',
      responsibilities: [
        'Own multi-channel acquisition funnel and CAC-to-LTV optimization.',
        'Design high-converting landing pages and webinar campaigns with product marketing.',
      ],
      qualifications: [
        '4+ years leading B2B SaaS growth marketing or demand generation.',
      ],
      requiredSkills: ['SEO', 'Paid Acquisition', 'Analytics', 'HubSpot', 'Copywriting'],
      experienceLevel: 'Mid Level',
      employmentType: 'Full-time',
      salaryMin: 110000,
      salaryMax: 140000,
      salaryCurrency: 'USD',
      location: 'Remote (US / UK)',
      workMode: 'Remote',
      vacancies: 1,
      deadline: daysFromNow(28),
      educationRequirement: "Bachelor's in Marketing, Business, or related discipline",
      benefits: ['Remote Flexibility', 'Learning Stipend', 'Health Insurance'],
      resumeRequired: true,
      allowReapply: false,
      screeningQuestions: [],
      status: 'published',
      featured: false,
      viewsCount: 129,
      history: [{ action: 'Created & Published', actorId: 'usr-emp-2', actorName: 'Claire Bennett', timestamp: daysAgo(10) }],
      createdAt: daysAgo(10),
      updatedAt: daysAgo(4),
    },
    {
      id: 'job-11',
      companyId: 'comp-1',
      employerUserId: 'usr-emp-1',
      title: 'Technical Recruiting Partner — Engineering',
      category: 'Human Resources',
      description:
        'Partner with engineering VPs to source, evaluate, and close staff-level distributed systems and security engineers.',
      responsibilities: [
        'Own full-lifecycle recruiting workflows, calibration sessions, and offer negotiations.',
        'Optimize structured interview rubrics and candidate experience metrics.',
      ],
      qualifications: [
        '3+ years in technical recruiting for high-growth software or cloud companies.',
      ],
      requiredSkills: ['Technical Sourcing', 'ATS Management', 'Stakeholder Alignment', 'Offer Strategy'],
      experienceLevel: 'Mid Level',
      employmentType: 'Full-time',
      salaryMin: 115000,
      salaryMax: 145000,
      salaryCurrency: 'USD',
      location: 'San Francisco, CA',
      workMode: 'Hybrid',
      vacancies: 1,
      deadline: daysFromNow(33),
      educationRequirement: "Bachelor's Degree preferred",
      benefits: ['Equity', 'Health & Dental', 'Flexible PTO'],
      resumeRequired: true,
      allowReapply: false,
      screeningQuestions: [],
      status: 'published',
      featured: false,
      viewsCount: 94,
      history: [{ action: 'Created & Published', actorId: 'usr-emp-1', actorName: 'David Chen', timestamp: daysAgo(11) }],
      createdAt: daysAgo(11),
      updatedAt: daysAgo(6),
    },
    {
      id: 'job-12',
      companyId: 'comp-3',
      employerUserId: 'usr-emp-3',
      title: 'Robotics Perception & Embedded C++ Engineer',
      category: 'Engineering',
      description:
        'Develop real-time LiDAR/camera sensor fusion and motion planning firmware for autonomous logistics robots.',
      responsibilities: [
        'Implement deterministic C++20 perception modules on embedded Linux hardware.',
        'Validate localization accuracy in physical test facilities and simulation.',
      ],
      qualifications: [
        '3+ years in robotics perception, ROS2, or embedded C++ development.',
      ],
      requiredSkills: ['C++', 'ROS2', 'Computer Vision', 'Embedded Linux', 'SLAM'],
      experienceLevel: 'Mid Level',
      employmentType: 'Full-time',
      salaryMin: 150000,
      salaryMax: 185000,
      salaryCurrency: 'USD',
      location: 'Austin, TX',
      workMode: 'On-site',
      vacancies: 2,
      deadline: daysFromNow(48),
      educationRequirement: "Bachelor's or Master's in Robotics, EE, or Computer Science",
      benefits: ['Relocation Package', 'Equity', 'On-site Lab & Meals'],
      resumeRequired: true,
      allowReapply: false,
      screeningQuestions: [],
      status: 'pending_approval',
      featured: false,
      viewsCount: 0,
      history: [{ action: 'Submitted for Admin Approval', actorId: 'usr-emp-3', actorName: 'Marcus Vance', timestamp: daysAgo(1) }],
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      id: 'job-13',
      companyId: 'comp-4',
      employerUserId: 'usr-emp-1',
      title: 'Junior Software Engineering Intern — Summer Cohort',
      category: 'Software Development',
      description:
        '12-week paid engineering internship building cloud security telemetry pipelines alongside senior mentors.',
      responsibilities: [
        'Deliver a production feature from RFC through automated testing and rollout.',
      ],
      qualifications: [
        'Currently pursuing a B.S. or M.S. in Computer Science or related technical field.',
      ],
      requiredSkills: ['TypeScript', 'Python', 'Git', 'SQL'],
      experienceLevel: 'Entry Level',
      employmentType: 'Internship',
      salaryMin: 65000,
      salaryMax: 85000,
      salaryCurrency: 'USD',
      location: 'Seattle, WA',
      workMode: 'Hybrid',
      vacancies: 4,
      deadline: daysFromNow(70),
      educationRequirement: 'Enrolled in accredited CS/Engineering program',
      benefits: ['Housing Stipend', 'Mentorship Program', 'Full-Time Return Path'],
      resumeRequired: true,
      allowReapply: false,
      screeningQuestions: [],
      status: 'pending_approval',
      featured: false,
      viewsCount: 0,
      history: [{ action: 'Submitted for Admin Approval', actorId: 'usr-emp-1', actorName: 'David Chen', timestamp: daysAgo(0) }],
      createdAt: daysAgo(0),
      updatedAt: daysAgo(0),
    },
  ];

  const resumes: PortalDatabase['resumes'] = [
    {
      id: 'res-1',
      candidateUserId: 'usr-cand-1',
      originalName: 'Maya_Lin_Senior_FullStack_2026.pdf',
      storedFileName: 'seed-maya-lin-resume.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 184320,
      isDefault: true,
      uploadedAt: daysAgo(15),
      updatedAt: daysAgo(15),
    },
    {
      id: 'res-2',
      candidateUserId: 'usr-cand-2',
      originalName: 'Arjun_Mehta_ML_Engineer_CV.pdf',
      storedFileName: 'seed-arjun-mehta-resume.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 152400,
      isDefault: true,
      uploadedAt: daysAgo(20),
      updatedAt: daysAgo(20),
    },
    {
      id: 'res-3',
      candidateUserId: 'usr-cand-3',
      originalName: 'Elena_Rostova_Product_Design_CV.pdf',
      storedFileName: 'seed-elena-rostova-resume.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 168900,
      isDefault: true,
      uploadedAt: daysAgo(10),
      updatedAt: daysAgo(10),
    },
  ];

  const applications: PortalDatabase['applications'] = [
    {
      id: 'app-1',
      jobId: 'job-1',
      companyId: 'comp-1',
      candidateUserId: 'usr-cand-1',
      resumeId: 'res-1',
      coverLetter:
        'I have spent the last six years architecting TypeScript and React cloud control planes and would love to bring that experience to ApexCloud.',
      screeningAnswers: [
        {
          questionId: 'sq-1',
          question: 'Describe a production API latency bottleneck you resolved.',
          answer: 'Replaced N+1 aggregation queries with compound MongoDB indexes and Redis read-through caching, cutting P95 latency from 420ms to 48ms.',
        },
        {
          questionId: 'sq-2',
          question: 'Are you comfortable working hybrid 2 days/week in San Francisco?',
          answer: 'Yes, I am based in San Francisco and enjoy collaborating in person twice a week.',
        },
      ],
      status: 'interview_scheduled',
      internalNotes: [
        {
          id: 'note-1',
          authorId: 'usr-emp-1',
          authorName: 'David Chen',
          content: 'Strong distributed systems fundamentals and clean open-source portfolio. Hiring manager approved fast-track to technical panel.',
          createdAt: daysAgo(2),
        },
      ],
      timeline: [
        { status: 'submitted', note: 'Application submitted by candidate', timestamp: daysAgo(4) },
        { status: 'under_review', note: 'Reviewed by David Chen', timestamp: daysAgo(3) },
        { status: 'shortlisted', note: 'Shortlisted for technical loop', timestamp: daysAgo(2) },
        { status: 'interview_scheduled', note: 'Technical architecture interview scheduled', timestamp: daysAgo(1) },
      ],
      submittedAt: daysAgo(4),
      updatedAt: daysAgo(1),
    },
    {
      id: 'app-2',
      jobId: 'job-4',
      companyId: 'comp-4',
      candidateUserId: 'usr-cand-1',
      resumeId: 'res-1',
      coverLetter: 'Excited about CipherShield zero-trust identity architecture and cloud governance work.',
      screeningAnswers: [],
      status: 'under_review',
      internalNotes: [],
      timeline: [
        { status: 'submitted', note: 'Application submitted by candidate', timestamp: daysAgo(2) },
        { status: 'under_review', note: 'Assigned to security hiring team', timestamp: daysAgo(1) },
      ],
      submittedAt: daysAgo(2),
      updatedAt: daysAgo(1),
    },
    {
      id: 'app-3',
      jobId: 'job-1',
      companyId: 'comp-1',
      candidateUserId: 'usr-cand-2',
      resumeId: 'res-2',
      coverLetter: 'Interested in bringing high-scale data infrastructure expertise to ApexCloud platform.',
      screeningAnswers: [
        {
          questionId: 'sq-1',
          question: 'Describe a production API latency bottleneck you resolved.',
          answer: 'Batched feature-store inference requests using async gRPC workers, improving throughput 4x.',
        },
        {
          questionId: 'sq-2',
          question: 'Are you comfortable working hybrid 2 days/week in San Francisco?',
          answer: 'Open to relocation with visa sponsorship.',
        },
      ],
      status: 'shortlisted',
      internalNotes: [
        {
          id: 'note-2',
          authorId: 'usr-emp-1',
          authorName: 'David Chen',
          content: 'Great systems depth; check relocation timeline during recruiter screen.',
          createdAt: daysAgo(1),
        },
      ],
      timeline: [
        { status: 'submitted', note: 'Application submitted', timestamp: daysAgo(3) },
        { status: 'under_review', note: 'Initial resume review passed', timestamp: daysAgo(2) },
        { status: 'shortlisted', note: 'Moved to shortlist', timestamp: daysAgo(1) },
      ],
      submittedAt: daysAgo(3),
      updatedAt: daysAgo(1),
    },
    {
      id: 'app-4',
      jobId: 'job-5',
      companyId: 'comp-5',
      candidateUserId: 'usr-cand-3',
      resumeId: 'res-3',
      coverLetter: 'My background unifying FinTech design systems aligns directly with Lumina enterprise engagements.',
      screeningAnswers: [
        {
          questionId: 'sq-6',
          question: 'Please provide a link to your product design portfolio.',
          answer: 'https://elenarostova.design',
        },
      ],
      status: 'selected',
      internalNotes: [
        {
          id: 'note-3',
          authorId: 'usr-emp-2',
          authorName: 'Claire Bennett',
          content: 'Unanimous hire decision from design critique panel. Offer accepted.',
          createdAt: daysAgo(1),
        },
      ],
      timeline: [
        { status: 'submitted', timestamp: daysAgo(7) },
        { status: 'shortlisted', timestamp: daysAgo(5) },
        { status: 'interview_scheduled', timestamp: daysAgo(3) },
        { status: 'selected', note: 'Offer extended and accepted', timestamp: daysAgo(1) },
      ],
      submittedAt: daysAgo(7),
      updatedAt: daysAgo(1),
    },
    {
      id: 'app-5',
      jobId: 'job-6',
      companyId: 'comp-1',
      candidateUserId: 'usr-cand-3',
      resumeId: 'res-3',
      coverLetter: 'Applying for Frontend Architecture role to bridge design systems and React engineering.',
      screeningAnswers: [],
      status: 'submitted',
      internalNotes: [],
      timeline: [{ status: 'submitted', timestamp: daysAgo(1) }],
      submittedAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
  ];

  const interviews: PortalDatabase['interviews'] = [
    {
      id: 'iv-1',
      applicationId: 'app-1',
      jobId: 'job-1',
      companyId: 'comp-1',
      candidateUserId: 'usr-cand-1',
      employerUserId: 'usr-emp-1',
      date: daysFromNow(3).slice(0, 10),
      time: '14:30',
      durationMinutes: 60,
      type: 'Video',
      locationOrLink: 'https://meet.vanguardhire.io/apexcloud-panel-481',
      notes: 'System architecture deep-dive with Principal Engineer and Director of Talent. Please have an IDE ready for a 20-minute TypeScript API review.',
      status: 'scheduled',
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
  ];

  const messages: PortalDatabase['messages'] = [
    {
      id: 'msg-1',
      applicationId: 'app-1',
      senderUserId: 'usr-emp-1',
      recipientUserId: 'usr-cand-1',
      body: 'Hi Maya, thank you for applying to the Senior Full-Stack Platform Engineer role at ApexCloud. Our engineering team was impressed with your EdgeTrace work and we have scheduled your technical interview.',
      readAt: daysAgo(1),
      createdAt: daysAgo(1),
    },
    {
      id: 'msg-2',
      applicationId: 'app-1',
      senderUserId: 'usr-cand-1',
      recipientUserId: 'usr-emp-1',
      body: 'Thanks David! I received the calendar details and look forward to speaking with the engineering panel.',
      readAt: null,
      createdAt: daysAgo(0),
    },
  ];

  const notifications: PortalDatabase['notifications'] = [
    {
      id: 'notif-1',
      userId: 'usr-cand-1',
      type: 'interview_scheduled',
      title: 'Interview Scheduled — ApexCloud Systems',
      message: `Your Video interview for Senior Full-Stack Platform Engineer is scheduled for ${daysFromNow(3).slice(0, 10)} at 14:30.`,
      link: '/dashboard/candidate/applications',
      read: false,
      createdAt: daysAgo(1),
    },
    {
      id: 'notif-2',
      userId: 'usr-cand-1',
      type: 'application_viewed',
      title: 'Application Under Review',
      message: 'CipherShield Security moved your Cloud Security & Zero-Trust Architect application to Under Review.',
      link: '/dashboard/candidate/applications',
      read: false,
      createdAt: daysAgo(1),
    },
    {
      id: 'notif-3',
      userId: 'usr-emp-1',
      type: 'application_submitted',
      title: 'New Applicant — Frontend Architecture Engineer',
      message: 'Elena Rostova submitted an application for Frontend Architecture Engineer (React & TypeScript).',
      link: '/dashboard/employer/ats',
      read: false,
      createdAt: daysAgo(1),
    },
    {
      id: 'notif-4',
      userId: 'usr-admin-1',
      type: 'job_match',
      title: '2 Job Postings Awaiting Moderation',
      message: 'Helios Robotics and CipherShield Security submitted new postings for administrative review.',
      link: '/dashboard/admin/moderation',
      read: false,
      createdAt: daysAgo(0),
    },
  ];

  const savedJobs: PortalDatabase['savedJobs'] = [
    { id: 'sj-1', candidateUserId: 'usr-cand-1', jobId: 'job-2', savedAt: daysAgo(2) },
    { id: 'sj-2', candidateUserId: 'usr-cand-1', jobId: 'job-6', savedAt: daysAgo(1) },
  ];

  const savedSearches: PortalDatabase['savedSearches'] = [
    {
      id: 'ss-1',
      candidateUserId: 'usr-cand-1',
      name: 'Remote Senior TypeScript Roles ($150K+)',
      filters: { q: 'TypeScript', workMode: 'Remote', minSalary: 150000 },
      createdAt: daysAgo(5),
    },
  ];

  const companyVerifications: PortalDatabase['companyVerifications'] = [
    {
      id: 'cv-1',
      companyId: 'comp-3',
      submittedByUserId: 'usr-emp-3',
      registrationNumber: 'DE-8841920-HR',
      taxId: 'EIN-84-2910482',
      documentSummary: 'Delaware Certificate of Good Standing, domain DNS verification (heliosrobotics.ai), and corporate EIN confirmation letter.',
      status: 'pending',
      reviewerUserId: null,
      submittedAt: daysAgo(2),
      reviewedAt: null,
    },
  ];

  const complaints: PortalDatabase['complaints'] = [
    {
      id: 'rep-1',
      reporterUserId: 'usr-cand-2',
      reporterEmail: 'arjun.mehta@candidate.io',
      targetType: 'job',
      targetId: 'job-9',
      reason: 'Compensation structure clarification',
      details: 'Please clarify whether the listed salary band includes OTE commission or base salary only.',
      status: 'open',
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
  ];

  const auditLogs: PortalDatabase['auditLogs'] = [
    {
      id: 'aud-1',
      actorUserId: 'usr-admin-1',
      actorEmail: 'raghurajpratapsingh8787@gmail.com',
      actorRole: 'super_admin',
      action: 'COMPANY_VERIFIED',
      resourceType: 'Company',
      resourceId: 'comp-1',
      details: 'Verified employer organization ApexCloud Systems after domain and business registration check.',
      createdAt: daysAgo(90),
    },
    {
      id: 'aud-2',
      actorUserId: 'usr-emp-1',
      actorEmail: 'recruiter@apexcloud.io',
      actorRole: 'employer',
      action: 'JOB_CREATED',
      resourceType: 'Job',
      resourceId: 'job-1',
      details: 'Published job posting: Senior Full-Stack Platform Engineer.',
      createdAt: daysAgo(5),
    },
    {
      id: 'aud-3',
      actorUserId: 'usr-cand-1',
      actorEmail: 'maya.lin@candidate.io',
      actorRole: 'candidate',
      action: 'APPLICATION_SUBMITTED',
      resourceType: 'Application',
      resourceId: 'app-1',
      details: 'Submitted application for Senior Full-Stack Platform Engineer.',
      createdAt: daysAgo(4),
    },
    {
      id: 'aud-4',
      actorUserId: 'usr-emp-1',
      actorEmail: 'recruiter@apexcloud.io',
      actorRole: 'employer',
      action: 'INTERVIEW_SCHEDULED',
      resourceType: 'Interview',
      resourceId: 'iv-1',
      details: 'Scheduled Video interview for application app-1.',
      createdAt: daysAgo(1),
    },
  ];

  return {
    users,
    candidateProfiles,
    employerProfiles,
    companies,
    jobs,
    categories,
    applications,
    resumes,
    savedJobs,
    savedSearches,
    interviews,
    messages,
    notifications,
    companyVerifications,
    auditLogs,
    complaints,
    newsletterSubscribers: [
      { id: 'nl-1', email: 'maya.lin@candidate.io', subscribedAt: daysAgo(14) },
    ],
    platformSettings: {
      requireJobApproval: false,
      allowCandidateRegistration: true,
      allowEmployerRegistration: true,
      maxResumeSizeMb: 5,
      maintenanceNotice: '',
      supportEmail: 'raghurajpratapsingh8787@gmail.com',
      ownerName: 'Raghuraj Pratap Singh',
      ownerEmail: 'raghurajpratapsingh8787@gmail.com',
    },
  };
}

let dbCache: PortalDatabase | null = null;
let mongoConnected = false;

export async function initializeDatabase(): Promise<void> {
  ensureDirectories();
  seedSampleResumes();

  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      mongoConnected = true;
      console.log('[db] Connected to MongoDB Atlas via Mongoose');
    } catch (err) {
      console.warn('[db] MongoDB Atlas connection unavailable, using persistent local store:', (err as Error).message);
    }
  }

  if (!fs.existsSync(DB_FILE)) {
    dbCache = buildInitialSeedData();
    persistDb();
  } else {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      dbCache = JSON.parse(raw) as PortalDatabase;
    } catch {
      dbCache = buildInitialSeedData();
      persistDb();
    }
  }
}

export function isMongoConnected(): boolean {
  return mongoConnected;
}

export function getDb(): PortalDatabase {
  if (!dbCache) {
    ensureDirectories();
    seedSampleResumes();
    if (fs.existsSync(DB_FILE)) {
      dbCache = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) as PortalDatabase;
    } else {
      dbCache = buildInitialSeedData();
      persistDb();
    }
  }
  return dbCache;
}

export function persistDb(): void {
  if (!dbCache) return;
  ensureDirectories();
  const tempPath = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(dbCache, null, 2), 'utf8');
  fs.renameSync(tempPath, DB_FILE);
}

export function resetAndSeedDb(): PortalDatabase {
  dbCache = buildInitialSeedData();
  persistDb();
  return dbCache;
}

export function appendAuditLog(entry: {
  actorUserId: string;
  actorEmail: string;
  actorRole: UserRole | 'system';
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
  ipAddress?: string;
}): AuditLogRecord {
  const db = getDb();
  const record: AuditLogRecord = {
    id: `aud-${crypto.randomUUID().slice(0, 8)}`,
    ...entry,
    createdAt: new Date().toISOString(),
  };
  db.auditLogs.unshift(record);
  // Keep latest 1000 audit entries
  if (db.auditLogs.length > 1000) {
    db.auditLogs.length = 1000;
  }
  persistDb();
  return record;
}
