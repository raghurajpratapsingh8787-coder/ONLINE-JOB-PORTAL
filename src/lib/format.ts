export function formatSalaryRange(min: number, max: number, currency = 'USD'): string {
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  const fmt = (n: number) =>
    n >= 1000 ? `${symbol}${Math.round(n / 1000)}k` : `${symbol}${n.toLocaleString()}`;
  return `${fmt(min)} – ${fmt(max)}`;
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatStatusLabel(status: string): string {
  const map: Record<string, string> = {
    submitted: 'Submitted',
    under_review: 'Under Review',
    shortlisted: 'Shortlisted',
    interview_scheduled: 'Interview Scheduled',
    selected: 'Selected',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    published: 'Published',
    paused: 'Paused',
    closed: 'Closed',
    expired: 'Expired',
    verified: 'Verified',
    pending: 'Pending Review',
    unsubmitted: 'Unverified',
    active: 'Active',
    suspended: 'Suspended',
    scheduled: 'Scheduled',
    completed: 'Completed',
    cancelled: 'Cancelled',
    rescheduled: 'Rescheduled',
    open: 'Open',
    investigating: 'Investigating',
    resolved: 'Resolved',
    dismissed: 'Dismissed',
  };
  return map[status] || status.replace(/_/g, ' ');
}

export function getDashboardPathForRole(role: string): string {
  if (role === 'super_admin') return '/dashboard/admin';
  if (role === 'employer') return '/dashboard/employer';
  return '/dashboard/candidate';
}

export function isSafeExternalUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}
