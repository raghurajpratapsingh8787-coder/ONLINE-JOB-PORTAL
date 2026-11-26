import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, MapPin, Search, Briefcase } from 'lucide-react';
import { motion } from 'motion/react';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { JobCard } from '../../components/jobs/JobCard';
import { Avatar, CompanyMark, EmptyState, LoadingRows } from '../../components/common/UI';
import type { CategorySummary, CompanySummary, JobSummary } from '../../types';

interface HomeData {
  featuredJobs: JobSummary[];
  recentJobs: JobSummary[];
  remoteJobs: JobSummary[];
  categories: CategorySummary[];
  topCompanies: CompanySummary[];
  stats: {
    activeJobs: number;
    verifiedCompanies: number;
    registeredCandidates: number;
    placementsCompleted: number;
    remoteRoles: number;
  };
}

export function HomePage() {
  const navigate = useNavigate();
  const { user, toast } = useAuth();
  const queryClient = useQueryClient();

  const [keyword, setKeyword] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [employmentType, setEmploymentType] = useState('all');
  const [feedTab, setFeedTab] = useState<'recent' | 'remote'>('recent');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterDone, setNewsletterDone] = useState(false);

  const { data, isLoading } = useQuery<HomeData>({
    queryKey: ['public-home'],
    queryFn: () => apiRequest('/api/public/home'),
  });

  const { data: suggestionData } = useQuery<{ suggestions: string[] }>({
    queryKey: ['hero-suggestions', keyword],
    queryFn: () => apiRequest(`/api/public/jobs/suggestions?q=${encodeURIComponent(keyword)}`),
    enabled: keyword.trim().length >= 2,
  });

  const saveJobMutation = useMutation({
    mutationFn: (jobId: string) =>
      apiRequest(`/api/candidate/saved-jobs/${jobId}`, { method: 'POST' }),
    onSuccess: (res) => {
      toast({ title: res.message || 'Updated saved jobs', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['public-home'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Unable to save job', description: err.message, variant: 'error' });
    },
  });

  const newsletterMutation = useMutation({
    mutationFn: (email: string) =>
      apiRequest('/api/public/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    onSuccess: (res) => {
      setNewsletterDone(true);
      setNewsletterEmail('');
      toast({ title: 'Subscribed', description: res.message, variant: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Subscription failed', description: err.message, variant: 'error' });
    },
  });

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set('q', keyword.trim());
    if (locationInput.trim()) params.set('location', locationInput.trim());
    if (employmentType !== 'all') params.set('employmentType', employmentType);
    navigate(`/jobs?${params.toString()}`);
  };

  const handleToggleSave = (jobId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'candidate') {
      toast({ title: 'Candidate feature', description: 'Sign in as a Candidate to bookmark jobs.' });
      return;
    }
    saveJobMutation.mutate(jobId);
  };

  const stats = data?.stats;

  return (
    <div>
      {/* Hero Section: Full-Bleed Architectural Visual + Measured Scrim + Animated Search Bar */}
      <section className="relative bg-navy-950 text-white overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/src/assets/images/hero_recruitment_workspace_1795709930227.jpg"
            alt="Modern glass-walled technology headquarters workspace"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/90 to-navy-900/75" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-3xl"
          >
            <p className="text-sm font-medium text-cyan-300 tracking-wide">
              Verified Employers · Direct Hiring Teams · Transparent Compensation
            </p>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] text-white">
              Find Your Dream Career
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              Discover vetted roles in software engineering, data science, security, and design. Apply with private resume control and track every stage directly with hiring teams.
            </p>
          </motion.div>

          {/* Animated Job Search Bar */}
          <motion.form
            onSubmit={handleHeroSearch}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="mt-9 bg-white rounded-xl p-2.5 shadow-xl border border-slate-200 max-w-5xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
              <div className="md:col-span-5 relative">
                <label htmlFor="hero-keyword" className="sr-only">
                  Search by job title, skill, or company
                </label>
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="hero-keyword"
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Job title, skill, or company (e.g. TypeScript)"
                  className="w-full pl-10 pr-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent rounded-lg focus:outline-none focus:bg-slate-50"
                />
                {suggestionData?.suggestions && suggestionData.suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1">
                    {suggestionData.suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setKeyword(s)}
                        className="w-full text-left px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-3 relative md:border-l border-slate-200">
                <label htmlFor="hero-location" className="sr-only">
                  Location
                </label>
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="hero-location"
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="City or Remote"
                  className="w-full pl-10 pr-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent rounded-lg focus:outline-none focus:bg-slate-50"
                />
              </div>

              <div className="md:col-span-2 md:border-l border-slate-200">
                <label htmlFor="hero-job-type" className="sr-only">
                  Employment type
                </label>
                <select
                  id="hero-job-type"
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  className="w-full px-3 py-3 text-sm text-slate-700 bg-transparent rounded-lg focus:outline-none focus:bg-slate-50"
                >
                  <option value="all">All Types</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Internship">Internship</option>
                  <option value="Freelance">Freelance</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
                >
                  Search Jobs
                </button>
              </div>
            </div>
          </motion.form>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
            <Link
              to="/jobs"
              className="inline-flex items-center gap-2 text-white font-medium hover:text-cyan-300 transition-colors"
            >
              <span>Browse all open roles</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <span className="hidden sm:inline text-slate-600" aria-hidden="true">|</span>
            <Link
              to="/register?role=employer"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Hiring? Post a verified vacancy
            </Link>
          </div>
        </div>
      </section>

      {/* Full-Width Career Statistics Strip */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            <div>
              <p className="font-mono text-3xl font-bold text-navy-900 tabular-nums">
                {stats ? stats.activeJobs : '—'}
              </p>
              <p className="mt-1 text-sm text-slate-600">Published active job openings</p>
            </div>
            <div>
              <p className="font-mono text-3xl font-bold text-navy-900 tabular-nums">
                {stats ? stats.verifiedCompanies : '—'}
              </p>
              <p className="mt-1 text-sm text-slate-600">Verified hiring organizations</p>
            </div>
            <div>
              <p className="font-mono text-3xl font-bold text-navy-900 tabular-nums">
                {stats ? stats.remoteRoles : '—'}
              </p>
              <p className="mt-1 text-sm text-slate-600">Remote-ready roles available</p>
            </div>
            <div>
              <p className="font-mono text-3xl font-bold text-navy-900 tabular-nums">
                {stats ? stats.placementsCompleted : '—'}
              </p>
              <p className="mt-1 text-sm text-slate-600">Completed candidate placements</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Jobs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Featured Roles
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">
              High-priority openings from verified employers with published salary ranges.
            </p>
          </div>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap"
          >
            <span>Explore all jobs</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="mt-8">
          {isLoading ? (
            <LoadingRows count={3} />
          ) : data?.featuredJobs && data.featuredJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.featuredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onToggleSave={handleToggleSave}
                  savingId={saveJobMutation.isPending ? saveJobMutation.variables : null}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No featured openings right now"
              description="New verified vacancies are reviewed daily. Browse all active listings or check back shortly."
              action={
                <Link
                  to="/jobs"
                  className="px-4 py-2 text-sm font-semibold bg-navy-900 text-white rounded-lg"
                >
                  Browse All Jobs
                </Link>
              }
            />
          )}
        </div>
      </section>

      {/* Popular Job Categories */}
      <section className="bg-white border-y border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Popular Job Categories
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Filter live openings across core engineering, data, security, and business disciplines.
              </p>
            </div>
            <Link
              to="/categories"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              <span>All categories</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(data?.categories || []).slice(0, 8).map((cat) => (
              <Link
                key={cat.id}
                to={`/jobs?category=${encodeURIComponent(cat.name)}`}
                className="group p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {cat.name}
                  </h3>
                  <span className="font-mono text-xs font-semibold text-slate-500 tabular-nums">
                    {cat.openRolesCount ?? 0}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {cat.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recently Posted & Remote Opportunities (Interactive Segmented Switch) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {feedTab === 'recent' ? 'Recently Posted Jobs' : 'Remote Opportunities'}
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">
              {feedTab === 'recent'
                ? 'Fresh openings published directly by verified hiring teams.'
                : 'Location-flexible roles across North America, Europe, and global distributed teams.'}
            </p>
          </div>

          <div className="inline-flex items-center p-1 bg-slate-200/70 rounded-lg self-start">
            <button
              type="button"
              onClick={() => setFeedTab('recent')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                feedTab === 'recent'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Recently Posted
            </button>
            <button
              type="button"
              onClick={() => setFeedTab('remote')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                feedTab === 'remote'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Remote Roles
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(feedTab === 'recent' ? data?.recentJobs : data?.remoteJobs)?.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onToggleSave={handleToggleSave}
              savingId={saveJobMutation.isPending ? saveJobMutation.variables : null}
            />
          ))}
        </div>
      </section>

      {/* Top Hiring Companies */}
      <section className="bg-white border-y border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Top Hiring Companies
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Every verified employer undergoes registration review prior to direct publishing.
              </p>
            </div>
            <Link
              to="/companies"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              <span>View company directory</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {(data?.topCompanies || []).map((comp) => (
              <Link
                key={comp.id}
                to={`/jobs?companyId=${comp.id}`}
                className="p-5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-colors flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <CompanyMark logoUrl={comp.logoUrl} name={comp.name} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-display text-sm font-bold text-slate-900 truncate">
                          {comp.name}
                        </h3>
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      </div>
                      <p className="text-xs text-slate-500 truncate">{comp.industry}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {comp.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span>{comp.headquarters}</span>
                  <span className="font-mono font-semibold text-blue-700 tabular-nums">
                    {comp.openRolesCount} open
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works (Asymmetric Split + Editorial Image) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              How VanguardHire Works
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-xl">
              Built for both career seekers and enterprise placement teams with strict document privacy and real-time pipeline visibility.
            </p>

            <div className="mt-8 space-y-6">
              <div className="pb-6 border-b border-slate-200">
                <h3 className="font-display text-base font-semibold text-slate-900">
                  01. Build a structured profile &amp; private resume vault
                </h3>
                <p className="mt-1.5 text-sm text-slate-600">
                  Upload PDF or DOCX resumes into private storage accessible only to employers you apply to, and track your profile readiness score.
                </p>
              </div>
              <div className="pb-6 border-b border-slate-200">
                <h3 className="font-display text-base font-semibold text-slate-900">
                  02. Apply with screening context &amp; real-time status tracking
                </h3>
                <p className="mt-1.5 text-sm text-slate-600">
                  Filter roles by compensation, work mode, and experience level, submit targeted screening answers, and follow every ATS stage live.
                </p>
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-slate-900">
                  03. Schedule interviews &amp; message authorized recruiters directly
                </h3>
                <p className="mt-1.5 text-sm text-slate-600">
                  Receive instant Socket.IO notifications when shortlisted or invited to technical panels, with application-linked messaging.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[320px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              <img
                src="/src/assets/images/office_spotlight_team_1795709931802.jpg"
                alt="Engineers collaborating over architecture documentation in a bright office"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Attributable Testimonials */}
      <section className="bg-white border-t border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Trusted by Candidates &amp; Hiring Directors
          </h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <blockquote className="p-6 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between gap-5">
              <p className="text-sm text-slate-700 leading-relaxed">
                “Before VanguardHire, my applications disappeared into generic portals without updates. Here I uploaded my resume once, tracked every stage from review to panel scheduling, and closed a Senior Platform offer in 19 days.”
              </p>
              <footer className="flex items-center gap-3.5">
                <Avatar
                  src="/src/assets/images/avatar_candidate_maya_1795709934680.jpg"
                  name="Maya Lin"
                  size="md"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Maya Lin</p>
                  <p className="text-xs text-slate-500">Senior Full-Stack Engineer · Placed via VanguardHire</p>
                </div>
              </footer>
            </blockquote>

            <blockquote className="p-6 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between gap-5">
              <p className="text-sm text-slate-700 leading-relaxed">
                “Consolidating job postings, screening answers, private recruiter notes, and interview scheduling into one ATS cut our engineering time-to-shortlist by 42% across three quarterly hiring cohorts.”
              </p>
              <footer className="flex items-center gap-3.5">
                <Avatar
                  src="/src/assets/images/avatar_recruiter_david_1795709932968.jpg"
                  name="David Chen"
                  size="md"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">David Chen</p>
                  <p className="text-xs text-slate-500">Director of Engineering Talent · ApexCloud Systems</p>
                </div>
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* Newsletter Subscription */}
      <section className="bg-navy-900 text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Weekly Verified Roles &amp; Market Benchmarks
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Receive a concise weekly digest of newly approved engineering, AI, finance, and design roles with salary transparency.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newsletterEmail.trim()) {
                newsletterMutation.mutate(newsletterEmail.trim());
              }
            }}
            className="w-full lg:w-auto flex flex-col sm:flex-row gap-2.5 min-w-0 sm:min-w-[400px]"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address for weekly job digest
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="you@company.com"
              className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={newsletterMutation.isPending}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white transition-colors whitespace-nowrap disabled:opacity-60"
            >
              {newsletterDone ? 'Subscribed' : newsletterMutation.isPending ? 'Subscribing…' : 'Subscribe'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
