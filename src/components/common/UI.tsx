import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  PauseCircle,
  XCircle,
  ShieldCheck,
  Briefcase,
} from 'lucide-react';
import { formatStatusLabel } from '../../lib/format';

export function Avatar({
  src,
  name,
  size = 'md',
}: {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [failed, setFailed] = useState(false);
  const dims = size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-14 w-14 text-base' : 'h-10 w-10 text-sm';
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${dims} rounded-full object-cover shrink-0 border border-slate-200`}
      />
    );
  }

  return (
    <div
      className={`${dims} rounded-full bg-navy-900 text-white font-semibold flex items-center justify-center shrink-0`}
      aria-label={name}
    >
      {initials || 'VH'}
    </div>
  );
}

export function CompanyMark({
  logoUrl,
  name,
  size = 'md',
}: {
  logoUrl?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [failed, setFailed] = useState(false);
  const dims = size === 'sm' ? 'h-9 w-9 text-xs' : size === 'lg' ? 'h-14 w-14 text-lg' : 'h-11 w-11 text-sm';
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logo`}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${dims} rounded-lg object-cover border border-slate-200 bg-white shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${dims} rounded-lg bg-slate-100 border border-slate-200 text-navy-900 font-display font-bold flex items-center justify-center shrink-0`}
      aria-hidden="true"
    >
      {initials || <Briefcase className="w-4 h-4" />}
    </div>
  );
}

/**
 * Editorial Zero-Pill Status Indicator:
 * Pairs crisp semantic color with an explicit icon and readable text label (never color-only, never pill boxes).
 */
export function StatusText({ status }: { status: string }) {
  const label = formatStatusLabel(status);
  const positive = new Set(['published', 'selected', 'verified', 'active', 'completed', 'resolved', 'approved']);
  const progress = new Set(['shortlisted', 'interview_scheduled', 'under_review', 'scheduled', 'investigating']);
  const warning = new Set(['pending_approval', 'pending', 'paused', 'draft', 'rescheduled', 'open']);
  const negative = new Set(['rejected', 'suspended', 'closed', 'expired', 'withdrawn', 'cancelled', 'dismissed']);

  if (positive.has(status)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>{label}</span>
      </span>
    );
  }
  if (progress.has(status)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 whitespace-nowrap">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        <span>{label}</span>
      </span>
    );
  }
  if (warning.has(status)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
        {status === 'paused' ? (
          <PauseCircle className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <Clock className="w-3.5 h-3.5 shrink-0" />
        )}
        <span>{label}</span>
      </span>
    );
  }
  if (negative.has(status)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 shrink-0" />
        <span>{label}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      <span>{label}</span>
    </span>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 backdrop-blur-[2px] p-4"
    >
      <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-xl">
        <h3 id="confirm-dialog-title" className="text-lg font-semibold text-slate-900">
          {title}
        </h3>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">{description}</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-60 ${
              destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function LoadingRows({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading content">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="h-20 rounded-xl border border-slate-200 bg-white p-4 animate-pulse flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5 flex-1">
            <div className="h-10 w-10 rounded-lg bg-slate-200 shrink-0" />
            <div className="space-y-2 flex-1 max-w-md">
              <div className="h-3.5 bg-slate-200 rounded w-3/5" />
              <div className="h-3 bg-slate-100 rounded w-2/5" />
            </div>
          </div>
          <div className="h-8 w-24 bg-slate-100 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
