import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Calendar, CheckCircle2, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { apiRequest } from '../../lib/api';
import { EmptyState, LoadingRows, StatusText } from '../../components/common/UI';
import { formatRelativeDate, formatSalaryRange, isSafeExternalUrl } from '../../lib/format';

export function CandidateOverview() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['candidate-dashboard'],
    queryFn: () => apiRequest('/api/candidate/dashboard'),
  });

  if (isLoading) return <LoadingRows count={4} />;

  const stats = data?.stats || {};
  const completion = data?.completion || { percentage: 0, suggestions: [] };
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (circumference * (completion.percentage || 0)) / 100;

  const kpis = [
    { label: 'Total Applications', value: stats.totalApplications ?? 0 },
    { label: 'Under Review', value: stats.underReview ?? 0 },
    { label: 'Shortlisted', value: stats.shortlisted ?? 0 },
    { label: 'Interviews', value: stats.interviewsScheduled ?? 0 },
    { label: 'Saved Jobs', value: stats.savedJobs ?? 0 },
    { label: 'Rejected', value: stats.rejected ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Candidate Overview
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Track your active applications, interview invitations, and profile strength.
          </p>
        </div>
        <Link
          to="/jobs"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg whitespace-nowrap self-start"
        >
          <span>Discover Open Roles</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="mt-2 font-mono text-2xl font-bold text-navy-900 tabular-nums">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Profile Completion + Upcoming Interviews */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold text-slate-900">Profile Completion</h2>
            <Link
              to="/dashboard/candidate/profile"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Edit Profile
            </Link>
          </div>

          <div className="mt-5 flex items-center gap-6">
            <div className="relative w-28 h-28 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="8"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: dashOffset }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-xl font-bold text-navy-900 tabular-nums">
                  {completion.percentage}%
                </span>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              {completion.suggestions.length === 0 ? (
                <div className="flex items-start gap-2 text-sm text-emerald-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Your profile is complete and ready for top recruiters.</span>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-slate-700">Suggested improvements:</p>
                  <ul className="mt-2 space-y-1.5 text-xs text-slate-600 list-disc pl-4">
                    {completion.suggestions.slice(0, 3).map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold text-slate-900">
              Upcoming Interview Invitations
            </h2>
            <Link
              to="/dashboard/candidate/applications"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View All
            </Link>
          </div>

          <div className="mt-4">
            {data?.upcomingInterviews?.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {data.upcomingInterviews.map((iv: any) => (
                  <div key={iv.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {iv.jobTitle} · <span className="text-slate-600 font-normal">{iv.companyName}</span>
                      </p>
                      <p className="mt-1 text-xs text-slate-600 flex items-center gap-2 font-mono tabular-nums">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>{iv.date} at {iv.time} ({iv.durationMinutes} min · {iv.type})</span>
                      </p>
                    </div>
                    {isSafeExternalUrl(iv.locationOrLink) ? (
                      <a
                        href={iv.locationOrLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-navy-900 rounded-lg hover:bg-blue-600 whitespace-nowrap self-start"
                      >
                        <span>Join Meeting</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-600">{iv.locationOrLink}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No upcoming interviews scheduled"
                description="When an employer schedules a screening call or technical loop, your invitation will appear here."
              />
            )}
          </div>
        </section>
      </div>

      {/* Recent Applications & Recommended Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <h2 className="font-display text-base font-bold text-slate-900">Recent Applications</h2>
            <Link
              to="/dashboard/candidate/applications"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Manage Applications
            </Link>
          </div>
          {data?.recentApplications?.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {data.recentApplications.map((app: any) => (
                <div key={app.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      to={`/jobs/${app.jobId}`}
                      className="text-sm font-semibold text-slate-900 hover:text-blue-600 truncate block"
                    >
                      {app.jobTitle}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {app.companyName} · Applied {formatRelativeDate(app.submittedAt)}
                    </p>
                  </div>
                  <StatusText status={app.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="No applications submitted yet"
                description="Explore verified roles and submit your first application."
              />
            </div>
          )}
        </section>

        <section className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <h2 className="font-display text-base font-bold text-slate-900">
              Recommended for Your Skills
            </h2>
            <Link to="/jobs" className="text-xs font-semibold text-blue-600 hover:underline">
              See More
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {(data?.recommendedJobs || []).map((job: any) => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="block py-3.5 hover:bg-slate-50/70 -mx-2 px-2 rounded-lg transition-colors"
              >
                <p className="text-sm font-semibold text-slate-900">{job.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {job.companyName} · {job.workMode} ·{' '}
                  <span className="font-mono text-navy-900 tabular-nums">
                    {formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                  </span>
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
