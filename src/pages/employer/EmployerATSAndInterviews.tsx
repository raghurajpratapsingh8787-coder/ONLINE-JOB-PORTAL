import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Download,
  ExternalLink,
  Lock,
  MessageSquare,
  Search,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { apiRequest, downloadAuthorizedFile } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Avatar, EmptyState, LoadingRows, StatusText } from '../../components/common/UI';
import { formatShortDate, isSafeExternalUrl } from '../../lib/format';

const PIPELINE_COLUMNS = [
  { id: 'submitted', label: 'Applied' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'interview_scheduled', label: 'Interview' },
  { id: 'selected', label: 'Selected' },
  { id: 'rejected', label: 'Rejected' },
];

export function EmployerATSPage() {
  const [searchParams] = useSearchParams();
  const { toast } = useAuth();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<'table' | 'pipeline'>('table');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [jobIdFilter, setJobIdFilter] = useState(searchParams.get('jobId') || 'all');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');

  // Interview Modal State
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [ivDate, setIvDate] = useState(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
  const [ivTime, setIvTime] = useState('14:00');
  const [ivDuration, setIvDuration] = useState('45');
  const [ivType, setIvType] = useState<'Video' | 'Phone' | 'On-site' | 'Technical Assessment'>('Video');
  const [ivLocation, setIvLocation] = useState('https://meet.vanguardhire.io/interview-room');
  const [ivNotes, setIvNotes] = useState('');

  const { data: jobsData } = useQuery<{ jobs: any[] }>({
    queryKey: ['employer-jobs'],
    queryFn: () => apiRequest('/api/employer/jobs'),
  });

  const { data, isLoading } = useQuery<{ applicants: any[] }>({
    queryKey: ['employer-applicants', q, statusFilter, jobIdFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (jobIdFilter !== 'all') params.set('jobId', jobIdFilter);
      return apiRequest(`/api/employer/applicants?${params.toString()}`);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest(`/api/employer/applicants/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['employer-applicants'] });
      queryClient.invalidateQueries({ queryKey: ['employer-dashboard'] });
      toast({ title: res.message, variant: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Stage update failed', description: err.message, variant: 'error' });
    },
  });

  const noteMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      apiRequest(`/api/employer/applicants/${id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      setNoteInput('');
      queryClient.invalidateQueries({ queryKey: ['employer-applicants'] });
      toast({ title: 'Private note added', variant: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Could not add note', description: err.message, variant: 'error' });
    },
  });

  const scheduleInterviewMutation = useMutation({
    mutationFn: (applicationId: string) =>
      apiRequest('/api/employer/interviews', {
        method: 'POST',
        body: JSON.stringify({
          applicationId,
          date: ivDate,
          time: ivTime,
          durationMinutes: Number(ivDuration),
          type: ivType,
          locationOrLink: ivLocation,
          notes: ivNotes,
        }),
      }),
    onSuccess: (res) => {
      setInterviewOpen(false);
      setIvNotes('');
      queryClient.invalidateQueries({ queryKey: ['employer-applicants'] });
      queryClient.invalidateQueries({ queryKey: ['employer-interviews'] });
      queryClient.invalidateQueries({ queryKey: ['employer-dashboard'] });
      toast({ title: res.message, variant: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Scheduling failed', description: err.message, variant: 'error' });
    },
  });

  const applicants = data?.applicants || [];
  const selectedApp = applicants.find((a) => a.id === selectedAppId) || null;

  const handleDownloadResume = async (resumeId: string, name: string) => {
    try {
      await downloadAuthorizedFile(`/api/candidate/resumes/${resumeId}/download`, name);
    } catch (err) {
      toast({ title: 'Resume download failed', description: (err as Error).message, variant: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Applicant Tracking System
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review candidates, move applicants through hiring stages, add private team notes, and schedule interviews.
          </p>
        </div>

        <div className="inline-flex p-1 bg-slate-200/70 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md ${
              viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Applicant Table
          </button>
          <button
            type="button"
            onClick={() => setViewMode('pipeline')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md ${
              viewMode === 'pipeline' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Pipeline Board
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search candidates by name, skill, or role…"
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg"
          />
        </div>
        <div className="md:col-span-4">
          <select
            aria-label="Filter by job posting"
            value={jobIdFilter}
            onChange={(e) => setJobIdFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
          >
            <option value="all">All Job Postings</option>
            {(jobsData?.jobs || []).map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <select
            aria-label="Filter by stage"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
          >
            <option value="all">All Stages</option>
            {PIPELINE_COLUMNS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <LoadingRows count={4} />
      ) : applicants.length === 0 ? (
        <EmptyState
          title="No matching applicants"
          description="Adjust your filters or wait for candidates to apply to your open roles."
        />
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Candidate</th>
                <th className="py-3 px-4">Job Applied</th>
                <th className="py-3 px-4">Skills &amp; Exp</th>
                <th className="py-3 px-4">Applied</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {applicants.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/60">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={app.candidate.avatarUrl} name={app.candidate.name} size="sm" />
                      <div>
                        <p className="font-semibold text-slate-900">{app.candidate.name}</p>
                        <p className="text-xs text-slate-500">{app.candidate.location || app.candidate.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-slate-800">
                    {app.jobTitle}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600">
                    <p className="font-mono tabular-nums">{app.candidate.yearsOfExperience} yrs exp</p>
                    <p className="text-slate-500 truncate max-w-[200px]">
                      {app.candidate.skills.slice(0, 3).join(' · ')}
                    </p>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                    {formatShortDate(app.submittedAt)}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <StatusText status={app.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedAppId(app.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-navy-900 hover:bg-blue-600 rounded-lg whitespace-nowrap"
                    >
                      Inspect Candidate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Animated Pipeline View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 items-start">
          {PIPELINE_COLUMNS.map((col) => {
            const colApps = applicants.filter((a) => a.status === col.id);
            return (
              <div
                key={col.id}
                className="bg-slate-100/80 rounded-xl border border-slate-200 p-3 space-y-3 min-h-[260px]"
              >
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-bold text-slate-800">{col.label}</h2>
                  <span className="font-mono text-xs font-semibold text-slate-500 tabular-nums">
                    {colApps.length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {colApps.map((app) => (
                    <motion.button
                      layout
                      key={app.id}
                      type="button"
                      onClick={() => setSelectedAppId(app.id)}
                      className="w-full text-left bg-white rounded-lg border border-slate-200 p-3 hover:border-blue-400 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar src={app.candidate.avatarUrl} name={app.candidate.name} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {app.candidate.name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">{app.jobTitle}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500 truncate">
                        {app.candidate.skills.slice(0, 3).join(' · ')}
                      </p>
                    </motion.button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Candidate Slide-Over Drawer */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy-950/55 backdrop-blur-[1px]">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Candidate details for ${selectedApp.candidate.name}`}
            className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl border-l border-slate-200 p-6 sm:p-8 space-y-6"
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3.5">
                <Avatar src={selectedApp.candidate.avatarUrl} name={selectedApp.candidate.name} size="lg" />
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    {selectedApp.candidate.name}
                  </h2>
                  <p className="text-xs text-slate-600">{selectedApp.candidate.headline || selectedApp.candidate.email}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Applied for <span className="font-semibold text-slate-800">{selectedApp.jobTitle}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppId(null)}
                aria-label="Close candidate drawer"
                className="p-2 text-slate-500 hover:text-slate-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stage Selector & Quick Actions */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-700">Pipeline Stage</p>
              <div className="flex flex-wrap gap-2">
                {PIPELINE_COLUMNS.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate({ id: selectedApp.id, status: st.id })}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      selectedApp.status === st.id
                        ? 'bg-navy-900 text-white border-navy-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                {selectedApp.resume && (
                  <button
                    type="button"
                    onClick={() =>
                      void handleDownloadResume(
                        selectedApp.resume.id,
                        selectedApp.resume.originalName
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-navy-900 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Resume ({selectedApp.resume.originalName})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setInterviewOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Schedule Interview</span>
                </button>
                <Link
                  to={`/dashboard/employer/messages?applicationId=${selectedApp.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Message Candidate</span>
                </Link>
              </div>
            </div>

            {/* Candidate Background & Screening Answers */}
            <div className="space-y-4 pt-4 border-t border-slate-200 text-sm">
              <div>
                <h3 className="text-xs font-semibold text-slate-500">Skills &amp; Experience</h3>
                <p className="mt-1 text-slate-800">
                  {selectedApp.candidate.yearsOfExperience} years ·{' '}
                  {selectedApp.candidate.skills.join(' · ') || 'No skills listed'}
                </p>
              </div>

              {selectedApp.coverLetter && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500">Cover Note</h3>
                  <p className="mt-1 text-slate-700 leading-relaxed whitespace-pre-line">
                    {selectedApp.coverLetter}
                  </p>
                </div>
              )}

              {selectedApp.screeningAnswers?.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500">Screening Responses</h3>
                  <div className="mt-2 space-y-2.5">
                    {selectedApp.screeningAnswers.map((ans: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <p className="text-xs font-semibold text-slate-800">{ans.question}</p>
                        <p className="mt-1 text-xs text-slate-600">{ans.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Private Internal Recruiter Notes (Never Exposed to Candidate) */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>Private Internal Recruiter Notes (Hidden from Candidate)</span>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (noteInput.trim()) {
                    noteMutation.mutate({ id: selectedApp.id, content: noteInput.trim() });
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Add internal evaluation note for your hiring team…"
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <button
                  type="submit"
                  disabled={noteMutation.isPending || !noteInput.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-navy-900 rounded-lg disabled:opacity-40"
                >
                  Add Note
                </button>
              </form>

              <div className="space-y-2">
                {(selectedApp.internalNotes || []).map((n: any) => (
                  <div key={n.id} className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 text-xs">
                    <p className="text-slate-800">{n.content}</p>
                    <p className="mt-1 text-slate-500">
                      {n.authorName} · {formatShortDate(n.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {interviewOpen && selectedApp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="schedule-iv-title"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/65 p-4"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              scheduleInterviewMutation.mutate(selectedApp.id);
            }}
            className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <h3 id="schedule-iv-title" className="font-display text-lg font-bold text-slate-900">
              Schedule Interview
            </h3>
            <p className="text-xs text-slate-500">
              {selectedApp.candidate.name} · {selectedApp.jobTitle}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={ivDate}
                  onChange={(e) => setIvDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Time</label>
                <input
                  type="time"
                  required
                  value={ivTime}
                  onChange={(e) => setIvTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                <select
                  value={ivType}
                  onChange={(e) => setIvType(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Video">Video</option>
                  <option value="Phone">Phone</option>
                  <option value="On-site">On-site</option>
                  <option value="Technical Assessment">Technical Assessment</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (min)</label>
                <input
                  type="number"
                  min={15}
                  max={240}
                  value={ivDuration}
                  onChange={(e) => setIvDuration(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Meeting Link or Office Location
              </label>
              <input
                type="text"
                required
                value={ivLocation}
                onChange={(e) => setIvLocation(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Candidate Instructions / Notes
              </label>
              <textarea
                rows={3}
                value={ivNotes}
                onChange={(e) => setIvNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInterviewOpen(false)}
                className="px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={scheduleInterviewMutation.isPending}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                {scheduleInterviewMutation.isPending ? 'Scheduling…' : 'Confirm Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export function EmployerInterviewsPage() {
  const { toast } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ interviews: any[] }>({
    queryKey: ['employer-interviews'],
    queryFn: () => apiRequest('/api/employer/interviews'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest(`/api/employer/interviews/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employer-interviews'] });
      toast({ title: 'Interview status updated', variant: 'success' });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Interview Schedule
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Coordinate candidate interviews across all active job pipelines.
        </p>
      </div>

      {isLoading ? (
        <LoadingRows count={3} />
      ) : !data?.interviews || data.interviews.length === 0 ? (
        <EmptyState
          title="No interviews scheduled yet"
          description="Open an applicant in the ATS to schedule a video, phone, or on-site interview."
          action={
            <Link to="/dashboard/employer/ats" className="px-4 py-2 text-sm font-semibold text-white bg-navy-900 rounded-lg">
              Open ATS
            </Link>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {data.interviews.map((iv) => (
            <div key={iv.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <p className="font-display text-base font-bold text-slate-900">
                    {iv.candidateName}
                  </p>
                  <StatusText status={iv.status} />
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{iv.jobTitle} · {iv.type}</p>
                <p className="mt-1.5 text-xs font-mono text-blue-700 tabular-nums">
                  {iv.date} at {iv.time} ({iv.durationMinutes} min)
                </p>
                {iv.notes && <p className="mt-1.5 text-xs text-slate-500">{iv.notes}</p>}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {isSafeExternalUrl(iv.locationOrLink) && (
                  <a
                    href={iv.locationOrLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-navy-900 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    <span>Join</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {iv.status === 'scheduled' && (
                  <>
                    <button
                      type="button"
                      onClick={() => updateMutation.mutate({ id: iv.id, status: 'completed' })}
                      className="px-3 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50"
                    >
                      Mark Completed
                    </button>
                    <button
                      type="button"
                      onClick={() => updateMutation.mutate({ id: iv.id, status: 'cancelled' })}
                      className="px-3 py-1.5 text-xs font-semibold text-red-700 border border-red-200 rounded-lg hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
