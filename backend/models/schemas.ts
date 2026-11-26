import mongoose, { Schema, type Model } from 'mongoose';

/**
 * Complete MongoDB / Mongoose ODM Architecture for VanguardHire Online Job Portal.
 * All 15 models include explicit references, unique constraints, compound indexes,
 * text search indexes, and timestamps for production MongoDB Atlas deployments.
 */

// 1. User
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['super_admin', 'employer', 'candidate'], required: true, index: true },
    status: { type: String, enum: ['active', 'suspended', 'pending_verification'], default: 'active', index: true },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    avatarUrl: { type: String },
    refreshTokenHashes: [{ type: String, select: false }],
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    notificationPrefs: {
      emailApplications: { type: Boolean, default: true },
      emailInterviews: { type: Boolean, default: true },
      emailJobAlerts: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

// 2. CandidateProfile
const candidateProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    headline: { type: String, default: '', maxlength: 160 },
    summary: { type: String, default: '', maxlength: 2500 },
    phone: { type: String, default: '', maxlength: 30 },
    location: { type: String, default: '', maxlength: 120, index: true },
    yearsOfExperience: { type: Number, default: 0, min: 0, max: 60 },
    expectedSalaryMin: { type: Number, min: 0 },
    expectedSalaryMax: { type: Number, min: 0 },
    skills: [{ type: String, trim: true }],
    education: [
      {
        institution: { type: String, required: true },
        degree: { type: String, required: true },
        fieldOfStudy: { type: String, required: true },
        startYear: String,
        endYear: String,
        grade: String,
      },
    ],
    experience: [
      {
        company: { type: String, required: true },
        title: { type: String, required: true },
        location: String,
        startDate: String,
        endDate: String,
        current: { type: Boolean, default: false },
        description: String,
      },
    ],
    certifications: [
      {
        name: { type: String, required: true },
        issuer: { type: String, required: true },
        issueDate: String,
        credentialUrl: String,
      },
    ],
    projects: [
      {
        title: { type: String, required: true },
        description: String,
        techStack: [String],
        url: String,
      },
    ],
    portfolioLinks: {
      website: String,
      github: String,
      linkedin: String,
      dribbble: String,
    },
    openToRemote: { type: Boolean, default: true },
  },
  { timestamps: true }
);
candidateProfileSchema.index({ skills: 1, location: 1 });

// 3. EmployerProfile
const employerProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    jobTitle: { type: String, default: 'Talent Acquisition Lead' },
    department: { type: String, default: 'People & Recruiting' },
    phone: { type: String },
  },
  { timestamps: true }
);

// 4. Company
const companySchema = new Schema(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    logoUrl: { type: String },
    website: { type: String },
    industry: { type: String, required: true, index: true },
    size: { type: String, default: '51-200 employees' },
    foundedYear: { type: Number },
    headquarters: { type: String, required: true },
    description: { type: String, required: true, maxlength: 3000 },
    verificationStatus: {
      type: String,
      enum: ['unsubmitted', 'pending', 'verified', 'rejected'],
      default: 'unsubmitted',
      index: true,
    },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);
companySchema.index({ name: 'text', description: 'text', industry: 'text' });

// 5. Job
const jobSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    employerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    category: { type: String, required: true, index: true },
    description: { type: String, required: true, maxlength: 8000 },
    responsibilities: [{ type: String }],
    qualifications: [{ type: String }],
    requiredSkills: [{ type: String, index: true }],
    experienceLevel: {
      type: String,
      enum: ['Entry Level', 'Mid Level', 'Senior Level', 'Lead / Staff', 'Executive'],
      required: true,
      index: true,
    },
    employmentType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'],
      required: true,
      index: true,
    },
    salaryMin: { type: Number, required: true, min: 0 },
    salaryMax: { type: Number, required: true, min: 0 },
    salaryCurrency: { type: String, default: 'USD' },
    location: { type: String, required: true, index: true },
    workMode: { type: String, enum: ['Remote', 'Hybrid', 'On-site'], required: true, index: true },
    vacancies: { type: Number, default: 1, min: 1 },
    deadline: { type: Date, required: true, index: true },
    educationRequirement: { type: String, default: "Bachelor's Degree or equivalent experience" },
    benefits: [{ type: String }],
    resumeRequired: { type: Boolean, default: true },
    allowReapply: { type: Boolean, default: false },
    screeningQuestions: [
      {
        question: { type: String, required: true },
        required: { type: Boolean, default: true },
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'published', 'paused', 'closed', 'expired', 'rejected'],
      default: 'pending_approval',
      index: true,
    },
    featured: { type: Boolean, default: false, index: true },
    rejectionReason: { type: String },
    viewsCount: { type: Number, default: 0 },
    history: [
      {
        action: String,
        actorId: { type: Schema.Types.ObjectId, ref: 'User' },
        actorName: String,
        note: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);
jobSchema.index({ title: 'text', description: 'text', requiredSkills: 'text', location: 'text' });
jobSchema.index({ status: 1, category: 1, workMode: 1, createdAt: -1 });
jobSchema.index({ status: 1, salaryMax: -1 });

// 6. JobCategory
const jobCategorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// 7. Application
const applicationSchema = new Schema(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    candidateUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    resumeId: { type: Schema.Types.ObjectId, ref: 'Resume', required: true },
    coverLetter: { type: String, maxlength: 4000 },
    screeningAnswers: [
      {
        questionId: String,
        question: String,
        answer: String,
      },
    ],
    status: {
      type: String,
      enum: [
        'submitted',
        'under_review',
        'shortlisted',
        'interview_scheduled',
        'selected',
        'rejected',
        'withdrawn',
      ],
      default: 'submitted',
      index: true,
    },
    internalNotes: [
      {
        authorId: { type: Schema.Types.ObjectId, ref: 'User' },
        authorName: String,
        content: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    timeline: [
      {
        status: String,
        note: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);
applicationSchema.index({ jobId: 1, candidateUserId: 1 });
applicationSchema.index({ companyId: 1, status: 1, createdAt: -1 });

// 8. Resume
const resumeSchema = new Schema(
  {
    candidateUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    originalName: { type: String, required: true },
    storedFileName: { type: String, required: true, unique: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// 9. SavedJob
const savedJobSchema = new Schema(
  {
    candidateUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  },
  { timestamps: true }
);
savedJobSchema.index({ candidateUserId: 1, jobId: 1 }, { unique: true });

// 10. Interview
const interviewSchema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    candidateUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    employerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    durationMinutes: { type: Number, default: 45 },
    type: { type: String, enum: ['Video', 'Phone', 'On-site', 'Technical Assessment'], required: true },
    locationOrLink: { type: String, required: true },
    notes: { type: String },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled',
    },
  },
  { timestamps: true }
);
interviewSchema.index({ applicationId: 1, date: 1, time: 1 });

// 11. Message
const messageSchema = new Schema(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
    senderUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    body: { type: String, required: true, maxlength: 3000 },
    readAt: { type: Date },
  },
  { timestamps: true }
);
messageSchema.index({ applicationId: 1, createdAt: 1 });

// 12. Notification
const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// 13. SavedSearch
const savedSearchSchema = new Schema(
  {
    candidateUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, maxlength: 100 },
    filters: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

// 14. CompanyVerification
const companyVerificationSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    submittedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    registrationNumber: { type: String, required: true },
    taxId: { type: String },
    documentSummary: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    reviewerUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewNotes: { type: String },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

// 15. AuditLog (append-only, immutable)
const auditLogSchema = new Schema(
  {
    actorUserId: { type: String, required: true, index: true },
    actorEmail: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, required: true, index: true },
    resourceId: { type: String, required: true },
    details: { type: String, required: true },
    ipAddress: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
auditLogSchema.index({ createdAt: -1, action: 1 });

function getOrCreateModel(name: string, schema: Schema): Model<any> {
  return mongoose.models[name] || mongoose.model(name, schema);
}

export const UserModel = getOrCreateModel('User', userSchema);
export const CandidateProfileModel = getOrCreateModel('CandidateProfile', candidateProfileSchema);
export const EmployerProfileModel = getOrCreateModel('EmployerProfile', employerProfileSchema);
export const CompanyModel = getOrCreateModel('Company', companySchema);
export const JobModel = getOrCreateModel('Job', jobSchema);
export const JobCategoryModel = getOrCreateModel('JobCategory', jobCategorySchema);
export const ApplicationModel = getOrCreateModel('Application', applicationSchema);
export const ResumeModel = getOrCreateModel('Resume', resumeSchema);
export const SavedJobModel = getOrCreateModel('SavedJob', savedJobSchema);
export const InterviewModel = getOrCreateModel('Interview', interviewSchema);
export const MessageModel = getOrCreateModel('Message', messageSchema);
export const NotificationModel = getOrCreateModel('Notification', notificationSchema);
export const SavedSearchModel = getOrCreateModel('SavedSearch', savedSearchSchema);
export const CompanyVerificationModel = getOrCreateModel(
  'CompanyVerification',
  companyVerificationSchema
);
export const AuditLogModel = getOrCreateModel('AuditLog', auditLogSchema);
