import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { getDashboardPathForRole } from '../../lib/format';

const loginFormSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

const DEMO_ACCOUNTS = [
  {
    label: 'Candidate Demo',
    name: 'Maya Lin',
    email: 'maya.lin@candidate.io',
    password: 'Candidate@1234',
    summary: 'Profile, private resumes, saved jobs & applications',
  },
  {
    label: 'Employer / ATS Demo',
    name: 'David Chen · ApexCloud',
    email: 'recruiter@apexcloud.io',
    password: 'Employer@1234',
    summary: 'Manage jobs, ATS pipeline, private notes & interviews',
  },
  {
    label: 'Super Admin Demo',
    name: 'Raghuraj Pratap Singh',
    email: 'raghurajpratapsingh8787@gmail.com',
    password: 'Admin@1234',
    summary: 'Analytics, approvals, company verification & audit logs',
  },
];

export function LoginPage() {
  const navigate = useNavigate();
  const { login, toast } = useAuth();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError('');
    try {
      const signedIn = await login(values.email, values.password);
      toast({ title: `Welcome back, ${signedIn.name}`, variant: 'success' });
      navigate(getDashboardPathForRole(signedIn.role), { replace: true });
    } catch (err) {
      setServerError((err as Error).message || 'Invalid credentials');
    }
  };

  const quickLogin = async (email: string, password: string) => {
    setValue('email', email);
    setValue('password', password);
    await onSubmit({ email, password });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Login Form */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-7 sm:p-9">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700">
            <Lock className="w-4 h-4" />
            <span>HttpOnly JWT Authentication</span>
          </div>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Sign in to VanguardHire
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Role-aware access to your Candidate, Employer ATS, or Super Admin workspace.
          </p>

          {serverError && (
            <div
              role="alert"
              className="mt-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-800">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                placeholder="you@domain.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="block text-sm font-medium text-slate-800">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-navy-900 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Authenticating…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-600 text-center">
            New to VanguardHire?{' '}
            <Link to="/register" className="font-semibold text-blue-600 hover:underline">
              Create an account
            </Link>
          </p>
        </div>

        {/* Seeded Demo Role Switcher */}
        <aside className="lg:col-span-5 bg-navy-900 text-white rounded-2xl p-6 sm:p-7">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
            <ShieldCheck className="w-4 h-4" />
            <span>Pre-Seeded Role Accounts</span>
          </div>
          <h2 className="mt-2 font-display text-lg font-bold">Explore All 3 Portals</h2>
          <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
            Each demo account authenticates against real bcrypt hashes and enforces server-side RBAC.
          </p>

          <div className="mt-5 space-y-3">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                disabled={isSubmitting}
                onClick={() => void quickLogin(acc.email, acc.password)}
                className="w-full text-left p-4 rounded-xl bg-white/8 hover:bg-white/14 border border-white/12 transition-colors group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-cyan-300">{acc.label}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                </div>
                <p className="mt-1 text-sm font-semibold text-white">{acc.name}</p>
                <p className="text-xs font-mono text-slate-300 mt-0.5">{acc.email}</p>
                <p className="text-xs text-slate-400 mt-1.5">{acc.summary}</p>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

const registerFormSchema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Include at least one uppercase letter')
    .regex(/[0-9]/, 'Include at least one number'),
  role: z.enum(['candidate', 'employer']),
  companyName: z.string().optional(),
  industry: z.string().optional(),
  headquarters: z.string().optional(),
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export function RegisterPage() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'employer' ? 'employer' : 'candidate';
  const navigate = useNavigate();
  const { register: registerUser, refreshUser, toast } = useAuth();
  const [serverError, setServerError] = useState('');
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { role: initialRole },
  });

  const selectedRole = watch('role');

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError('');
    try {
      const res = await registerUser(values);
      if (res.emailVerificationTokenPreview) {
        setVerificationToken(res.emailVerificationTokenPreview);
      } else {
        navigate(getDashboardPathForRole(res.user.role), { replace: true });
      }
      toast({ title: 'Account created', variant: 'success' });
    } catch (err) {
      setServerError((err as Error).message || 'Registration failed');
    }
  };

  const handleVerifyNow = async () => {
    if (!verificationToken) return;
    setVerifying(true);
    try {
      const res = await apiRequest<{ user: any }>('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: verificationToken }),
      });
      await refreshUser();
      toast({ title: 'Email verified', variant: 'success' });
      navigate(getDashboardPathForRole(res.user.role), { replace: true });
    } catch (err) {
      toast({ title: 'Verification failed', description: (err as Error).message, variant: 'error' });
    } finally {
      setVerifying(false);
    }
  };

  if (verificationToken) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h1 className="mt-4 font-display text-2xl font-bold text-slate-900">
            Verify Your Email Address
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Your account is active. Complete one-click email verification below to unlock full notifications and employer trust status.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              disabled={verifying}
              onClick={() => void handleVerifyNow()}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"
            >
              {verifying ? 'Verifying…' : 'Verify Email & Open Dashboard'}
            </button>
            <button
              type="button"
              onClick={() => navigate(getDashboardPathForRole(selectedRole))}
              className="w-full py-2.5 px-4 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Continue to Dashboard for Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-14">
      <div className="bg-white rounded-2xl border border-slate-200 p-7 sm:p-9">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Create Your Account
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Choose your role to unlock tailored recruitment tools and permissions.
        </p>

        {/* Role Selector */}
        <div className="mt-6 grid grid-cols-2 gap-3" role="group" aria-label="Account role">
          <button
            type="button"
            onClick={() => setValue('role', 'candidate')}
            className={`p-3.5 rounded-xl border text-left transition-colors ${
              selectedRole === 'candidate'
                ? 'border-blue-600 bg-blue-50/50 text-navy-900'
                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <p className="text-sm font-bold">Job Seeker</p>
            <p className="text-xs text-slate-500 mt-0.5">Discover roles &amp; apply</p>
          </button>
          <button
            type="button"
            onClick={() => setValue('role', 'employer')}
            className={`p-3.5 rounded-xl border text-left transition-colors ${
              selectedRole === 'employer'
                ? 'border-blue-600 bg-blue-50/50 text-navy-900'
                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <p className="text-sm font-bold">Employer / Recruiter</p>
            <p className="text-xs text-slate-500 mt-0.5">Post jobs &amp; run ATS</p>
          </button>
        </div>

        {serverError && (
          <div role="alert" className="mt-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="reg-name" className="block text-sm font-medium text-slate-800">
              Full Name
            </label>
            <input
              id="reg-name"
              type="text"
              {...register('name')}
              className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              placeholder="Alex Rivera"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-slate-800">
              Work or Personal Email
            </label>
            <input
              id="reg-email"
              type="email"
              {...register('email')}
              className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              placeholder="alex@example.com"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-slate-800">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              {...register('password')}
              className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              placeholder="Min 8 chars, 1 uppercase, 1 number"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          {selectedRole === 'employer' && (
            <div className="pt-3 border-t border-slate-200 space-y-4">
              <p className="text-xs font-semibold text-slate-700">Organization Details</p>
              <div>
                <label htmlFor="reg-company" className="block text-sm font-medium text-slate-800">
                  Company Name
                </label>
                <input
                  id="reg-company"
                  type="text"
                  {...register('companyName')}
                  className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  placeholder="Acme Technologies Inc."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-industry" className="block text-sm font-medium text-slate-800">
                    Industry
                  </label>
                  <input
                    id="reg-industry"
                    type="text"
                    {...register('industry')}
                    className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                    placeholder="Cloud Software"
                  />
                </div>
                <div>
                  <label htmlFor="reg-hq" className="block text-sm font-medium text-slate-800">
                    Headquarters
                  </label>
                  <input
                    id="reg-hq"
                    type="text"
                    {...register('headquarters')}
                    className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                    placeholder="San Francisco, CA"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Creating Account…' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600 text-center">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { toast } = useAuth();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await apiRequest<{ message: string; resetTokenPreview?: string }>(
        '/api/auth/forgot-password',
        { method: 'POST', body: JSON.stringify({ email }) }
      );
      setMessage(res.message);
      if (res.resetTokenPreview) setToken(res.resetTokenPreview);
      setStep('reset');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await apiRequest<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
      toast({ title: 'Password Reset', description: res.message, variant: 'success' });
      navigate('/login');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <h1 className="font-display text-2xl font-bold text-slate-900">
          {step === 'request' ? 'Reset Your Password' : 'Enter Reset Token'}
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          {step === 'request'
            ? 'We issue an expiring, single-use reset token valid for 30 minutes.'
            : message}
        </p>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequest} className="mt-6 space-y-4">
            <div>
              <label htmlFor="fp-email" className="block text-sm font-medium text-slate-800">
                Account Email
              </label>
              <input
                id="fp-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 bg-navy-900 text-white text-sm font-semibold rounded-lg"
            >
              {busy ? 'Issuing Token…' : 'Send Reset Token'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="mt-6 space-y-4">
            <div>
              <label htmlFor="fp-token" className="block text-sm font-medium text-slate-800">
                Single-Use Token
              </label>
              <input
                id="fp-token"
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="mt-1.5 w-full px-3.5 py-2.5 text-xs font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="fp-newpw" className="block text-sm font-medium text-slate-800">
                New Password
              </label>
              <input
                id="fp-newpw"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                className="mt-1.5 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg"
            >
              {busy ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          <Link to="/login" className="font-semibold text-blue-600 hover:underline">
            Return to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
