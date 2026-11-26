import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { ConfirmDialog, EmptyState, LoadingRows, StatusText } from '../../components/common/UI';
import { formatSalaryRange, formatShortDate } from '../../lib/format';

export function AdminModerationPage() {
  const { toast } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'jobs' | 'companies'>('jobs');
  const [rejectJobTarget, setRejectJobTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery<any>({
    queryKey: ['admin-moderation'],
    queryFn: () => apiRequest('/api/admin/moderation'),
  });

  const reviewJobMutation = useMutation({
    mutationFn: ({ id, decision, reason }: { id: string; decision: 'approve' | 'reject'; reason?: string }) =>
      apiRequest(`/api/admin/jobs/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ decision, reason }),
      }),
    onSuccess: (res) => {
      setRejectJobTarget(null);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-moderation'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      toast({ title: res.message, variant: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Moderation failed', description: err.message, variant: 'error' });
    },
  });

  const verifyCompMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'verified' | 'rejected' }) =>
      apiRequest(`/api/admin/companies/${id}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ decision }),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-moderation'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      toast({ title: res.message, variant: 'success' });
    },
  });

  if (isLoading) return <LoadingRows count={4} />;

  const pendingJobs = (data?.jobs || []).filter((j: any) => j.status === 'pending_approval');
  const otherJobs = (data?.jobs || []).filter((j: any) => j.status !== 'pending_approval');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Job Approvals &amp; Company Verification
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review pending job vacancies and verify employer credentials prior to direct publishing.
          </p>
        </div>

        <div className="inline-flex p-1 bg-slate-200/70 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setTab('jobs')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md ${
              tab === 'jobs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Job Postings ({pendingJobs.length} pending)
          </button>
          <button
            type="button"
            onClick={() => setTab('companies')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md ${
              tab === 'companies' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Companies ({(data?.companies || []).length})
          </button>
        </div>
      </div>

      {tab === 'jobs' ? (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="font-display text-base font-bold text-slate-900">
              Pending Approval Queue
            </h2>
            {pendingJobs.length === 0 ? (
              <EmptyState
                title="No pending job approvals"
                description="All submitted job vacancies have been reviewed."
              />
            ) : (
              <div className="space-y-3">
                {pendingJobs.map((job: any) => (
                  <div
                    key={job.id}
                    className="bg-white rounded-xl border border-amber-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <p className="font-display text-base font-bold text-slate-900">{job.title}</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {job.companyName} · {job.category} · {job.location} ·{' '}
                        <span className="font-mono tabular-nums">
                          {formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                        </span>
                      </p>
                      <p className="mt-2 text-xs text-slate-600 line-clamp-2 max-w-2xl">
                        {job.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => reviewJobMutation.mutate({ id: job.id, decision: 'approve' })}
                        className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                      >
                        Approve &amp; Publish
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectJobTarget(job)}
                        className="px-4 py-2 text-xs font-semibold text-red-700 border border-red-200 rounded-lg hover:bg-red-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-base font-bold text-slate-900">All Platform Postings</h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {otherJobs.map((j: any) => (
                    <tr key={j.id}>
                      <td className="py-3 px-4 font-medium text-slate-900">{j.title}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{j.companyName}</td>
                      <td className="py-3 px-4">
                        <StatusText status={j.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        {j.status === 'published' ? (
                          <button
                            type="button"
                            onClick={() => setRejectJobTarget(j)}
                            className="text-xs font-semibold text-red-700 hover:underline"
                          >
                            Take Down
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => reviewJobMutation.mutate({ id: j.id, decision: 'approve' })}
                            className="text-xs font-semibold text-blue-600 hover:underline"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          {(data?.companies || []).map((comp: any) => {
            const submission = (data?.verifications || []).find((v: any) => v.companyId === comp.id);
            return (
              <div
                key={comp.id}
                className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-display text-base font-bold text-slate-900">{comp.name}</p>
                    <StatusText status={comp.verificationStatus} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {comp.industry} · {comp.headquarters} · Owner: {comp.ownerEmail}
                  </p>
                  {submission && (
                    <p className="mt-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                      Reg: <span className="font-mono">{submission.registrationNumber}</span> · {submission.documentSummary}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {comp.verificationStatus !== 'verified' && (
                    <button
                      type="button"
                      onClick={() => verifyCompMutation.mutate({ id: comp.id, decision: 'verified' })}
                      className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                    >
                      Verify Company
                    </button>
                  )}
                  {comp.verificationStatus !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() => verifyCompMutation.mutate({ id: comp.id, decision: 'rejected' })}
                      className="px-4 py-2 text-xs font-semibold text-red-700 border border-red-200 rounded-lg hover:bg-red-50"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Job Dialog */}
      {rejectJobTarget && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              reviewJobMutation.mutate({
                id: rejectJobTarget.id,
                decision: 'reject',
                reason: rejectReason,
              });
            }}
            className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4"
          >
            <h3 className="font-display text-lg font-bold text-slate-900">Reject Job Posting</h3>
            <p className="text-xs text-slate-600">{rejectJobTarget.title}</p>
            <textarea
              required
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Provide moderation reason sent to the employer…"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectJobTarget(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Confirm Rejection
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export function AdminUsersPage() {
  const { user: currentUser, toast } = useAuth();
  const queryClient = useQueryClient();
  const [role, setRole] = useState('all');
  const [q, setQ] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<any | null>(null);

  const { data, isLoading } = useQuery<{ users: any[] }>({
    queryKey: ['admin-users', role, q],
    queryFn: () => {
      const params = new URLSearchParams();
      if (role !== 'all') params.set('role', role);
      if (q.trim()) params.set('q', q.trim());
      return apiRequest(`/api/admin/users?${params.toString()}`);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'suspended' }) =>
      apiRequest(`/api/admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: (res) => {
      setConfirmTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: res.message, variant: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Update failed', description: err.message, variant: 'error' });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Users &amp; Account Governance
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage candidate, employer, and administrator accounts with full audit logging.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
        >
          <option value="all">All Roles</option>
          <option value="candidate">Candidates</option>
          <option value="employer">Employers</option>
          <option value="super_admin">Super Admins</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingRows count={4} />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {(data?.users || []).map((u) => (
                <tr key={u.id}>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-900">{u.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{u.email}</p>
                  </td>
                  <td className="py-3 px-4 text-xs capitalize text-slate-700">
                    {u.role.replace('_', ' ')}
                  </td>
                  <td className="py-3 px-4">
                    <StatusText status={u.status} />
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500 tabular-nums">
                    {formatShortDate(u.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {u.id !== currentUser?.id && (
                      <button
                        type="button"
                        onClick={() => setConfirmTarget(u)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                          u.status === 'suspended'
                            ? 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                            : 'text-red-700 border-red-200 hover:bg-red-50'
                        }`}
                      >
                        {u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title={
          confirmTarget?.status === 'suspended'
            ? `Reactivate ${confirmTarget?.name}?`
            : `Suspend ${confirmTarget?.name}?`
        }
        description={
          confirmTarget?.status === 'suspended'
            ? 'This restores sign-in access for this user.'
            : 'Suspending revokes all active refresh tokens immediately and blocks API access.'
        }
        confirmLabel={confirmTarget?.status === 'suspended' ? 'Reactivate Account' : 'Suspend Account'}
        destructive={confirmTarget?.status !== 'suspended'}
        loading={statusMutation.isPending}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (confirmTarget) {
            statusMutation.mutate({
              id: confirmTarget.id,
              status: confirmTarget.status === 'suspended' ? 'active' : 'suspended',
            });
          }
        }}
      />
    </div>
  );
}

export function AdminTaxonomyPage() {
  const { toast } = useAuth();
  const queryClient = useQueryClient();
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  const { data: catData } = useQuery<{ categories: any[] }>({
    queryKey: ['admin-categories'],
    queryFn: () => apiRequest('/api/admin/categories'),
  });

  const { data: compData } = useQuery<{ complaints: any[] }>({
    queryKey: ['admin-complaints'],
    queryFn: () => apiRequest('/api/admin/complaints'),
  });

  const addCatMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name: catName, description: catDesc, active: true }),
      }),
    onSuccess: () => {
      setCatName('');
      setCatDesc('');
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast({ title: 'Category created', variant: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to create category', description: err.message, variant: 'error' });
    },
  });

  const toggleCatMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiRequest(`/api/admin/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
  });

  const resolveComplaintMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest(`/api/admin/complaints/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-complaints'] });
      toast({ title: 'Report updated', variant: 'success' });
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Categories &amp; Trust Reports
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Curate portal job categories and resolve user-submitted complaints.
        </p>
      </div>

      {/* Add Category */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-slate-900">Manage Job Categories</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (catName.trim()) addCatMutation.mutate();
          }}
          className="grid grid-cols-1 md:grid-cols-12 gap-3"
        >
          <input
            type="text"
            required
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="Category name (e.g. Cloud DevOps)"
            className="md:col-span-4 px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            value={catDesc}
            onChange={(e) => setCatDesc(e.target.value)}
            placeholder="Short description"
            className="md:col-span-6 px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
          />
          <button
            type="submit"
            className="md:col-span-2 px-4 py-2 text-sm font-semibold text-white bg-navy-900 rounded-lg"
          >
            Add Category
          </button>
        </form>

        <div className="divide-y divide-slate-100">
          {(catData?.categories || []).map((c) => (
            <div key={c.id} className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {c.name}{' '}
                  <span className="font-mono text-xs text-slate-400 tabular-nums">({c.jobsCount})</span>
                </p>
                <p className="text-xs text-slate-500">{c.description}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleCatMutation.mutate({ id: c.id, active: !c.active })}
                className="px-3 py-1 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                {c.active ? 'Disable' : 'Enable'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Complaints */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-slate-900">
          User Reports &amp; Complaints
        </h2>
        {(compData?.complaints || []).length === 0 ? (
          <p className="text-sm text-slate-500">No open complaints or reports.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {(compData?.complaints || []).map((rep) => (
              <div key={rep.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-slate-900">{rep.reason}</p>
                    <StatusText status={rep.status} />
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{rep.details}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Reported by {rep.reporterEmail} · Target: {rep.targetType} ({rep.targetId})
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => resolveComplaintMutation.mutate({ id: rep.id, status: 'resolved' })}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50"
                  >
                    Mark Resolved
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveComplaintMutation.mutate({ id: rep.id, status: 'dismissed' })}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function AdminAuditLogsPage() {
  const [q, setQ] = useState('');
  const { data, isLoading } = useQuery<{ auditLogs: any[] }>({
    queryKey: ['admin-audit-logs', q],
    queryFn: () =>
      apiRequest(`/api/admin/audit-logs${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Security Audit Logs
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Immutable, server-recorded trail of registrations, verifications, approvals, status changes, and suspensions.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter action or actor email…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingRows count={5} />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[780px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {(data?.auditLogs || []).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap tabular-nums">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-navy-900 whitespace-nowrap">
                    {log.action}
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {log.actorEmail} ({log.actorRole})
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {log.resourceType}:{log.resourceId}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminPlatformSettingsPage() {
  const { toast } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ settings: any }>({
    queryKey: ['admin-settings'],
    queryFn: () => apiRequest('/api/admin/settings'),
  });

  const [form, setForm] = useState({
    requireJobApproval: false,
    allowCandidateRegistration: true,
    allowEmployerRegistration: true,
    maxResumeSizeMb: 5,
    maintenanceNotice: '',
  });

  useEffect(() => {
    if (data?.settings) {
      setForm({
        requireJobApproval: Boolean(data.settings.requireJobApproval),
        allowCandidateRegistration: Boolean(data.settings.allowCandidateRegistration),
        allowEmployerRegistration: Boolean(data.settings.allowEmployerRegistration),
        maxResumeSizeMb: Number(data.settings.maxResumeSizeMb) || 5,
        maintenanceNotice: data.settings.maintenanceNotice || '',
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast({ title: 'Platform settings updated', variant: 'success' });
    },
  });

  if (isLoading) return <LoadingRows count={2} />;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Platform Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Owner: <span className="font-semibold text-slate-900">{data?.settings?.ownerName || 'Raghuraj Pratap Singh'}</span> ·{' '}
          <span className="font-mono text-xs">{data?.settings?.ownerEmail || 'raghurajpratapsingh8787@gmail.com'}</span>
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
        className="bg-white rounded-xl border border-slate-200 p-6 space-y-5"
      >
        <label className="flex items-start gap-3 text-sm text-slate-800">
          <input
            type="checkbox"
            className="mt-1"
            checked={form.requireJobApproval}
            onChange={(e) => setForm({ ...form, requireJobApproval: e.target.checked })}
          />
          <span>
            <span className="font-semibold block">Require Admin Approval for All Jobs</span>
            <span className="text-xs text-slate-500">
              When enabled, even verified employers must wait for Super Admin approval before publishing.
            </span>
          </span>
        </label>

        <label className="flex items-center gap-3 text-sm text-slate-800">
          <input
            type="checkbox"
            checked={form.allowCandidateRegistration}
            onChange={(e) => setForm({ ...form, allowCandidateRegistration: e.target.checked })}
          />
          <span>Allow new Candidate account registrations</span>
        </label>

        <label className="flex items-center gap-3 text-sm text-slate-800">
          <input
            type="checkbox"
            checked={form.allowEmployerRegistration}
            onChange={(e) => setForm({ ...form, allowEmployerRegistration: e.target.checked })}
          />
          <span>Allow new Employer account registrations</span>
        </label>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Maximum Resume Upload Size (MB)
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={form.maxResumeSizeMb}
            onChange={(e) => setForm({ ...form, maxResumeSizeMb: Number(e.target.value) })}
            className="w-32 px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Maintenance / System Banner Notice (Optional)
          </label>
          <input
            type="text"
            value={form.maintenanceNotice}
            onChange={(e) => setForm({ ...form, maintenanceNotice: e.target.value })}
            placeholder="Leave empty for normal operations"
            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
          />
        </div>

        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-navy-900 hover:bg-blue-600 rounded-lg"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save Platform Settings'}
        </button>
      </form>
    </div>
  );
}
