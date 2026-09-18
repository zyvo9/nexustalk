import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  ArrowRight,
  MessageSquare,
  MonitorSmartphone,
  Video,
  Mail,
  Lock,
  Loader2,
  Server,
  Check
} from 'lucide-react';
import { api, apiUrl, getServerBase, setServerBase } from '../../lib/api';
import { resetSocket } from '../../lib/realtime';

interface LoginScreenProps {
  onLoginSuccess: (token: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [serverVal, setServerVal] = useState(getServerBase());
  const [serverSaved, setServerSaved] = useState(false);

  const urlError = new URLSearchParams(window.location.search).get('authError');

  useEffect(() => {
    api<{ enabled: boolean }>('/api/auth/google/status')
      .then((r) => setGoogleEnabled(r.enabled))
      .catch(() => setGoogleEnabled(false));
  }, []);

  const saveServer = (value: string) => {
    setServerVal(value);
    setServerBase(value);
    resetSocket(); // reconnect to the (possibly new) server
    setServerSaved(true);
    setTimeout(() => setServerSaved(false), 1800);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login' ? { email, password } : { email, password };
      const res = await api<{ token: string }>(path, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      onLoginSuccess(res.token);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const startGoogle = () => {
    window.location.href = apiUrl('/api/auth/google/start');
  };

  const inputClass =
    'w-full pl-10 pr-4 py-3 rounded-2xl bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent transition-all';

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[#070b15] text-slate-100">
      {/* Ambient animated aurora */}
      <div className="aurora-bg" />

      {/* Brand */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8 z-10"
      >
        <div className="w-16 h-16 rounded-[20px] accent-gradient flex items-center justify-center shadow-2xl shadow-indigo-600/40 mx-auto mb-4">
          <span className="on-accent font-extrabold text-2xl tracking-tight">N</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">NexusTalk</h1>
        <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
          Private chats, HD calls, and remote device control — one beautiful app.
        </p>
      </motion.div>

      {/* Glass card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-[28px] glass p-6 sm:p-8 shadow-2xl shadow-black/50 relative z-10"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: mode === 'login' ? -14 : 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === 'login' ? 14 : -14 }}
            transition={{ duration: 0.22 }}
          >
            <h2 className="text-lg font-bold text-white mb-5">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>

            {(error || urlError) && (
              <div className="mb-4 px-3.5 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-medium">
                {error ||
                  (urlError === 'access_denied'
                    ? 'Google sign-in was cancelled.'
                    : 'Google sign-in failed. Please try again.')}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  autoComplete="email"
                  className={inputClass}
                />
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className={inputClass}
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={busy}
                className="w-full py-3.5 px-4 rounded-2xl accent-gradient on-accent font-semibold text-sm shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Log in' : 'Create account'}</span>
                    <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
                  </>
                )}
              </motion.button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Google Sign-In */}
            {googleEnabled ? (
              <button
                onClick={startGoogle}
                className="w-full py-3 px-4 rounded-2xl bg-white text-slate-800 font-semibold text-sm shadow-lg hover:bg-slate-100 active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <GoogleLogo />
                <span>Continue with Google</span>
              </button>
            ) : (
              <div className="w-full py-3 px-4 rounded-2xl bg-white/[0.04] border border-dashed border-white/15 text-slate-500 text-xs text-center leading-relaxed">
                Google sign-in activates after adding your free Google client ID
                in <span className="font-mono text-slate-400">server/.env</span>
              </div>
            )}

            <p className="text-center text-xs text-slate-500 mt-5">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError('');
                }}
                className="text-indigo-300 hover:text-indigo-200 font-semibold cursor-pointer"
              >
                {mode === 'login' ? 'Create one' : 'Log in'}
              </button>
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Server address — the app has its own UI; point it at your NexusTalk server */}
        <div className="mt-6 pt-4 border-t border-white/5">
          <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            <Server className="w-3 h-3" />
            Server address
            {serverSaved && (
              <span className="text-emerald-400 normal-case flex items-center gap-0.5">
                <Check className="w-3 h-3" /> saved
              </span>
            )}
          </label>
          <input
            type="url"
            defaultValue={serverVal}
            onBlur={(e) => {
              if (e.target.value !== getServerBase()) saveServer(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            placeholder="https://your-server.com (apnar server er link)"
            className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
          <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">
            App er nijer UI built-in — sudhu server link ekbar dile thakbe. Change korle Enter chapun.
          </p>
        </div>
      </motion.div>

      {/* Footer highlights */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-xs text-slate-500 z-10">
        <span className="flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> Private chats &amp; groups
        </span>
        <span className="flex items-center gap-1.5">
          <Video className="w-3.5 h-3.5 text-sky-400" /> HD voice &amp; video
        </span>
        <span className="flex items-center gap-1.5">
          <MonitorSmartphone className="w-3.5 h-3.5 text-emerald-400" /> Remote device control
        </span>
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-600 z-10">
        <ShieldCheck className="w-3 h-3" />
        Encrypted in transit
      </div>
    </div>
  );
};

const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
    />
  </svg>
);
