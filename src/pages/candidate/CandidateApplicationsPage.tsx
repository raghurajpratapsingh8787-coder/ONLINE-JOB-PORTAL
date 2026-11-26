import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, ExternalLink, MessageSquare } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { ConfirmDialog, EmptyState, LoadingRows, StatusText } from '../../components/common/UI';
import { formatSalaryRange, formatShortDate, isSafeExternalUrl } from '../../lib/format';

const STAGES = ['submitted', 'under_review', 'shortlisted', 'interview_scheduled', 'selected'];

export function CandidateApplicationsPage() {
  const { toast } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [withdrawTarget, setWithdrawTarget] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ applications: any[] }>({
    queryKey: ['candidate-applications', statusFilter],
    queryFn: () =>
      apiRequest(`/api/candidate/applications${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`),
  });

  const withdrawMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/candidate/applications/${id}/withdraw`, { method: 'PATCH' }),
    onSuccess: () => {
      setWithdrawTarget(null);
      queryClient.invalidateQueries({ queryKey: ['candidate-applications'] });
      queryClient.invalidateQueries({ queryKey: ['candidate-dashboard'] });
      toast({ title: 'Application withdrawn', variant: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Could not withdraw', description: err.message, variant: 'error' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            My Applications
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Track live hiring stages, interview invitations, and application history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start">
          {[
            { id: 'all', label: 'All' },
            { id: 'submitted', label: 'Submitted' },
            { id: 'under_review', label: 'In Review' },
            { id: 'shortlisted', label: 'Shortlisted' },
            { id: 'interview_scheduled', label: 'Interviews' },
            { id: 'selected', label: 'Selected' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingRows count={3} />
      ) : !data?.applications || data.applications.length === 0 ? (
        <EmptyState
          title="No applications match this filter"
          description="Explore verified open roles and apply directly with your saved resume."
          action={
            <Link to="/jobs" className="px-4 py-2 text-sm font-semibold text-white bg-navy-900 rounded-lg">
              Browse Jobs
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {data.applications.map((app) => {
            const stageIndex = STAGES.indexOf(app.status);
            return (
              <article
                key={app.id}
                className="bg-white rounded-xl border border-slate-200 p-6 space-y-5"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/jobs/${app.jobId}`}
                        className="font-display text-lg font-bold text-slate-900 hover:text-blue-600"
                      >
                        {app.jobTitle}
                      </Link>
                      <StatusText status={app.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      {app.companyName} · {app.jobLocation} · {app.workMode} ·{' '}
                      <span className="font-mono tabular-nums">
                        {formatSalaryRange(app.salaryMin, app.salaryMax)}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Submitted {formatShortDate(app.submittedAt)} · Resume: {app.resumeName}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <Link
                      to={`/dashboard/candidate/messages?applicationId=${app.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message Recruiter</span>
                    </Link>
                    {app.canWithdraw && (
                      <button
                        type="button"
                        onClick={() => setWithdrawTarget(app.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-red-700 border border-red-200 rounded-lg hover:bg-red-50"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Pipeline Bar */}
                {stageIndex >= 0 && (
                  <div className="grid grid-cols-5 gap-2">
                    {STAGES.map((st, idx) => (
                      <div key={st}>
                        <div
                          className={`h-1.5 rounded-full ${
                            idx <= stageIndex ? 'bg-blue-600' : 'bg-slate-200'
                          }`}
                        />
                        <p className="mt-1.5 text-[11px] text-slate-500 capitalize truncate">
                          {st.replace('_', ' ')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Scheduled Interviews */}
                {app.interviews?.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <p className="text-xs font-semibold text-slate-700">Interview Schedule</p>
                    {app.interviews.map((iv: any) => (
                      <div
                        key={iv.id}
                        className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="text-xs text-slate-700">
                          <p className="font-semibold text-slate-900 flex items-center gap-1.5 font-mono tabular-nums">
                            <Calendar className="w-3.5 h-3.5 text-blue-600" />
                            <span>
                              {iv.date} at {iv.time} ({iv.durationMinutes} min · {iv.type})
                            </span>
                          </p>
                          {iv.notes && <p className="mt-1 text-slate-600">{iv.notes}</p>}
                        </div>
                        {isSafeExternalUrl(iv.locationOrLink) ? (
                          <a
                            href={iv.locationOrLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap"
                          >
                            <span>Meeting Link</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-xs text-slate-600">{iv.locationOrLink}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(withdrawTarget)}
        title="Withdraw Application?"
        description="This notifies the employer that you are no longer pursuing this vacancy. You cannot re-apply unless the employer enables reapplications."
        confirmLabel="Withdraw Application"
        destructive
        loading={withdrawMutation.isPending}
        onCancel={() => setWithdrawTarget(null)}
        onConfirm={() => {
          if (withdrawTarget) withdrawMutation.mutate(withdrawTarget);
        }}
      />
    </div>
  );
}
