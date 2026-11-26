export type UserRole = 'super_admin' | 'employer' | 'candidate';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'suspended' | 'pending_verification';
  emailVerified: boolean;
  avatarUrl: string | null;
  notificationPrefs: {
    emailApplications: boolean;
    emailInterviews: boolean;
    emailJobAlerts: boolean;
  };
  createdAt: string;
}

export interface JobSummary {
  id: string;
  companyId: string;
  title: string;
  category: string;
  description: string;
  responsibilities: string[];
  qualifications: string[];
  requiredSkills: string[];
  experienceLevel: string;
  employmentType: string;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  location: string;
  workMode: 'Remote' | 'Hybrid' | 'On-site';
  vacancies: number;
  deadline: string;
  educationRequirement: string;
  benefits: string[];
  resumeRequired: boolean;
  allowReapply: boolean;
  screeningQuestions: { id: string; question: string; required: boolean }[];
  status: string;
  featured: boolean;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  companyName?: string;
  companyLogo?: string | null;
  companyVerified?: boolean;
  companyIndustry?: string;
  isSaved?: boolean;
  hasApplied?: boolean;
  applicantsCount?: number;
  history?: { action: string; actorName: string; note?: string; timestamp: string }[];
}

export interface CompanySummary {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  website?: string;
  industry: string;
  size: string;
  foundedYear?: number;
  headquarters: string;
  description: string;
  verificationStatus: 'unsubmitted' | 'pending' | 'verified' | 'rejected';
  openRolesCount?: number;
  jobsCount?: number;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  openRolesCount?: number;
  jobsCount?: number;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface ResumeItem {
  id: string;
  candidateUserId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  isDefault: boolean;
  uploadedAt: string;
  updatedAt: string;
}
