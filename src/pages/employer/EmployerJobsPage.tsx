import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, History, Plus, Trash2, Users } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { EmptyState, LoadingRows, StatusText } from '../../components/common/UI';
import { formatSalaryRange, formatShortDate } from '../../lib/format';
import type { CategorySummary, JobSummary } from '../../types';

const DEFAULT_FORM = {
  title: '',
  category: 'Software Development',
  description: '',
  responsibilitiesText: '',
  qualificationsText: '',
  skillsText: '',
  experienceLevel: 'Senior Level',
  employmentType: 'Full-time',
  salaryMin: '120000',
  salaryMax: '160000',
  salaryCurrency: 'USD',
  location: '',
  workMode: 'Hybrid',
  vacancies: '1',
  deadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  educationRequirement: "Bachelor's Degree or equivalent experience",
  benefitsText: 'Health Insurance\nFlexible PTO\nLearning Budget',
  resumeRequired: true,
  allowReapply: false,
  screeningQuestions: [] as { id: string; question: string; required: boolean }[],
  status: 'published',
};

export function EmployerJobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useAuth();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [historyJob, setHistoryJob] = useState<JobSummary | null>(null);

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setEditingJobId(null);
      setForm(DEFAULT_FORM);
      setEditorOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data, isLoading } = useQuery<{ jobs: JobSummary[] }>({
    queryKey: ['employer-jobs'],
    queryFn: () => apiRequest('/api/employer/jobs'),
  });

  const { data: catData } = useQuery<{ categories: CategorySummary[] }>({
    queryKey: ['public-categories'],
    queryFn: () => apiRequest('/api/public/categories'),
  });

  const saveJobMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title,
        category: form.category,
        description: form.description,
        responsibilities: form.responsibilitiesText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        qualifications: form.qualificationsText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        requiredSkills: form.skillsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        experienceLevel: form.experienceLevel,
        employmentType: form.employmentType,
        salaryMin: Number(form.salaryMin),
        salaryMax: Number(form.salaryMax),
        salaryCurrency: form.salaryCurrency,
        location: form.location,
        workMode: form.workMode,
        vacancies: Number(form.vacancies),
        deadline: new Date(`${form.deadline}T23:59:59Z`).toISOString(),
        educationRequirement: form.educationRequirement,
        benefits: form.benefitsText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        resumeRequired: form.resumeRequired,
        allowReapply: form.allowReapply,
        screeningQuestions: form.screeningQuestions.filter((q) => q.question.trim()),
        status: form.status,
      };
      return editingJobId
        ? apiRequest(`/api/employer/jobs/${editingJobId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          })
        : apiRequest('/api/employer/jobs', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
    },
    onSuccess: (res) => {
      setEditorOpen(false);
      queryClient.invalidateQueries({ queryKey: ['employer-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['employer-dashboard'] });
      toast({ title: res.message || 'Job saved', variant: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Unable to save job', description: err.message, variant: 'error' });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest(`/api/employer/jobs/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['employer-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['employer-dashboard'] });
      toast({ title: res.message, variant: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Status change failed', description: err.message, variant: 'error' });
    },
  });

  const openEdit = (job: JobSummary) => {
    setEditingJobId(job.id);
    setForm({
      title: job.title,
      category: job.category,
      description: job.description,
      responsibilitiesText: job.responsibilities.join('\n'),
      qualificationsText: job.qualifications.join('\n'),
      skillsText: job.requiredSkills.join(', '),
      experienceLevel: job.experienceLevel,
      employmentType: job.employmentType,
      salaryMin: String(job.salaryMin),
      salaryMax: String(job.salaryMax),
      salaryCurrency: job.salaryCurrency || 'USD',
      location: job.location,
      workMode: job.workMode,
      vacancies: String(job.vacancies),
      deadline: job.deadline.slice(0, 10),
      educationRequirement: job.educationRequirement,
      benefitsText: (job.benefits || []).join('\n'),
      resumeRequired: job.resumeRequired,
      allowReapply: job.allowReapply,
      screeningQuestions: job.screeningQuestions || [],
      status: job.status === 'rejected' || job.status === 'expired' ? 'draft' : job.status,
    });
    setEditorOpen(true);
  };

  const filteredJobs = (data?.jobs || []).filter((j) =>
    statusFilter === 'all' ? true : j.status === statusFilter
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Manage Job Postings
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Create, edit, pause, or close vacancies with full screening questions and audit history.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingJobId(null);
            setForm(DEFAULT_FORM);
            setEditorOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg self-start whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Create Job Posting</span>
        </button>
      </div>

      {/* Status Filter Bar */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
        {['all', 'published', 'pending_approval', 'draft', 'paused', 'closed'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize whitespace-nowrap ${
              statusFilter === st ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingRows count={4} />
      ) : filteredJobs.length === 0 ? (
        <EmptyState
          title="No job postings in this status"
          description="Create a new job posting to attract qualified candidates."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Role &amp; Category</th>
                <th className="py-3 px-4">Compensation</th>
                <th className="py-3 px-4">Deadline</th>
                <th className="py-3 px-4 text-right">Applicants</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredJobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-900">{job.title}</p>
                    <p className="text-xs text-slate-500">
                      {job.category} · {job.location} · {job.workMode}
                    </p>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-800 tabular-nums">
                    {formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency)}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600 tabular-nums">
                    {formatShortDate(job.deadline)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                    {job.applicantsCount ?? 0}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusText status={job.status} />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/dashboard/employer/ats?jobId=${job.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 rounded-md"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>ATS</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => openEdit(job)}
                        aria-label={`Edit ${job.title}`}
                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryJob(job)}
                        aria-label={`History for ${job.title}`}
                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      {job.status === 'published' ? (
                        <button
                          type="button"
                          onClick={() => statusMutation.mutate({ id: job.id, status: 'closed' })}
                          className="px-2.5 py-1 text-xs font-medium text-red-700 border border-red-200 rounded-md hover:bg-red-50"
                        >
                          Close
                        </button>
                      ) : job.status !== 'pending_approval' ? (
                        <button
                          type="button"
                          onClick={() => statusMutation.mutate({ id: job.id, status: 'published' })}
                          className="px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-50"
                        >
                          Publish
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* History Modal */}
      {historyJob && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4"
        >
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="font-display text-lg font-bold text-slate-900">
                Modification History
              </h2>
              <button
                type="button"
                onClick={() => setHistoryJob(null)}
                className="text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">{historyJob.title}</p>
            <ul className="mt-4 space-y-3 max-h-72 overflow-y-auto">
              {(historyJob.history || []).map((h, i) => (
                <li key={i} className="text-sm border-b border-slate-100 pb-2.5">
                  <p className="font-semibold text-slate-900">{h.action}</p>
                  <p className="text-xs text-slate-500">
                    {h.actorName} · {formatShortDate(h.timestamp)}
                  </p>
                  {h.note && <p className="text-xs text-slate-600 mt-1">{h.note}</p>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Create / Edit Job Modal */}
      {editorOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="job-editor-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/65 p-4"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveJobMutation.mutate();
            }}
            className="bg-white rounded-xl border border-slate-200 max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h2 id="job-editor-title" className="font-display text-xl font-bold text-slate-900">
                {editingJobId ? 'Edit Job Posting' : 'Create New Job Posting'}
              </h2>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="text-sm text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Senior Backend Engineer (Node.js & MongoDB)"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {(catData?.categories || []).map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location *</label>
                <input
                  type="text"
                  required
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. San Francisco, CA or Remote (US)"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Work Mode</label>
                <select
                  value={form.workMode}
                  onChange={(e) => setForm({ ...form, workMode: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type</label>
                <select
                  value={form.employmentType}
                  onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                  <option value="Freelance">Freelance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Experience Level</label>
                <select
                  value={form.experienceLevel}
                  onChange={(e) => setForm({ ...form, experienceLevel: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Entry Level">Entry Level</option>
                  <option value="Mid Level">Mid Level</option>
                  <option value="Senior Level">Senior Level</option>
                  <option value="Lead / Staff">Lead / Staff</option>
                  <option value="Executive">Executive</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Salary Min ($)</label>
                  <input
                    type="number"
                    required
                    min={1000}
                    value={form.salaryMin}
                    onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Salary Max ($)</label>
                  <input
                    type="number"
                    required
                    min={1000}
                    value={form.salaryMax}
                    onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vacancies</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={form.vacancies}
                  onChange={(e) => setForm({ ...form, vacancies: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Application Deadline</label>
                <input
                  type="date"
                  required
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Required Skills (comma-separated) *
                </label>
                <input
                  type="text"
                  required
                  value={form.skillsText}
                  onChange={(e) => setForm({ ...form, skillsText: e.target.value })}
                  placeholder="TypeScript, React, Node.js, MongoDB, AWS"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Education Requirement</label>
                <input
                  type="text"
                  required
                  value={form.educationRequirement}
                  onChange={(e) => setForm({ ...form, educationRequirement: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Job Description *</label>
                <textarea
                  rows={4}
                  required
                  minLength={30}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Responsibilities (one per line) *
                </label>
                <textarea
                  rows={4}
                  required
                  value={form.responsibilitiesText}
                  onChange={(e) => setForm({ ...form, responsibilitiesText: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Required Qualifications (one per line) *
                </label>
                <textarea
                  rows={4}
                  required
                  value={form.qualificationsText}
                  onChange={(e) => setForm({ ...form, qualificationsText: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Benefits (one per line)
                </label>
                <textarea
                  rows={3}
                  value={form.benefitsText}
                  onChange={(e) => setForm({ ...form, benefitsText: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {/* Dynamic Screening Questions */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">Screening Questions</span>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      screeningQuestions: [
                        ...form.screeningQuestions,
                        { id: `sq-${Date.now()}`, question: '', required: true },
                      ],
                    })
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Question</span>
                </button>
              </div>
              {form.screeningQuestions.map((q, idx) => (
                <div key={q.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={q.question}
                    onChange={(e) => {
                      const next = [...form.screeningQuestions];
                      next[idx] = { ...q, question: e.target.value };
                      setForm({ ...form, screeningQuestions: next });
                    }}
                    placeholder="Ask a targeted qualification question…"
                    className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                  <label className="text-xs text-slate-600 flex items-center gap-1 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) => {
                        const next = [...form.screeningQuestions];
                        next[idx] = { ...q, required: e.target.checked };
                        setForm({ ...form, screeningQuestions: next });
                      }}
                    />
                    Required
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        screeningQuestions: form.screeningQuestions.filter((_, i) => i !== idx),
                      })
                    }
                    className="p-1.5 text-red-600"
                    aria-label="Remove screening question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-4 text-xs text-slate-700">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={form.allowReapply}
                    onChange={(e) => setForm({ ...form, allowReapply: e.target.checked })}
                  />
                  Allow reapplication
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="published">Publish Immediately</option>
                  <option value="draft">Save as Draft</option>
                  <option value="paused">Paused</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveJobMutation.isPending}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {saveJobMutation.isPending ? 'Saving…' : editingJobId ? 'Save Changes' : 'Create Job'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
