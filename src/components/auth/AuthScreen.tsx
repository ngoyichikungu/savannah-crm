import React, { useState } from 'react';
import { User } from '../../types';
import { AuthService } from '../../services/authService';
import {
  Lock,
  User as UserIcon,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  UserPlus,
  LogIn,
} from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regRole, setRegRole] = useState<'owner' | 'admin' | 'sales_rep' | 'accountant'>('admin');

  // Status feedback state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle Login submission
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = AuthService.login(loginIdentifier, loginPassword);
      setIsLoading(false);
      if (res.success && res.user) {
        setSuccessMsg(`Welcome back, ${res.user.name}! Access granted.`);
        setTimeout(() => {
          onLoginSuccess(res.user!);
        }, 500);
      } else {
        setErrorMsg(res.error || 'Login failed.');
      }
    }, 300);
  };

  // Handle Registration submission
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match. Please verify and try again.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const res = AuthService.register({
        name: regName,
        username: regUsername,
        email: regEmail,
        password: regPassword,
        role: regRole,
      });
      setIsLoading(false);

      if (res.success && res.user) {
        setSuccessMsg(`Account created successfully! Welcome, ${res.user.name}.`);
        setTimeout(() => {
          onLoginSuccess(res.user!);
        }, 600);
      } else {
        setErrorMsg(res.error || 'Registration failed.');
      }
    }, 400);
  };

  // Quick Demo Auto-fill & Login
  const handleQuickDemoLogin = () => {
    setLoginIdentifier('admin');
    setLoginPassword('password123');
    setErrorMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = AuthService.login('admin', 'password123');
      setIsLoading(false);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-stone-50 to-emerald-50/30 text-stone-900 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Subtle Background Radial Highlights */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container Card */}
      <div className="w-full max-w-md bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-xl relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-3 mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 font-mono font-black text-2xl text-amber-300 shadow-md border border-emerald-500/20">
            S
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center justify-center gap-2">
              <span>Savannah</span>
              <span className="text-emerald-800 font-mono text-xs px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 font-bold">
                PRO
              </span>
            </h1>
            <p className="text-xs text-stone-500 mt-1 font-mono tracking-wider uppercase font-semibold">
              Business Operations Privacy Gate
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 bg-stone-100 p-1 rounded-2xl border border-stone-200 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200/60 font-black'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5 text-emerald-700" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
            }}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200/60 font-black'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-700" />
            <span>Register</span>
          </button>
        </div>

        {/* Feedback Alert Banners */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-semibold">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Form Area */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  id="auth-login-identifier"
                  type="text"
                  required
                  placeholder="e.g. admin or owner@savannah.co.zm"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 hover:bg-white focus:bg-white text-xs text-stone-900 rounded-xl border border-stone-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  id="auth-login-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-stone-50 hover:bg-white focus:bg-white text-xs text-stone-900 rounded-xl border border-stone-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-3 text-stone-400 hover:text-stone-700"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="auth-btn-submit-login"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 mt-2"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Demo Quick Login Helper */}
            <div className="pt-3 border-t border-stone-200 text-center">
              <button
                type="button"
                onClick={handleQuickDemoLogin}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1.5 rounded-lg border border-emerald-200 transition-all cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Quick Fill Demo Admin Account</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                id="auth-reg-name"
                type="text"
                required
                placeholder="e.g. Chikungu Ngoyi"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full px-3.5 py-2 bg-stone-50 hover:bg-white focus:bg-white text-xs text-stone-900 rounded-xl border border-stone-300 focus:border-emerald-600 focus:outline-none font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Username
                </label>
                <input
                  id="auth-reg-username"
                  type="text"
                  required
                  placeholder="e.g. chikungu"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 hover:bg-white focus:bg-white text-xs text-stone-900 rounded-xl border border-stone-300 focus:border-emerald-600 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                  System Role
                </label>
                <select
                  id="auth-reg-role"
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-stone-50 hover:bg-white focus:bg-white text-xs text-stone-900 rounded-xl border border-stone-300 focus:border-emerald-600 focus:outline-none font-medium"
                >
                  <option value="owner">Owner / Director</option>
                  <option value="admin">Administrator</option>
                  <option value="accountant">Accountant</option>
                  <option value="sales_rep">Sales Manager</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3.5 top-2.5" />
                <input
                  id="auth-reg-email"
                  type="email"
                  required
                  placeholder="e.g. c.ngoyi@savannah.co.zm"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-stone-50 hover:bg-white focus:bg-white text-xs text-stone-900 rounded-xl border border-stone-300 focus:border-emerald-600 focus:outline-none font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="text-[10px] text-emerald-700 font-bold hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showRegPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <input
                  id="auth-reg-password"
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  placeholder="Min 4 chars"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 hover:bg-white focus:bg-white text-xs text-stone-900 rounded-xl border border-stone-300 focus:border-emerald-600 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <input
                  id="auth-reg-confirm-password"
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  placeholder="Repeat password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 hover:bg-white focus:bg-white text-xs text-stone-900 rounded-xl border border-stone-300 focus:border-emerald-600 focus:outline-none font-medium"
                />
              </div>
            </div>

            <button
              id="auth-btn-submit-register"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 mt-2"
            >
              <span>{isLoading ? 'Creating Account...' : 'Create Account & Access System'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Privacy Note */}
        <div className="mt-6 pt-4 border-t border-stone-200 text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-stone-600 font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Local System Privacy Shield Active</span>
          </div>
          <p className="text-[10px] text-stone-500">
            Authentication protects local business records &amp; financial ledger privacy.
          </p>
        </div>
      </div>
    </div>
  );
};
