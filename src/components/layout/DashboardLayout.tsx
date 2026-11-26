import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  Calendar,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  ScrollText,
  User,
  Users,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../common/UI';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

const CANDIDATE_NAV: NavItem[] = [
  { to: '/dashboard/candidate', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/candidate/profile', label: 'My Profile', icon: User },
  { to: '/jobs', label: 'Find Jobs', icon: Search },
  { to: '/dashboard/candidate/saved', label: 'Saved Jobs', icon: Bookmark },
  { to: '/dashboard/candidate/applications', label: 'My Applications', icon: Briefcase },
  { to: '/dashboard/candidate/resumes', label: 'Resume Manager', icon: FileText },
  { to: '/dashboard/candidate/messages', label: 'Messages', icon: MessageSquare },
  { to: '/dashboard/candidate/notifications', label: 'Notifications', icon: Bell },
  { to: '/dashboard/candidate/settings', label: 'Settings', icon: Settings },
];

const EMPLOYER_NAV: NavItem[] = [
  { to: '/dashboard/employer', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/employer/company', label: 'Company Profile', icon: Building2 },
  { to: '/dashboard/employer/jobs', label: 'Manage Jobs', icon: Briefcase },
  { to: '/dashboard/employer/ats', label: 'Applicant Tracking', icon: Users },
  { to: '/dashboard/employer/interviews', label: 'Interviews', icon: Calendar },
  { to: '/dashboard/employer/messages', label: 'Messages', icon: MessageSquare },
  { to: '/dashboard/employer/notifications', label: 'Notifications', icon: Bell },
  { to: '/dashboard/employer/settings', label: 'Settings', icon: Settings },
];

const ADMIN_NAV: NavItem[] = [
  { to: '/dashboard/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/admin/moderation', label: 'Approvals & Verify', icon: ShieldCheck },
  { to: '/dashboard/admin/users', label: 'Users & Accounts', icon: Users },
  { to: '/dashboard/admin/taxonomy', label: 'Categories & Reports', icon: FolderKanban },
  { to: '/dashboard/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { to: '/dashboard/admin/notifications', label: 'Notifications', icon: Bell },
  { to: '/dashboard/admin/settings', label: 'Platform Settings', icon: Settings },
];

export function DashboardLayout() {
  const { user, unreadNotifications, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const navItems =
    user.role === 'super_admin'
      ? ADMIN_NAV
      : user.role === 'employer'
        ? EMPLOYER_NAV
        : CANDIDATE_NAV;

  const roleTitle =
    user.role === 'super_admin'
      ? 'Super Admin Console'
      : user.role === 'employer'
        ? 'Employer & ATS Workspace'
        : 'Candidate Workspace';

  const notifPath =
    user.role === 'super_admin'
      ? '/dashboard/admin/notifications'
      : user.role === 'employer'
        ? '/dashboard/employer/notifications'
        : '/dashboard/candidate/notifications';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-navy-900 text-slate-200">
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
        <Link
          to="/"
          className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap"
        >
          VanguardHire
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 py-4 border-b border-white/10">
        <p className="text-xs font-medium text-cyan-400">{roleTitle}</p>
        <div className="mt-2.5 flex items-center gap-3 min-w-0">
          <Avatar src={user.avatarUrl} name={user.name} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
        </div>
      </div>

      <nav aria-label="Dashboard navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isNotif = item.label === 'Notifications';
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`
              }
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              {isNotif && unreadNotifications > 0 && (
                <span className="font-mono text-xs font-semibold tabular-nums text-cyan-300">
                  {unreadNotifications}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/8 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  // Build readable breadcrumb from pathname
  const currentNav = navItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to) && item.to !== '/jobs'
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 fixed inset-y-0 left-0 z-30 border-r border-slate-800">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 max-w-[80vw] h-full shadow-2xl">{renderSidebarContent()}</div>
          <div
            className="flex-1 bg-navy-950/60"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500 truncate">
              <span className="hidden sm:inline">{roleTitle}</span>
              <span className="hidden sm:inline" aria-hidden="true">/</span>
              <span className="font-semibold text-slate-900 truncate">
                {currentNav?.label || 'Workspace'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/jobs"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              Browse Portal
            </Link>
            <Link
              to={notifPath}
              aria-label={`Notifications (${unreadNotifications} unread)`}
              className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white font-mono text-[10px] font-semibold flex items-center justify-center tabular-nums">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
