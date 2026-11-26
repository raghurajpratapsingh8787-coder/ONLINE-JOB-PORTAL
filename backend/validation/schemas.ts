import { z } from 'zod';

const safeHttpUrl = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .refine(
    (val) => !val || /^https?:\/\//i.test(val),
    'URL must start with http:// or https://'
  );

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Enter a valid email address').max(150),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72)
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/[0-9]/, 'Password must include a number'),
  role: z.enum(['candidate', 'employer']),
  companyName: z.string().trim().min(2).max(120).optional(),
  industry: z.string().trim().min(2).max(80).optional(),
  headquarters: z.string().trim().min(2).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(10, 'Invalid reset token'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72)
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/[0-9]/, 'Password must include a number'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72)
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/[0-9]/, 'Password must include a number'),
});

export const candidateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  headline: z.string().trim().max(160),
  summary: z.string().trim().max(2500),
  phone: z.string().trim().max(30),
  location: z.string().trim().max(120),
  yearsOfExperience: z.coerce.number().min(0).max(60),
  expectedSalaryMin: z.coerce.number().min(0).max(2000000).optional(),
  expectedSalaryMax: z.coerce.number().min(0).max(2000000).optional(),
  skills: z.array(z.string().trim().min(1).max(50)).max(30),
  education: z.array(
    z.object({
      id: z.string().min(1),
      institution: z.string().trim().min(1).max(140),
      degree: z.string().trim().min(1).max(120),
      fieldOfStudy: z.string().trim().min(1).max(120),
      startYear: z.string().trim().max(10),
      endYear: z.string().trim().max(20),
      grade: z.string().trim().max(40).optional(),
    })
  ),
  experience: z.array(
    z.object({
      id: z.string().min(1),
      company: z.string().trim().min(1).max(140),
      title: z.string().trim().min(1).max(120),
      location: z.string().trim().max(120),
      startDate: z.string().trim().max(30),
      endDate: z.string().trim().max(30),
      current: z.boolean(),
      description: z.string().trim().max(1500),
    })
  ),
  certifications: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().trim().min(1).max(140),
      issuer: z.string().trim().min(1).max(120),
      issueDate: z.string().trim().max(30),
      credentialUrl: safeHttpUrl,
    })
  ),
  projects: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().trim().min(1).max(140),
      description: z.string().trim().max(1000),
      techStack: z.array(z.string().trim().max(40)).max(15),
      url: safeHttpUrl,
    })
  ),
  portfolioLinks: z.object({
    website: safeHttpUrl,
    github: safeHttpUrl,
    linkedin: safeHttpUrl,
    dribbble: safeHttpUrl,
  }),
  openToRemote: z.boolean(),
});

export const companyProfileSchema = z.object({
  name: z.string().trim().min(2).max(140),
  website: safeHttpUrl,
  industry: z.string().trim().min(2).max(100),
  size: z.string().trim().min(2).max(60),
  foundedYear: z.coerce.number().min(1800).max(2030).optional(),
  headquarters: z.string().trim().min(2).max(120),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(3000),
});

export const companyVerificationSchema = z.object({
  registrationNumber: z.string().trim().min(3).max(80),
  taxId: z.string().trim().max(80).optional(),
  documentSummary: z.string().trim().min(10).max(1000),
});

export const jobPostingSchema = z
  .object({
    title: z.string().trim().min(3, 'Job title must be at least 3 characters').max(140),
    category: z.string().trim().min(2).max(80),
    description: z.string().trim().min(30, 'Job description must be at least 30 characters').max(8000),
    responsibilities: z.array(z.string().trim().min(2).max(400)).min(1),
    qualifications: z.array(z.string().trim().min(2).max(400)).min(1),
    requiredSkills: z.array(z.string().trim().min(1).max(50)).min(1).max(20),
    experienceLevel: z.enum([
      'Entry Level',
      'Mid Level',
      'Senior Level',
      'Lead / Staff',
      'Executive',
    ]),
    employmentType: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance']),
    salaryMin: z.coerce.number().min(1000).max(5000000),
    salaryMax: z.coerce.number().min(1000).max(5000000),
    salaryCurrency: z.string().trim().min(3).max(5).default('USD'),
    location: z.string().trim().min(2).max(120),
    workMode: z.enum(['Remote', 'Hybrid', 'On-site']),
    vacancies: z.coerce.number().int().min(1).max(500),
    deadline: z.string().min(8),
    educationRequirement: z.string().trim().min(2).max(200),
    benefits: z.array(z.string().trim().min(1).max(120)).max(20),
    resumeRequired: z.boolean().default(true),
    allowReapply: z.boolean().default(false),
    screeningQuestions: z
      .array(
        z.object({
          id: z.string().min(1),
          question: z.string().trim().min(3).max(300),
          required: z.boolean(),
        })
      )
      .max(10)
      .default([]),
    status: z.enum(['draft', 'pending_approval', 'published', 'paused', 'closed']).optional(),
  })
  .refine((data) => data.salaryMax >= data.salaryMin, {
    message: 'Maximum salary must be greater than or equal to minimum salary',
    path: ['salaryMax'],
  });

export const applicationSubmitSchema = z.object({
  jobId: z.string().min(1),
  resumeId: z.string().min(1, 'Please select a resume'),
  coverLetter: z.string().trim().max(4000).optional(),
  screeningAnswers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        question: z.string().min(1),
        answer: z.string().trim().max(1500),
      })
    )
    .default([]),
});

export const applicationStatusUpdateSchema = z.object({
  status: z.enum([
    'submitted',
    'under_review',
    'shortlisted',
    'interview_scheduled',
    'selected',
    'rejected',
  ]),
  note: z.string().trim().max(500).optional(),
});

export const internalNoteSchema = z.object({
  content: z.string().trim().min(2, 'Note cannot be empty').max(1500),
});

export const interviewScheduleSchema = z.object({
  applicationId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:mm format'),
  durationMinutes: z.coerce.number().int().min(15).max(240).default(45),
  type: z.enum(['Video', 'Phone', 'On-site', 'Technical Assessment']),
  locationOrLink: z
    .string()
    .trim()
    .min(3, 'Provide a meeting link or office address')
    .max(300)
    .refine(
      (val) => !/^\s*(javascript|data|vbscript):/i.test(val),
      'Invalid meeting link or location'
    ),
  notes: z.string().trim().max(1000).optional(),
});

export const messageCreateSchema = z.object({
  applicationId: z.string().min(1),
  body: z.string().trim().min(1, 'Message cannot be empty').max(3000),
});

export const savedSearchSchema = z.object({
  name: z.string().trim().min(2).max(100),
  filters: z.object({
    q: z.string().max(100).optional(),
    location: z.string().max(100).optional(),
    category: z.string().max(80).optional(),
    workMode: z.string().max(30).optional(),
    employmentType: z.string().max(30).optional(),
    experienceLevel: z.string().max(40).optional(),
    minSalary: z.coerce.number().min(0).optional(),
  }),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).default(''),
  active: z.boolean().default(true),
});

export const newsletterSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
});

export const complaintSchema = z.object({
  targetType: z.enum(['job', 'company', 'user']),
  targetId: z.string().min(1),
  reason: z.string().trim().min(3).max(120),
  details: z.string().trim().min(10).max(1500),
});
