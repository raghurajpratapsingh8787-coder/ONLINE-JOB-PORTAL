import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, ExternalLink, Mail, MapPin, Search } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { Avatar, CompanyMark, EmptyState, LoadingRows } from '../../components/common/UI';
import type { CategorySummary, CompanySummary } from '../../types';

export function CompaniesPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery<{ companies: CompanySummary[] }>({
    queryKey: ['public-companies'],
    queryFn: () => apiRequest('/api/public/companies'),
  });

  const filtered = (data?.companies || []).filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.industry.toLowerCase().includes(search.toLowerCase()) ||
      c.headquarters.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
            Hiring Companies
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Explore vetted organizations actively recruiting across engineering, finance, AI, and design.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by company, industry, or city…"
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg"
          />
        </div>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <LoadingRows count={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No matching organizations"
            description="Adjust your filter text to view all active employers on VanguardHire."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((comp) => (
              <article
                key={comp.id}
                className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between gap-5"
              >
                <div>
                  <div className="flex items-start gap-3.5">
                    <CompanyMark logoUrl={comp.logoUrl} name={comp.name} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h2 className="font-display text-base font-bold text-slate-900 truncate">
                          {comp.name}
                        </h2>
                        {comp.verificationStatus === 'verified' && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {comp.industry} · {comp.size}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-slate-600 leading-relaxed line-clamp-3">
                    {comp.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5" />
                    {comp.headquarters}
                  </span>
                  <div className="flex items-center gap-3">
                    {comp.website && (
                      <a
                        href={comp.website}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Visit ${comp.name} website`}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <Link
                      to={`/jobs?companyId=${comp.id}`}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap"
                    >
                      {comp.openRolesCount ?? 0} Open Roles →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CategoriesPage() {
  const { data, isLoading } = useQuery<{ categories: CategorySummary[] }>({
    queryKey: ['public-categories'],
    queryFn: () => apiRequest('/api/public/categories'),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="pb-6 border-b border-slate-200">
        <h1 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
          Job Categories
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Browse openings organized by specialization across all 12 core industry verticals.
        </p>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <LoadingRows count={4} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(data?.categories || []).map((cat) => (
              <Link
                key={cat.id}
                to={`/jobs?category=${encodeURIComponent(cat.name)}`}
                className="group bg-white rounded-xl border border-slate-200 p-6 hover:border-blue-300 transition-colors flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {cat.name}
                    </h2>
                    <span className="font-mono text-sm font-semibold text-blue-700 tabular-nums">
                      {cat.openRolesCount ?? 0}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{cat.description}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                  <span>View matching openings</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const RESOURCES_GUIDES = [
  {
    id: 'res-1',
    category: 'Resume Architecture',
    readTime: '6 min read',
    title: 'Quantifying Engineering & Product Impact for Technical Screening',
    summary:
      'Replace responsibility lists with before-and-after latency, throughput, revenue, and reliability metrics that recruiters and hiring managers prioritize in the first 30 seconds.',
    bullets: [
      'Lead every experience bullet with a measurable business or technical outcome.',
      'Export cleanly structured PDFs under 2 MB with selectable text for ATS parsing.',
      'Align your top 6 core skills directly with the target role qualifications.',
    ],
  },
  {
    id: 'res-2',
    category: 'Interview Preparation',
    readTime: '8 min read',
    title: 'Structuring System Design & Behavioral Loop Conversations',
    summary:
      'A practical framework for walking panels through requirements clarification, failure modes, security boundaries, and cross-functional trade-offs.',
    bullets: [
      'Clarify scale, consistency, and security constraints before sketching architecture.',
      'Use explicit Situation → Decision → Trade-off → Result narratives.',
      'Prepare 3 grounded questions about engineering cadence and roadmap ownership.',
    ],
  },
  {
    id: 'res-3',
    category: 'Offer Evaluation',
    readTime: '5 min read',
    title: 'Evaluating Base Salary, Equity Vesting, and Remote Benefits',
    summary:
      'Compare total compensation packages transparently across public companies, growth-stage startups, and remote-first global organizations.',
    bullets: [
      'Benchmark base salary against published ranges on VanguardHire listings.',
      'Review equity refresh policies, cliff terms, and bonus target payout history.',
      'Factor home-office stipends, healthcare coverage, and learning budgets into net value.',
    ],
  },
];

export function ResourcesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="pb-6 border-b border-slate-200 max-w-3xl">
        <h1 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
          Career Resources
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Practical, field-tested playbooks on technical resumes, structured interviewing, and transparent compensation negotiation.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {RESOURCES_GUIDES.map((guide, index) => (
          <article
            key={guide.id}
            className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between gap-5"
          >
            <div>
              <p className="text-xs text-slate-500">
                0{index + 1}. {guide.category} · {guide.readTime}
              </p>
              <h2 className="mt-2.5 font-display text-xl font-bold text-slate-900 leading-snug">
                {guide.title}
              </h2>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{guide.summary}</p>
              <ul className="mt-4 space-y-2 text-xs text-slate-700 list-disc pl-4">
                {guide.bullets.map((b, i) => (
                  <li key={i} className="leading-relaxed">{b}</li>
                ))}
              </ul>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <Link
                to="/jobs"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                <span>Apply these practices to live roles</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
      <section className="pb-8 border-b border-slate-200">
        <p className="text-xs font-semibold text-blue-700">About VanguardHire</p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Security-First Recruitment Infrastructure for Modern Teams &amp; Placement Cells
        </h1>
        <p className="mt-4 text-base text-slate-600 leading-relaxed max-w-3xl">
          VanguardHire combines transparent job discovery, private candidate resume vaults, an employer Applicant Tracking System, real-time Socket.IO notifications, and Super Admin governance into one unified full-stack platform.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-display text-base font-bold text-slate-900">01. Verified Employers</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Organizations submit registration details for Super Admin review before direct publishing, preventing spam vacancies.
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-display text-base font-bold text-slate-900">02. Private Document Security</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Resumes are validated by file signature, stored outside public directories, and served strictly through authorized ownership checks.
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-display text-base font-bold text-slate-900">03. Role-Based Governance</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Dedicated Candidate, Employer, and Super Admin workspaces backed by JWT rotation, HttpOnly cookies, CSRF checks, and immutable audit trails.
          </p>
        </div>
      </section>

      {/* Platform Creator & Administrator Profile (User Name & Email) */}
      <section className="bg-navy-900 text-white rounded-2xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Avatar
            src="/src/assets/images/avatar_admin_rajput_1795709933820.jpg"
            name="Raghuraj Pratap Singh"
            size="lg"
          />
          <div>
            <p className="text-xs font-medium text-cyan-300">Platform Creator &amp; Super Admin</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-white">Raghuraj Pratap Singh</h2>
            <p className="mt-1 text-sm text-slate-300">
              Full-Stack Architect · VanguardHire Online Job Portal
            </p>
          </div>
        </div>

        <a
          href="mailto:raghurajpratapsingh8787@gmail.com"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-sm font-medium text-white transition-colors whitespace-nowrap"
        >
          <Mail className="w-4 h-4 text-cyan-300" />
          <span>raghurajpratapsingh8787@gmail.com</span>
        </a>
      </section>
    </div>
  );
}
