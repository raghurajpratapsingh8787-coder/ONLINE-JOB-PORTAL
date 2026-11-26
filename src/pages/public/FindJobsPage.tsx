import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellPlus, MapPin, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { JobCard } from '../../components/jobs/JobCard';
import { EmptyState, LoadingRows } from '../../components/common/UI';
import type { CategorySummary, CompanySummary, JobSummary } from '../../types';

interface JobsResponse {
  items: JobSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function FindJobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, toast } = useAuth();
  const queryClient = useQueryClient();

  const [qInput, setQInput] = useState(searchParams.get('q') || '');
  const [debouncedQ, setDebouncedQ] = useState(searchParams.get('q') || '');
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [experienceLevel, setExperienceLevel] = useState(searchParams.get('experienceLevel') || 'all');
  const [employmentType, setEmploymentType] = useState(searchParams.get('employmentType') || 'all');
  const [workMode, setWorkMode] = useState(searchParams.get('workMode') || 'all');
  const [minSalary, setMinSalary] = useState(searchParams.get('minSalary') || '');
  const [datePosted, setDatePosted] = useState(searchParams.get('datePosted') || 'all');
  const [education, setEducation] = useState(searchParams.get('education') || '');
  const [companyId, setCompanyId] = useState(searchParams.get('companyId') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [saveSearchOpen, setSaveSearchOpen] = useState(false);
  const [savedSearchName, setSavedSearchName] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(qInput);
      setPage(1);
    }, 280);
    return () => clearTimeout(timer);
  }, [qInput]);

  // Sync URL params cleanly
  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedQ) next.set('q', debouncedQ);
    if (location) next.set('location', location);
    if (category !== 'all') next.set('category', category);
    if (experienceLevel !== 'all') next.set('experienceLevel', experienceLevel);
    if (employmentType !== 'all') next.set('employmentType', employmentType);
    if (workMode !== 'all') next.set('workMode', workMode);
    if (minSalary) next.set('minSalary', minSalary);
    if (datePosted !== 'all') next.set('datePosted', datePosted);
    if (education) next.set('education', education);
    if (companyId) next.set('companyId', companyId);
    if (sort !== 'newest') next.set('sort', sort);
    if (page > 1) next.set('page', String(page));
    setSearchParams(next, { replace: true });
  }, [
    debouncedQ,
    location,
    category,
    experienceLevel,
    employmentType,
    workMode,
    minSalary,
    datePosted,
    education,
    companyId,
    sort,
    page,
    setSearchParams,
  ]);

  const queryString = new URLSearchParams({
    ...(debouncedQ ? { q: debouncedQ } : {}),
    ...(location ? { location } : {}),
    ...(category !== 'all' ? { category } : {}),
    ...(experienceLevel !== 'all' ? { experienceLevel } : {}),
    ...(employmentType !== 'all' ? { employmentType } : {}),
    ...(workMode !== 'all' ? { workMode } : {}),
    ...(minSalary ? { minSalary } : {}),
    ...(datePosted !== 'all' ? { datePosted } : {}),
    ...(education ? { education } : {}),
    ...(companyId ? { companyId } : {}),
    sort,
    page: String(page),
    limit: '9',
  }).toString();

  const { data: jobsData, isLoading, isFetching } = useQuery<JobsResponse>({
    queryKey: ['public-jobs', queryString],
    queryFn: () => apiRequest(`/api/public/jobs?${queryString}`),
  });

  const { data: catData } = useQuery<{ categories: CategorySummary[] }>({
    queryKey: ['public-categories'],
    queryFn: () => apiRequest('/api/public/categories'),
  });

  const { data: compData } = useQuery<{ companies: CompanySummary[] }>({
    queryKey: ['public-companies'],
    queryFn: () => apiRequest('/api/public/companies'),
  });

  const { data: suggestionData } = useQuery<{ suggestions: string[] }>({
    queryKey: ['job-suggestions', qInput],
    queryFn: () => apiRequest(`/api/public/jobs/suggestions?q=${encodeURIComponent(qInput)}`),
    enabled: qInput.trim().length >= 2,
  });

  const saveJobMutation = useMutation({
    mutationFn: (jobId: string) =>
      apiRequest(`/api/candidate/saved-jobs/${jobId}`, { method: 'POST' }),
    onSuccess: (res) => {
      toast({ title: res.message, variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['public-jobs'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Could not save job', description: err.message, variant: 'error' });
    },
  });

  const saveSearchMutation = useMutation({
    mutationFn: (name: string) =>
      apiRequest('/api/candidate/saved-searches', {
        method: 'POST',
        body: JSON.stringify({
          name,
          filters: {
            q: debouncedQ || undefined,
            location: location || undefined,
            category: category !== 'all' ? category : undefined,
            workMode: workMode !== 'all' ? workMode : undefined,
            employmentType: employmentType !== 'all' ? employmentType : undefined,
            experienceLevel: experienceLevel !== 'all' ? experienceLevel : undefined,
            minSalary: minSalary ? Number(minSalary) : undefined,
          },
        }),
      }),
    onSuccess: () => {
      toast({ title: 'Search alert saved', variant: 'success' });
      setSaveSearchOpen(false);
      setSavedSearchName('');
    },
    onError: (err: Error) => {
      toast({ title: 'Unable to save search', description: err.message, variant: 'error' });
    },
  });

  const clearAllFilters = () => {
    setQInput('');
    setDebouncedQ('');
    setLocation('');
    setCategory('all');
    setExperienceLevel('all');
    setEmploymentType('all');
    setWorkMode('all');
    setMinSalary('');
    setDatePosted('all');
    setEducation('');
    setCompanyId('');
    setSort('newest');
    setPage(1);
  };

  const handleToggleSave = (jobId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'candidate') {
      toast({ title: 'Candidate action', description: 'Only candidate accounts can save jobs.' });
      return;
    }
    saveJobMutation.mutate(jobId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
            Find Jobs
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Server-filtered openings with verified compensation bands and direct applications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {user?.role === 'candidate' && (
            <button
              type="button"
              onClick={() => setSaveSearchOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-navy-900 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 whitespace-nowrap"
            >
              <BellPlus className="w-4 h-4 text-blue-600" />
              <span>Save Search</span>
            </button>
          )}
          <label htmlFor="sort-jobs" className="sr-only">
            Sort jobs
          </label>
          <select
            id="sort-jobs"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="salary">Sort: Highest Salary</option>
            <option value="relevance">Sort: Relevance</option>
          </select>
        </div>
      </div>

      {saveSearchOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (savedSearchName.trim()) saveSearchMutation.mutate(savedSearchName.trim());
          }}
          className="mt-4 p-4 rounded-xl bg-white border border-blue-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <input
            type="text"
            required
            value={savedSearchName}
            onChange={(e) => setSavedSearchName(e.target.value)}
            placeholder="Name this saved search (e.g. Remote Senior React Roles)"
            className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={saveSearchMutation.isPending}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap"
          >
            Save Alert
          </button>
        </form>
      )}

      {/* Top Search Inputs */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-6 relative">
          <label htmlFor="jobs-search-q" className="sr-only">
            Search job title, skills, or company
          </label>
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="jobs-search-q"
            type="text"
            value={qInput}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Search by job title, company, skill, or keyword…"
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
          {showSuggestions && suggestionData?.suggestions && suggestionData.suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1">
              {suggestionData.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={() => {
                    setQInput(s);
                    setDebouncedQ(s);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-4 relative">
          <label htmlFor="jobs-search-loc" className="sr-only">
            Location
          </label>
          <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="jobs-search-loc"
            type="text"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setPage(1);
            }}
            placeholder="City, state, or Remote"
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <button
            type="button"
            onClick={clearAllFilters}
            className="w-full py-2.5 px-3 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Main Filter Sidebar + Results Grid */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <aside className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-5 space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 pb-3 border-b border-slate-100">
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <span>Refine Search</span>
          </div>

          <div>
            <label htmlFor="filter-workmode" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Work Mode
            </label>
            <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Work Mode">
              {['all', 'Remote', 'Hybrid', 'On-site'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setWorkMode(mode);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                    workMode === mode
                      ? 'bg-navy-900 text-white border-navy-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {mode === 'all' ? 'Any Mode' : mode}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="filter-category" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Category
            </label>
            <select
              id="filter-category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Categories</option>
              {(catData?.categories || []).map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-experience" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Experience Level
            </label>
            <select
              id="filter-experience"
              value={experienceLevel}
              onChange={(e) => {
                setExperienceLevel(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">Any Experience</option>
              <option value="Entry Level">Entry Level</option>
              <option value="Mid Level">Mid Level</option>
              <option value="Senior Level">Senior Level</option>
              <option value="Lead / Staff">Lead / Staff</option>
              <option value="Executive">Executive</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-type" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Employment Type
            </label>
            <select
              id="filter-type"
              value={employmentType}
              onChange={(e) => {
                setEmploymentType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Employment Types</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
              <option value="Freelance">Freelance</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-salary" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Minimum Salary (USD)
            </label>
            <select
              id="filter-salary"
              value={minSalary}
              onChange={(e) => {
                setMinSalary(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="">Any Salary</option>
              <option value="80000">$80,000+</option>
              <option value="120000">$120,000+</option>
              <option value="150000">$150,000+</option>
              <option value="180000">$180,000+</option>
              <option value="200000">$200,000+</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-date" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Date Posted
            </label>
            <select
              id="filter-date"
              value={datePosted}
              onChange={(e) => {
                setDatePosted(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">Any Time</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          <div>
            <label htmlFor="filter-company" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Company
            </label>
            <select
              id="filter-company"
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="">All Companies</option>
              {(compData?.companies || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-education" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Education Keyword
            </label>
            <input
              id="filter-education"
              type="text"
              value={education}
              onChange={(e) => {
                setEducation(e.target.value);
                setPage(1);
              }}
              placeholder="e.g. Bachelor, Master"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            />
          </div>
        </aside>

        {/* Results Column */}
        <div className="lg:col-span-9">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600 tabular-nums">
              Showing <span className="font-semibold text-slate-900">{jobsData?.total ?? 0}</span> matching openings
              {isFetching && !isLoading ? ' · Updating…' : ''}
            </p>
          </div>

          {isLoading ? (
            <LoadingRows count={5} />
          ) : jobsData && jobsData.items.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobsData.items.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onToggleSave={handleToggleSave}
                    savingId={saveJobMutation.isPending ? saveJobMutation.variables : null}
                  />
                ))}
              </div>

              {/* Pagination */}
              {jobsData.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5">
                  <p className="text-xs text-slate-500 tabular-nums">
                    Page {jobsData.page} of {jobsData.totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={jobsData.page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={jobsData.page >= jobsData.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="px-3.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title="No matching jobs found"
              description="Try widening your salary threshold, removing a filter, or clearing your search query."
              action={
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-4 py-2 text-sm font-semibold text-white bg-navy-900 rounded-lg hover:bg-navy-800"
                >
                  Reset Filters
                </button>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
