import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  ExternalLink,
  Flag,
  MapPin,
  Upload,
} from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { CompanyMark, EmptyState, LoadingRows } from '../../components/common/UI';
import { formatRelativeDate, formatSalaryRange, formatShortDate } from '../../lib/format';
import type { ResumeItem } from '../../types';

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, toast } = useAuth();
  const queryClient = useQueryClient();

  const [applyOpen, setApplyOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');

  const { data, isLoading, error } = useQuery<{ job: any; similarJobs: any[] }>({
    queryKey: ['public-job-detail', id],
    queryFn: () => apiRequest(`/api/public/jobs/${id}`),
    enabled: Boolean(id),
  });

  const { data: resumeData, refetch: refetchResumes } = useQuery<{ resumes: ResumeItem[] }>({
    queryKey: ['candidate-resumes'],
    queryFn: () => apiRequest('/api/candidate/resumes'),
    enabled: Boolean(user && user.role === 'candidate'),
  });

  const saveMutation = useMutation({
    mutationFn: () => apiRequest(`/api/candidate/saved-jobs/${id}`, { method: 'POST' }),
    onSuccess: (res) => {
      toast({ title: res.message, variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['public-job-detail', id] });
    },
  });

  const uploadResumeMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('resume', file);
      fd.append('setDefault', 'true');
      return apiRequest<{ resume: ResumeItem }>('/api/candidate/resumes', {
        method: 'POST',
        body: fd,
      });
    },
    onSuccess: (res) => {
      setSelectedResumeId(res.resume.id);
      void refetchResumes();
      toast({ title: 'Resume uploaded', variant: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Upload rejected', description: err.message, variant: 'error' });
    },
  });

  const applyMutation = useMutation({
    mutationFn: () => {
      const screeningAnswers = (data?.job?.screeningQuestions || []).map((q: any) => ({
        questionId: q.id,
        question: q.question,
        answer: answers[q.id] || '',
      }));
      return apiRequest('/api/candidate/applications', {
        method: 'POST',
        body: JSON.stringify({
          jobId: id,
          resumeId: selectedResumeId,
          coverLetter,
          screeningAnswers,
        }),
      });
    },
    onSuccess: () => {
      setStep(4);
      queryClient.invalidateQueries({ queryKey: ['public-job-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['candidate-applications'] });
      queryClient.invalidateQueries({ queryKey: ['candidate-dashboard'] });
      toast({ title: 'Application submitted', variant: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Submission failed', description: err.message, variant: 'error' });
    },
  });

  const reportMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/public/complaints', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'job',
          targetId: id,
          reason: reportReason,
          details: reportDetails,
        }),
      }),
    onSuccess: () => {
      setReportOpen(false);
      setReportReason('');
      setReportDetails('');
      toast({ title: 'Report submitted', variant: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Could not submit report', description: err.message, variant: 'error' });
    },
  });

  const openApplyModal = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'candidate') {
      toast({ title: 'Candidate role required', description: 'Switch to a Job Seeker account to apply.' });
      return;
    }
    const defaultResume =
      resumeData?.resumes.find((r) => r.isDefault) || resumeData?.resumes[0];
    if (defaultResume && !selectedResumeId) {
      setSelectedResumeId(defaultResume.id);
    }
    setStep(1);
    setApplyOpen(true);
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <LoadingRows count={4} />
      </div>
    );
  }

  if (error || !data?.job) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <EmptyState
          title="Job posting unavailable"
          description="This vacancy may have been closed or removed by the hiring organization."
          action={
            <Link to="/jobs" className="px-4 py-2 text-sm font-semibold text-white bg-navy-900 rounded-lg">
              Back to Find Jobs
            </Link>
          }
        />
      </div>
    );
  }

  const job = data.job;
  const eligibility = job.eligibility || { allowed: true };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        to="/jobs"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Find Jobs</span>
      </Link>

      {/* Main Header Block */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <CompanyMark logoUrl={job.company?.logoUrl} name={job.company?.name || 'Company'} size="lg" />
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-800">{job.company?.name}</span>
                {job.company?.verificationStatus === 'verified' && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Employer
                  </span>
                )}
              </div>
              <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {job.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {job.location}
                </span>
                <span aria-hidden="true">·</span>
                <span>{job.workMode}</span>
                <span aria-hidden="true">·</span>
                <span>{job.employmentType}</span>
                <span aria-hidden="true">·</span>
                <span>{job.experienceLevel}</span>
                <span aria-hidden="true">·</span>
                <span>{job.category}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {user?.role === 'candidate' && (
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                  job.isSaved
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${job.isSaved ? 'fill-current' : ''}`} />
                <span>{job.isSaved ? 'Saved' : 'Save Job'}</span>
              </button>
            )}

            <button
              type="button"
              disabled={!eligibility.allowed}
              onClick={openApplyModal}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:bg-slate-300 disabled:text-slate-600"
            >
              {eligibility.allowed ? 'Apply Now' : eligibility.reason?.includes('already') ? 'Already Applied' : 'Applications Closed'}
            </button>
          </div>
        </div>

        {!eligibility.allowed && eligibility.reason && (
          <p className="mt-4 text-sm font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
            {eligibility.reason}
          </p>
        )}

        {/* Key Compensation & Deadline Facts */}
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-slate-500">Annual Compensation</p>
            <p className="mt-1 font-mono text-base font-bold text-navy-900 tabular-nums">
              {formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Open Vacancies</p>
            <p className="mt-1 font-mono text-base font-semibold text-slate-900 tabular-nums">
              {job.vacancies} {job.vacancies === 1 ? 'position' : 'positions'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Application Deadline</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
              {formatShortDate(job.deadline)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Activity</p>
            <p className="mt-1 text-sm text-slate-700 tabular-nums">
              Posted {formatRelativeDate(job.createdAt)} · {job.applicantsCount ?? 0} applicants
            </p>
          </div>
        </div>
      </div>

      {/* Body Grid */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8 bg-white rounded-xl border border-slate-200 p-6 sm:p-8">
          <section>
            <h2 className="font-display text-lg font-bold text-slate-900">Role Overview</h2>
            <p className="mt-3 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {job.description}
            </p>
          </section>

          <section className="pt-6 border-t border-slate-100">
            <h2 className="font-display text-lg font-bold text-slate-900">Key Responsibilities</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-700 list-disc pl-5">
              {job.responsibilities.map((item: string, i: number) => (
                <li key={i} className="leading-relaxed">{item}</li>
              ))}
            </ul>
          </section>

          <section className="pt-6 border-t border-slate-100">
            <h2 className="font-display text-lg font-bold text-slate-900">Required Qualifications</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-700 list-disc pl-5">
              {job.qualifications.map((item: string, i: number) => (
                <li key={i} className="leading-relaxed">{item}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-slate-600">
              <span className="font-semibold text-slate-800">Education:</span> {job.educationRequirement}
            </p>
          </section>

          <section className="pt-6 border-t border-slate-100">
            <h2 className="font-display text-lg font-bold text-slate-900">Required Skills</h2>
            <p className="mt-3 text-sm text-slate-700 leading-relaxed">
              {job.requiredSkills.join('  ·  ')}
            </p>
          </section>

          {job.benefits?.length > 0 && (
            <section className="pt-6 border-t border-slate-100">
              <h2 className="font-display text-lg font-bold text-slate-900">Compensation &amp; Benefits</h2>
              <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700">
                {job.benefits.map((b: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Right Sidebar: Company Profile & Similar Jobs */}
        <aside className="lg:col-span-4 space-y-6">
          {job.company && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-display text-base font-bold text-slate-900">
                About {job.company.name}
              </h3>
              <p className="mt-2 text-xs text-slate-500">
                {job.company.industry} · {job.company.size} · {job.company.headquarters}
              </p>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                {job.company.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold">
                <Link to={`/jobs?companyId=${job.company.id}`} className="text-blue-600 hover:underline">
                  View all company openings
                </Link>
                {job.company.website && (
                  <a
                    href={job.company.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900"
                  >
                    <span>Website</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {data.similarJobs?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-display text-base font-bold text-slate-900">Similar Openings</h3>
              <div className="mt-4 divide-y divide-slate-100">
                {data.similarJobs.map((sj) => (
                  <Link
                    key={sj.id}
                    to={`/jobs/${sj.id}`}
                    className="block py-3 first:pt-0 last:pb-0 group"
                  >
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600">
                      {sj.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {sj.companyName} · {sj.workMode} ·{' '}
                      <span className="font-mono tabular-nums">
                        {formatSalaryRange(sj.salaryMin, sj.salaryMax, sj.salaryCurrency)}
                      </span>
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {user && (
            <button
              type="button"
              onClick={() => setReportOpen((v) => !v)}
              className="w-full py-2.5 px-4 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg bg-white inline-flex items-center justify-center gap-1.5"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Report an issue with this posting</span>
            </button>
          )}

          {reportOpen && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                reportMutation.mutate();
              }}
              className="bg-white rounded-xl border border-slate-200 p-5 space-y-3"
            >
              <h4 className="text-sm font-semibold text-slate-900">Report Job Posting</h4>
              <input
                type="text"
                required
                minLength={3}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Reason (e.g. Misleading salary)"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <textarea
                required
                minLength={10}
                rows={3}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Provide details for our moderation team…"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                disabled={reportMutation.isPending}
                className="w-full py-2 text-xs font-semibold text-white bg-navy-900 rounded-lg"
              >
                Submit Report
              </button>
            </form>
          )}
        </aside>
      </div>

      {/* Multi-Step Application Workflow Modal */}
      {applyOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="apply-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/65 backdrop-blur-[2px] p-4"
        >
          <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <p className="text-xs font-medium text-blue-700">
                  {step < 4 ? `Step ${step} of 3` : 'Confirmation'}
                </p>
                <h2 id="apply-modal-title" className="font-display text-xl font-bold text-slate-900 mt-0.5">
                  Apply for {job.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{job.company?.name} · {job.location}</p>
              </div>
              <button
                type="button"
                onClick={() => setApplyOpen(false)}
                className="text-sm text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            {step === 1 && (
              <div className="mt-6 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">1. Select Your Resume</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Resumes are stored privately and shared only with this employer upon submission.
                  </p>
                </div>

                {resumeData?.resumes && resumeData.resumes.length > 0 ? (
                  <div className="space-y-2.5">
                    {resumeData.resumes.map((r) => (
                      <label
                        key={r.id}
                        className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer transition-colors ${
                          selectedResumeId === r.id
                            ? 'border-blue-600 bg-blue-50/50'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="radio"
                            name="resume"
                            checked={selectedResumeId === r.id}
                            onChange={() => setSelectedResumeId(r.id)}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {r.originalName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {r.isDefault ? 'Default Resume · ' : ''}Uploaded {formatShortDate(r.uploadedAt)}
                            </p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3.5">
                    No resume uploaded yet. Upload a PDF or DOCX below to continue.
                  </p>
                )}

                <div className="pt-2">
                  <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>{uploadResumeMutation.isPending ? 'Uploading…' : 'Upload New PDF / DOCX'}</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadResumeMutation.mutate(file);
                      }}
                    />
                  </label>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={!selectedResumeId}
                    onClick={() => setStep(2)}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-40"
                  >
                    Continue to Screening
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="mt-6 space-y-5">
                <h3 className="text-sm font-semibold text-slate-900">
                  2. Screening Questions &amp; Cover Note
                </h3>

                {(job.screeningQuestions || []).map((q: any) => (
                  <div key={q.id}>
                    <label htmlFor={`sq-${q.id}`} className="block text-sm font-medium text-slate-800">
                      {q.question} {q.required && <span className="text-red-600">*</span>}
                    </label>
                    <textarea
                      id={`sq-${q.id}`}
                      rows={3}
                      required={q.required}
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Provide a concise, specific response…"
                      className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ))}

                <div>
                  <label htmlFor="cover-letter" className="block text-sm font-medium text-slate-800">
                    Cover Note (Optional)
                  </label>
                  <textarea
                    id="cover-letter"
                    rows={4}
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Highlight relevant architecture, domain impact, or availability…"
                    className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const missing = (job.screeningQuestions || []).find(
                        (q: any) => q.required && !(answers[q.id] || '').trim()
                      );
                      if (missing) {
                        toast({
                          title: 'Required screening question',
                          description: `Please answer: "${missing.question}"`,
                          variant: 'error',
                        });
                        return;
                      }
                      setStep(3);
                    }}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                  >
                    Review Application
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="mt-6 space-y-5">
                <h3 className="text-sm font-semibold text-slate-900">3. Review &amp; Submit</h3>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Applicant</p>
                    <p className="font-medium text-slate-900">
                      {user?.name} ({user?.email})
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Selected Resume</p>
                    <p className="font-medium text-slate-900">
                      {resumeData?.resumes.find((r) => r.id === selectedResumeId)?.originalName}
                    </p>
                  </div>
                  {coverLetter && (
                    <div>
                      <p className="text-xs text-slate-500">Cover Note</p>
                      <p className="text-slate-700 whitespace-pre-line">{coverLetter}</p>
                    </div>
                  )}
                  {(job.screeningQuestions || []).length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500">Screening Responses</p>
                      <ul className="mt-1 space-y-2">
                        {job.screeningQuestions.map((q: any) => (
                          <li key={q.id}>
                            <p className="text-xs font-semibold text-slate-800">{q.question}</p>
                            <p className="text-xs text-slate-600">{answers[q.id] || '—'}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={applyMutation.isPending}
                    onClick={() => applyMutation.mutate()}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                  >
                    {applyMutation.isPending ? 'Submitting…' : 'Submit Application'}
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="mt-8 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="font-display text-xl font-bold text-slate-900">
                  Application Submitted
                </h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  {job.company?.name} has been notified. Track review milestones, interview invitations, and recruiter messages from your Candidate Dashboard.
                </p>
                <div className="pt-4 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setApplyOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg"
                  >
                    Stay on Page
                  </button>
                  <Link
                    to="/dashboard/candidate/applications"
                    onClick={() => setApplyOpen(false)}
                    className="px-5 py-2 text-sm font-semibold text-white bg-navy-900 rounded-lg hover:bg-navy-800"
                  >
                    Track Application
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
