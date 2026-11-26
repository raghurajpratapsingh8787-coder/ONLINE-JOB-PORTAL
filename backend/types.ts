export type UserRole = 'super_admin' | 'employer' | 'candidate';

export type AccountStatus = 'active' | 'suspended' | 'pending_verification';

export type WorkMode = 'Remote' | 'Hybrid' | 'On-site';

export type EmploymentType =
  | 'Full-time'
  | 'Part-time'
  | 'Contract'
  | 'Internship'
  | 'Freelance';

export type ExperienceLevel =
  | 'Entry Level'
  | 'Mid Level'
  | 'Senior Level'
  | 'Lead / Staff'
  | 'Executive';

export type JobStatus =
  | 'draft'
  | 'pending_approval'
  | 'published'
  | 'paused'
  | 'closed'
  | 'expired'
  | 'rejected';

export type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'selected'
  | 'rejected'
  | 'withdrawn';

export type InterviewType = 'Video' | 'Phone' | 'On-site' | 'Technical Assessment';

export type VerificationStatus = 'unsubmitted' | 'pending' | 'verified' | 'rejected';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: AccountStatus;
  emailVerified: boolean;
  emailVerificationToken?: string | null;
  avatarUrl?: string;
  refreshTokenHashes: string[];
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: string | null;
  notificationPrefs: {
    emailApplications: boolean;
    emailInterviews: boolean;
    emailJobAlerts: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
  grade?: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  issueDate: string;
  credentialUrl?: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  url?: string;
}

export interface CandidateProfileRecord {
  id: string;
  userId: string;
  headline: string;
  summary: string;
  phone: string;
  location: string;
  yearsOfExperience: number;
  expectedSalaryMin?: number;
  expectedSalaryMax?: number;
  skills: string[];
  education: EducationItem[];
  experience: ExperienceItem[];
  certifications: CertificationItem[];
  projects: ProjectItem[];
  portfolioLinks: {
    website?: string;
    github?: string;
    linkedin?: string;
    dribbble?: string;
  };
  openToRemote: boolean;
  updatedAt: string;
}

export interface EmployerProfileRecord {
  id: string;
  userId: string;
  companyId: string;
  jobTitle: string;
  department: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyRecord {
  id: string;
  ownerUserId: string;
  name: string;
  slug: string;
  logoUrl?: string;
  website?: string;
  industry: string;
  size: string;
  foundedYear?: number;
  headquarters: string;
  description: string;
  verificationStatus: VerificationStatus;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScreeningQuestion {
  id: string;
  question: string;
  required: boolean;
}

export interface JobHistoryEntry {
  action: string;
  actorId: string;
  actorName: string;
  note?: string;
  timestamp: string;
}

export interface JobRecord {
  id: string;
  companyId: string;
  employerUserId: string;
  title: string;
  category: string;
  description: string;
  responsibilities: string[];
  qualifications: string[];
  requiredSkills: string[];
  experienceLevel: ExperienceLevel;
  employmentType: EmploymentType;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  location: string;
  workMode: WorkMode;
  vacancies: number;
  deadline: string;
  educationRequirement: string;
  benefits: string[];
  resumeRequired: boolean;
  allowReapply: boolean;
  screeningQuestions: ScreeningQuestion[];
  status: JobStatus;
  featured: boolean;
  rejectionReason?: string;
  viewsCount: number;
  history: JobHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface JobCategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  createdAt: string;
}

export interface ResumeRecord {
  id: string;
  candidateUserId: string;
  originalName: string;
  storedFileName: string;
  mimeType: string;
  sizeBytes: number;
  isDefault: boolean;
  uploadedAt: string;
  updatedAt: string;
}

export interface InternalNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface ApplicationTimelineEvent {
  status: ApplicationStatus;
  note?: string;
  timestamp: string;
}

export interface ApplicationRecord {
  id: string;
  jobId: string;
  companyId: string;
  candidateUserId: string;
  resumeId: string;
  coverLetter?: string;
  screeningAnswers: { questionId: string; question: string; answer: string }[];
  status: ApplicationStatus;
  internalNotes: InternalNote[];
  timeline: ApplicationTimelineEvent[];
  submittedAt: string;
  updatedAt: string;
}

export interface SavedJobRecord {
  id: string;
  candidateUserId: string;
  jobId: string;
  savedAt: string;
}

export interface SavedSearchRecord {
  id: string;
  candidateUserId: string;
  name: string;
  filters: {
    q?: string;
    location?: string;
    category?: string;
    workMode?: string;
    employmentType?: string;
    experienceLevel?: string;
    minSalary?: number;
  };
  createdAt: string;
}

export interface InterviewRecord {
  id: string;
  applicationId: string;
  jobId: string;
  companyId: string;
  candidateUserId: string;
  employerUserId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number;
  type: InterviewType;
  locationOrLink: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  createdAt: string;
  updatedAt: string;
}

export interface MessageRecord {
  id: string;
  applicationId: string;
  senderUserId: string;
  recipientUserId: string;
  body: string;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type:
    | 'job_match'
    | 'application_submitted'
    | 'application_viewed'
    | 'shortlisted'
    | 'interview_scheduled'
    | 'application_rejected'
    | 'candidate_selected'
    | 'job_approved'
    | 'job_rejected'
    | 'job_expiring'
    | 'message_received'
    | 'company_verified';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface CompanyVerificationRecord {
  id: string;
  companyId: string;
  submittedByUserId: string;
  registrationNumber: string;
  taxId?: string;
  documentSummary: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewerUserId?: string | null;
  reviewNotes?: string;
  submittedAt: string;
  reviewedAt?: string | null;
}

export interface AuditLogRecord {
  id: string;
  actorUserId: string;
  actorEmail: string;
  actorRole: UserRole | 'system';
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
}

export interface ComplaintReportRecord {
  id: string;
  reporterUserId: string;
  reporterEmail: string;
  targetType: 'job' | 'company' | 'user';
  targetId: string;
  reason: string;
  details: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribedAt: string;
}

export interface PlatformSettings {
  requireJobApproval: boolean;
  allowCandidateRegistration: boolean;
  allowEmployerRegistration: boolean;
  maxResumeSizeMb: number;
  maintenanceNotice: string;
  supportEmail: string;
  ownerName: string;
  ownerEmail: string;
}

export interface PortalDatabase {
  users: UserRecord[];
  candidateProfiles: CandidateProfileRecord[];
  employerProfiles: EmployerProfileRecord[];
  companies: CompanyRecord[];
  jobs: JobRecord[];
  categories: JobCategoryRecord[];
  applications: ApplicationRecord[];
  resumes: ResumeRecord[];
  savedJobs: SavedJobRecord[];
  savedSearches: SavedSearchRecord[];
  interviews: InterviewRecord[];
  messages: MessageRecord[];
  notifications: NotificationRecord[];
  companyVerifications: CompanyVerificationRecord[];
  auditLogs: AuditLogRecord[];
  complaints: ComplaintReportRecord[];
  newsletterSubscribers: NewsletterSubscriber[];
  platformSettings: PlatformSettings;
}
