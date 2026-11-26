import React, { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDashboardPathForRole } from '../../lib/format';

const PUBLIC_NAV = [
  { to: '/jobs', label: 'Find Jobs' },
  { to: '/companies', label: 'Companies' },
  { to: '/categories', label: 'Categories' },
  { to: '/resources', label: 'Career Resources' },
  { to: '/about', label: 'About' },
];

export function PublicLayout() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <Link
            to="/"
            className="font-display text-xl font-bold tracking-tight text-navy-900 whitespace-nowrap shrink-0"
          >
            VanguardHire
          </Link>

          {/* Zone 2: 5 Clean Single-Line Nav Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600"
          >
            {PUBLIC_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 ${
                    isActive
                      ? 'text-navy-900 border-blue-600 font-semibold'
                      : 'border-transparent hover:text-navy-900 hover:border-slate-300'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Zone 3: Auth / Workspace CTA */}
          <div className="hidden lg:flex items-center gap-4 shrink-0">
            {user ? (
              <Link
                to={getDashboardPathForRole(user.role)}
                className="px-4 py-2 text-sm font-semibold text-white bg-navy-900 rounded-lg hover:bg-navy-800 transition-colors whitespace-nowrap shrink-0"
              >
                Open Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-700 hover:text-navy-900 transition-colors whitespace-nowrap shrink-0"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile Drawer Trigger */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Home
            </Link>
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-3 mt-2 border-t border-slate-200 flex items-center gap-3">
              {user ? (
                <Link
                  to={getDashboardPathForRole(user.role)}
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center px-4 py-2.5 text-sm font-semibold text-white bg-navy-900 rounded-lg"
                >
                  Open Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-4 py-2.5 text-sm font-medium text-slate-800 border border-slate-200 rounded-lg"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Quiet Editorial Footer with Platform Architect Name & Email */}
      <footer className="bg-navy-950 text-slate-300 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            <div className="md:col-span-4">
              <Link to="/" className="font-display text-xl font-bold text-white tracking-tight">
                VanguardHire
              </Link>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed max-w-sm">
                Full-stack recruitment and placement infrastructure connecting vetted employers with high-impact engineering, product, and business talent.
              </p>
              <div className="mt-5 pt-4 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
                <p className="text-slate-200 font-medium">Platform Architect &amp; Administrator</p>
                <p>Raghuraj Pratap Singh · <a href="mailto:raghurajpratapsingh8787@gmail.com" className="text-cyan-400 hover:underline">raghurajpratapsingh8787@gmail.com</a></p>
              </div>
            </div>

            <div className="md:col-span-2">
              <h4 className="text-sm font-semibold text-white">For Candidates</h4>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-400">
                <li><Link to="/jobs" className="hover:text-white transition-colors">Find Jobs</Link></li>
                <li><Link to="/jobs?workMode=Remote" className="hover:text-white transition-colors">Remote Roles</Link></li>
                <li><Link to="/categories" className="hover:text-white transition-colors">Job Categories</Link></li>
                <li><Link to="/resources" className="hover:text-white transition-colors">Career Resources</Link></li>
              </ul>
            </div>

            <div className="md:col-span-3">
              <h4 className="text-sm font-semibold text-white">For Employers</h4>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-400">
                <li><Link to="/register?role=employer" className="hover:text-white transition-colors">Create Company Account</Link></li>
                <li><Link to="/companies" className="hover:text-white transition-colors">Verified Companies</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Applicant Tracking System</Link></li>
              </ul>
            </div>

            <div className="md:col-span-3">
              <h4 className="text-sm font-semibold text-white">Organization</h4>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-400">
                <li><Link to="/about" className="hover:text-white transition-colors">About VanguardHire</Link></li>
                <li><a href="mailto:raghurajpratapsingh8787@gmail.com" className="hover:text-white transition-colors">Contact Support</a></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} VanguardHire Online Job Portal. Built by Raghuraj Pratap Singh (raghurajpratapsingh8787@gmail.com).</p>
            <div className="flex items-center gap-5">
              <span>Role-Based Access Control</span>
              <span aria-hidden="true">·</span>
              <span>Private Resume Storage</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
