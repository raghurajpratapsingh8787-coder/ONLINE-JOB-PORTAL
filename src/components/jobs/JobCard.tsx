import React from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, CheckCircle2, MapPin, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { CompanyMark } from '../common/UI';
import { formatRelativeDate, formatSalaryRange } from '../../lib/format';
import type { JobSummary } from '../../types';

export function JobCard({
  job,
  onToggleSave,
  savingId,
}: {
  job: JobSummary;
  onToggleSave?: (jobId: string) => void;
  savingId?: string | null;
}) {
  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between gap-4 hover:border-blue-300 transition-colors"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5 min-w-0">
            <CompanyMark logoUrl={job.companyLogo} name={job.companyName || 'Company'} size="md" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="font-medium truncate">{job.companyName}</span>
                {job.companyVerified && (
                  <CheckCircle2
                    className="w-3.5 h-3.5 text-blue-600 shrink-0"
                    aria-label="Verified company"
                  />
                )}
              </div>
              <Link
                to={`/jobs/${job.id}`}
                className="mt-0.5 block font-display text-base font-semibold text-slate-900 hover:text-blue-600 transition-colors leading-snug"
              >
                {job.title}
              </Link>
            </div>
          </div>

          {onToggleSave && (
            <button
              type="button"
              disabled={savingId === job.id}
              onClick={() => onToggleSave(job.id)}
              aria-label={job.isSaved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
              className={`p-2 rounded-lg border transition-colors shrink-0 ${
                job.isSaved
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${job.isSaved ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>

        {/* Clean Unboxed Metadata Row (Zero-Pill Discipline) */}
        <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {job.location}
          </span>
          <span aria-hidden="true">·</span>
          <span>{job.workMode}</span>
          <span aria-hidden="true">·</span>
          <span>{job.employmentType}</span>
          <span aria-hidden="true">·</span>
          <span>{job.experienceLevel}</span>
        </div>

        <p className="mt-3 text-sm text-slate-600 line-clamp-2 leading-relaxed">
          {job.description}
        </p>

        {job.requiredSkills.length > 0 && (
          <p className="mt-3 text-xs text-slate-500 truncate">
            {job.requiredSkills.slice(0, 5).join(' · ')}
          </p>
        )}
      </div>

      <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-semibold text-navy-900 tabular-nums">
            {formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency)}
          </p>
          <p className="text-xs text-slate-500">Posted {formatRelativeDate(job.createdAt)}</p>
        </div>

        <Link
          to={`/jobs/${job.id}`}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            job.hasApplied
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-navy-900 text-white hover:bg-blue-600'
          }`}
        >
          <span>{job.hasApplied ? 'Applied' : 'View & Apply'}</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </motion.article>
  );
}
