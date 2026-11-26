import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, Calendar, CheckCircle2, Plus, ShieldAlert, Upload } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Avatar, CompanyMark, EmptyState, LoadingRows, StatusText } from '../../components/common/UI';
import { formatRelativeDate } from '../../lib/format';

export function EmployerOverview() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['employer-dashboard'],
    queryFn: () => apiRequest('/api/employer/dashboard'),
  });

  if (isLoading) return <LoadingRows count={4} />;

  const stats = data?.stats || {};
  const company = data?.company;

  const kpis = [
    { label: 'Total Postings', value: stats.totalJobs ?? 0 },
    { label: 'Active Jobs', value: stats.activeJobs ?? 0 },
    { label: 'Closed Jobs', value: stats.closedJobs ?? 0 },
    { label: 'Total Applications', value: stats.totalApplications ?? 0 },
    { label: 'New Applicants', value: stats.newApplicants ?? 0 },
    { label: 'Shortlisted', value: stats.shortlistedCandidates ?? 0 },
    { label: 'Interviews', value: stats.interviewsScheduled ?? 0 },
    { label: 'Hired', value: stats.hiredCandidates ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {company?.name || 'Employer'} Recruiting Overview
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitor active vacancies, candidate pipeline velocity, and interview schedules.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start">
          <Link
            to="/dashboard/employer/ats"
            className="px-4 py-2 text-sm font-semibold text-navy-900 border border-slate-300 bg-white hover:bg-slate-50 rounded-lg whitespace-nowrap"
          >
            Open ATS Pipeline
          </Link>
          <Link
            to="/dashboard/employer/jobs?create=1"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Post New Job</span>
          </Link>
        </div>
      </div>

      {company && company.verificationStatus !== 'verified' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Company Verification Status: {company.verificationStatus}
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Only verified employers can publish jobs directly. Submit verification documents so Super Admins can approve your organization.
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/employer/company"
            className="px-3.5 py-2 text-xs font-semibold text-amber-900 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 whitespace-nowrap self-start"
          >
            Complete Verification
          </Link>
        </div>
      )}

      {/* 8 KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="mt-2 font-mono text-2xl font-bold text-navy-900 tabular-nums">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recruitment Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-display text-base font-bold text-slate-900">
            Candidate Conversion Funnel
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Progression across ATS recruitment stages
          </p>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.funnelData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="stage" tick={{ fontSize: 12, fill: '#475569' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#475569' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-display text-base font-bold text-slate-900">
            Posting Reach &amp; Applicants
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Views per active vacancy across your company
          </p>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.jobPerformance || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="title" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#475569' }} />
                <Tooltip />
                <Bar dataKey="views" name="Views" fill="#0b132b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="applicants" name="Applicants" fill="#0891b2" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Recent Applicants & Upcoming Interviews */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="font-display text-base font-bold text-slate-900">Recent Applicants</h2>
            <Link
              to="/dashboard/employer/ats"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
            >
              <span>Review in ATS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {data?.recentApplicants?.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {data.recentApplicants.map((app: any) => (
                <div key={app.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={app.candidateAvatar} name={app.candidateName} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {app.candidateName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {app.jobTitle} · {formatRelativeDate(app.submittedAt)}
                      </p>
                    </div>
                  </div>
                  <StatusText status={app.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="No applicants yet"
                description="Once candidates apply to your active openings, they will appear here."
              />
            </div>
          )}
        </section>

        <section className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="font-display text-base font-bold text-slate-900">Upcoming Interviews</h2>
            <Link
              to="/dashboard/employer/interviews"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Manage All
            </Link>
          </div>
          {data?.upcomingInterviews?.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {data.upcomingInterviews.map((iv: any) => (
                <div key={iv.id} className="py-3.5">
                  <p className="text-sm font-semibold text-slate-900">{iv.candidateName}</p>
                  <p className="text-xs text-slate-500">{iv.jobTitle}</p>
                  <p className="mt-1.5 text-xs font-mono text-blue-700 tabular-nums flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{iv.date} at {iv.time} · {iv.type}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No upcoming interviews scheduled.</p>
          )}
        </section>
      </div>
    </div>
  );
}

export function EmployerCompanyPage() {
  const { toast } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<any>({
    queryKey: ['employer-company'],
    queryFn: () => apiRequest('/api/employer/company'),
  });

  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [size, setSize] = useState('51-200 employees');
  const [foundedYear, setFoundedYear] = useState('');
  const [headquarters, setHeadquarters] = useState('');
  const [description, setDescription] = useState('');

  const [regNumber, setRegNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  const [docSummary, setDocSummary] = useState('');

  useEffect(() => {
    if (data?.company) {
      const c = data.company;
      setName(c.name || '');
      setWebsite(c.website || '');
      setIndustry(c.industry || '');
      setSize(c.size || '51-200 employees');
      setFoundedYear(c.foundedYear ? String(c.foundedYear) : '');
      setHeadquarters(c.headquarters || '');
      setDescription(c.description || '');
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/employer/company', {
        method: 'PUT',
        body: JSON.stringify({
          name,
          website,
          industry,
          size,
          foundedYear: foundedYear ? Number(foundedYear) : undefined,
          headquarters,
          description,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employer-company'] });
      queryClient.invalidateQueries({ queryKey: ['employer-dashboard'] });
      toast({ title: 'Company profile saved', variant: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Update failed', description: err.message, variant: 'error' });
    },
  });

  const logoMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('logo', file);
      return apiRequest('/api/employer/company/logo', { method: 'POST', body: fd });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employer-company'] });
      toast({ title: 'Company logo updated', variant: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Logo upload failed', description: err.message, variant: 'error' });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/employer/company/verification', {
        method: 'POST',
        body: JSON.stringify({
          registrationNumber: regNumber,
          taxId,
          documentSummary: docSummary,
        }),
      }),
    onSuccess: () => {
      setRegNumber('');
      setTaxId('');
      setDocSummary('');
      queryClient.invalidateQueries({ queryKey: ['employer-company'] });
      toast({ title: 'Verification submitted for Super Admin review', variant: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Submission failed', description: err.message, variant: 'error' });
    },
  });

  if (isLoading) return <LoadingRows count={3} />;
  const company = data?.company;

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Company Profile &amp; Verification
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Maintain accurate organization details displayed across all your job listings.
          </p>
        </div>
        {company && <StatusText status={company.verificationStatus} />}
      </div>

      {/* Logo & Details Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateMutation.mutate();
        }}
        className="bg-white rounded-xl border border-slate-200 p-6 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-5 border-b border-slate-100">
          <CompanyMark logoUrl={company?.logoUrl} name={name || 'Company'} size="lg" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Company Logo</p>
            <p className="text-xs text-slate-500 mt-0.5">PNG, JPG, or WebP (max 2 MB)</p>
            <label className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-navy-900 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{logoMutation.isPending ? 'Uploading…' : 'Upload New Logo'}</span>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) logoMutation.mutate(file);
                }}
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="comp-name" className="block text-xs font-semibold text-slate-700 mb-1">
              Company Name
            </label>
            <input
              id="comp-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="comp-web" className="block text-xs font-semibold text-slate-700 mb-1">
              Website URL
            </label>
            <input
              id="comp-web"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://company.com"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="comp-ind" className="block text-xs font-semibold text-slate-700 mb-1">
              Industry
            </label>
            <input
              id="comp-ind"
              type="text"
              required
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="comp-hq" className="block text-xs font-semibold text-slate-700 mb-1">
              Headquarters
            </label>
            <input
              id="comp-hq"
              type="text"
              required
              value={headquarters}
              onChange={(e) => setHeadquarters(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="comp-size" className="block text-xs font-semibold text-slate-700 mb-1">
              Company Size
            </label>
            <select
              id="comp-size"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="1-10 employees">1-10 employees</option>
              <option value="11-50 employees">11-50 employees</option>
              <option value="51-200 employees">51-200 employees</option>
              <option value="201-500 employees">201-500 employees</option>
              <option value="501-1,000 employees">501-1,000 employees</option>
              <option value="1,000+ employees">1,000+ employees</option>
            </select>
          </div>
          <div>
            <label htmlFor="comp-year" className="block text-xs font-semibold text-slate-700 mb-1">
              Founded Year
            </label>
            <input
              id="comp-year"
              type="number"
              value={foundedYear}
              onChange={(e) => setFoundedYear(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label htmlFor="comp-desc" className="block text-xs font-semibold text-slate-700 mb-1">
            Company Description
          </label>
          <textarea
            id="comp-desc"
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
          />
        </div>

        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-navy-900 hover:bg-blue-600 rounded-lg"
        >
          {updateMutation.isPending ? 'Saving…' : 'Save Company Details'}
        </button>
      </form>

      {/* Verification Section */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-slate-900">
          Employer Verification Credentials
        </h2>

        {company?.verificationStatus === 'verified' ? (
          <div className="flex items-center gap-2.5 text-sm text-emerald-700 font-medium">
            <CheckCircle2 className="w-5 h-5" />
            <span>Your organization is verified and authorized to publish openings directly.</span>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              verifyMutation.mutate();
            }}
            className="space-y-4"
          >
            <p className="text-xs text-slate-600">
              Submit your business registration details for Super Admin verification. Documents are confidential and never shown publicly.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ver-reg" className="block text-xs font-semibold text-slate-700 mb-1">
                  Business Registration Number
                </label>
                <input
                  id="ver-reg"
                  type="text"
                  required
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  placeholder="e.g. DE-9823410"
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="ver-tax" className="block text-xs font-semibold text-slate-700 mb-1">
                  Tax ID / EIN (Optional)
                </label>
                <input
                  id="ver-tax"
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label htmlFor="ver-doc" className="block text-xs font-semibold text-slate-700 mb-1">
                Verification Evidence Summary
              </label>
              <textarea
                id="ver-doc"
                required
                minLength={10}
                rows={3}
                value={docSummary}
                onChange={(e) => setDocSummary(e.target.value)}
                placeholder="Describe official domain ownership, incorporation certificate, or placement cell authorization…"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <button
              type="submit"
              disabled={verifyMutation.isPending}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              {verifyMutation.isPending ? 'Submitting…' : 'Submit for Verification'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
