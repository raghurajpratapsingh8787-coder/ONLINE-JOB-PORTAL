import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bookmark,
  CheckCircle2,
  Download,
  FileText,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { apiRequest, downloadAuthorizedFile } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { ConfirmDialog, EmptyState, LoadingRows } from '../../components/common/UI';
import { formatBytes, formatSalaryRange, formatShortDate } from '../../lib/format';
import type { ResumeItem } from '../../types';

export function CandidateSavedJobsPage() {
  const { toast } = useAuth();
  const queryClient = useQueryClient();

  const { data: savedData, isLoading: loadingSaved } = useQuery<{ savedJobs: any[] }>({
    queryKey: ['candidate-saved-jobs'],
    queryFn: () => apiRequest('/api/candidate/saved-jobs'),
  });

  const { data: searchData } = useQuery<{ savedSearches: any[] }>({
    queryKey: ['candidate-saved-searches'],
    queryFn: () => apiRequest('/api/candidate/saved-searches'),
  });

  const removeSavedMutation = useMutation({
    mutationFn: (jobId: string) =>
      apiRequest(`/api/candidate/saved-jobs/${jobId}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-saved-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['candidate-dashboard'] });
      toast({ title: 'Removed from saved jobs' });
    },
  });

  const deleteSearchMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/candidate/saved-searches/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-saved-searches'] });
      toast({ title: 'Saved search deleted' });
    },
  });

  const buildSearchUrl = (filters: Record<string, any>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters || {})) {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    }
    return `/jobs?${params.toString()}`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Saved Jobs &amp; Search Alerts
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Revisit bookmarked roles and re-run saved search filters in one click.
        </p>
      </div>

      {/* Saved Jobs */}
      <section className="space-y-4">
        <h2 className="font-display text-base font-bold text-slate-900">Bookmarked Openings</h2>
        {loadingSaved ? (
          <LoadingRows count={3} />
        ) : !savedData?.savedJobs || savedData.savedJobs.length === 0 ? (
          <EmptyState
            title="No saved jobs yet"
            description="Bookmark interesting roles while browsing Find Jobs to compare salaries and apply later."
            action={
              <Link to="/jobs" className="px-4 py-2 text-sm font-semibold text-white bg-navy-900 rounded-lg">
                Browse Open Roles
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedData.savedJobs.map((item) => (
              <div
                key={item.savedId}
                className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">{item.job.companyName}</p>
                      <Link
                        to={`/jobs/${item.job.id}`}
                        className="mt-0.5 block font-display text-base font-bold text-slate-900 hover:text-blue-600"
                      >
                        {item.job.title}
                      </Link>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSavedMutation.mutate(item.job.id)}
                      aria-label={`Remove ${item.job.title} from saved`}
                      className="p-1.5 text-blue-600 hover:text-red-600 rounded-lg"
                    >
                      <Bookmark className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    {item.job.location} · {item.job.workMode} · {item.job.employmentType}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold text-navy-900 tabular-nums">
                    {formatSalaryRange(item.job.salaryMin, item.job.salaryMax, item.job.salaryCurrency)}
                  </span>
                  <Link
                    to={`/jobs/${item.job.id}`}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-navy-900 rounded-lg hover:bg-blue-600"
                  >
                    Apply Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Saved Searches */}
      <section className="space-y-4">
        <h2 className="font-display text-base font-bold text-slate-900">Saved Searches</h2>
        {!searchData?.savedSearches || searchData.savedSearches.length === 0 ? (
          <p className="text-sm text-slate-500">
            Save any filter combination on the Find Jobs page to access it here.
          </p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {searchData.savedSearches.map((ss) => (
              <div key={ss.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{ss.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Saved {formatShortDate(ss.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={buildSearchUrl(ss.filters)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Run Search</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => deleteSearchMutation.mutate(ss.id)}
                    aria-label={`Delete saved search ${ss.name}`}
                    className="p-1.5 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
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

export function ResumeManagerPage() {
  const { toast } = useAuth();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<ResumeItem | null>(null);

  const { data, isLoading } = useQuery<{ resumes: ResumeItem[] }>({
    queryKey: ['candidate-resumes'],
    queryFn: () => apiRequest('/api/candidate/resumes'),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('resume', file);
      return apiRequest('/api/candidate/resumes', { method: 'POST', body: fd });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-resumes'] });
      queryClient.invalidateQueries({ queryKey: ['candidate-dashboard'] });
      toast({ title: 'Resume uploaded to private vault', variant: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Upload rejected', description: err.message, variant: 'error' });
    },
  });

  const replaceMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const fd = new FormData();
      fd.append('resume', file);
      return apiRequest(`/api/candidate/resumes/${id}/replace`, { method: 'PUT', body: fd });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-resumes'] });
      toast({ title: 'Resume file replaced', variant: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Replace failed', description: err.message, variant: 'error' });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/candidate/resumes/${id}/default`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-resumes'] });
      toast({ title: 'Default resume updated', variant: 'success' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/candidate/resumes/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['candidate-resumes'] });
      queryClient.invalidateQueries({ queryKey: ['candidate-dashboard'] });
      toast({ title: 'Resume removed', variant: 'success' });
    },
  });

  const handleDownload = async (resume: ResumeItem) => {
    try {
      await downloadAuthorizedFile(
        `/api/candidate/resumes/${resume.id}/download`,
        resume.originalName
      );
    } catch (err) {
      toast({ title: 'Download failed', description: (err as Error).message, variant: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Private Resume Manager
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            PDF &amp; DOCX files (max 5 MB) are validated by file signature and never exposed via public URLs.
          </p>
        </div>

        <label className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer self-start whitespace-nowrap">
          <Upload className="w-4 h-4" />
          <span>{uploadMutation.isPending ? 'Uploading…' : 'Upload Resume'}</span>
          <input
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate(file);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      {isLoading ? (
        <LoadingRows count={3} />
      ) : !data?.resumes || data.resumes.length === 0 ? (
        <EmptyState
          title="No resumes in your vault"
          description="Upload a PDF or DOCX resume to apply to verified vacancies."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {data.resumes.map((resume) => (
            <div
              key={resume.id}
              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="p-2.5 rounded-lg bg-slate-100 text-navy-900 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {resume.originalName}
                    </p>
                    {resume.isDefault && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                    {formatBytes(resume.sizeBytes)} · Uploaded {formatShortDate(resume.uploadedAt)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {!resume.isDefault && (
                  <button
                    type="button"
                    onClick={() => setDefaultMutation.mutate(resume.id)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    Set Default
                  </button>
                )}

                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Replace</span>
                  <input
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) replaceMutation.mutate({ id: resume.id, file });
                      e.target.value = '';
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => void handleDownload(resume)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-navy-900 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteTarget(resume)}
                  aria-label={`Delete ${resume.originalName}`}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Resume?"
        description={`Remove "${deleteTarget?.originalName}" permanently from private storage?`}
        confirmLabel="Delete Resume"
        destructive
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
