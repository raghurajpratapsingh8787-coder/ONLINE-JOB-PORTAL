import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { LoadingRows, StatusText } from '../../components/common/UI';

export function AdminOverview() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['admin-overview'],
    queryFn: () => apiRequest('/api/admin/overview'),
  });

  if (isLoading) return <LoadingRows count={4} />;

  const stats = data?.stats || {};
  const kpis = [
    { label: 'Total Users', value: stats.totalUsers ?? 0 },
    { label: 'Candidates', value: stats.totalCandidates ?? 0 },
    { label: 'Employers', value: stats.totalEmployers ?? 0 },
    { label: 'Verified Companies', value: stats.verifiedCompanies ?? 0 },
    { label: 'Active Jobs', value: stats.activeJobs ?? 0 },
    { label: 'Pending Approvals', value: stats.pendingJobApprovals ?? 0 },
    { label: 'Total Applications', value: stats.totalApplications ?? 0 },
    { label: 'Placement Rate', value: `${stats.hiringSuccessRate ?? 0}%` },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Platform Governance &amp; Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Super Admin oversight across users, verified employers, moderation queues, and placement trends.
          </p>
        </div>

        <Link
          to="/dashboard/admin/moderation"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg self-start whitespace-nowrap"
        >
          <span>Review Pending Queue ({(stats.pendingJobApprovals ?? 0) + (stats.pendingVerifications ?? 0)})</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* KPI Grid */}
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

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-display text-base font-bold text-slate-900">
            Monthly Platform Growth (Registrations, Jobs &amp; Applications)
          </h2>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.monthlyTrends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 12, fill: '#475569' }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="applications"
                  name="Applications"
                  stroke="#2563eb"
                  fill="#2563eb"
                  fillOpacity={0.14}
                />
                <Area
                  type="monotone"
                  dataKey="registrations"
                  name="Registrations"
                  stroke="#0891b2"
                  fill="#0891b2"
                  fillOpacity={0.12}
                />
                <Area
                  type="monotone"
                  dataKey="jobs"
                  name="Job Postings"
                  stroke="#4f46e5"
                  fill="#4f46e5"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-display text-base font-bold text-slate-900">
            Popular Job Categories
          </h2>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.popularCategories || []} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#475569' }} />
                <YAxis dataKey="name" type="category" width={115} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip />
                <Bar dataKey="count" name="Postings" fill="#0b132b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Row 2: Location Distribution & Top Companies */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-display text-base font-bold text-slate-900">
            Location-Wise Job Distribution
          </h2>
          <div className="mt-5 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.locationDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="location" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#475569' }} />
                <Tooltip />
                <Bar dataKey="count" name="Openings" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="font-display text-base font-bold text-slate-900">Top Hiring Companies</h2>
            <Link to="/dashboard/admin/moderation" className="text-xs font-semibold text-blue-600 hover:underline">
              Manage Companies
            </Link>
          </div>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-2.5 pr-4">Company</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Jobs</th>
                  <th className="py-2.5 pl-3 text-right">Apps</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {(data?.topCompanies || []).map((c: any) => (
                  <tr key={c.id}>
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.industry}</p>
                    </td>
                    <td className="py-3 px-3">
                      <StatusText status={c.verificationStatus} />
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">{c.jobsCount}</td>
                    <td className="py-3 pl-3 text-right font-mono tabular-nums">{c.applicationsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
