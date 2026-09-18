import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Camera, ArrowRight, Loader2, ShieldCheck, AtSign } from 'lucide-react';
import { api, setToken } from '../../lib/api';

interface OnboardingScreenProps {
  /** Present when a brand-new Google user is finishing signup. */
  googleSignupToken?: string | null;
  /** Present when an email-registered user still needs onboarding. */
  me?: { name: string; email: string; avatar: string | null } | null;
  onFinished: () => void;
}

/** Resize a chosen image to a 256px square JPEG (data URL). */
function fileToAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('no canvas'));
      const min = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('Could not read that image'));
    img.src = url;
  });
}

/** WhatsApp-style first-run setup: profile photo (optional) + name. */
export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  googleSignupToken,
  me,
  onFinished,
}) => {
  const payload = useMemo(
    () => (googleSignupToken ? decodeJwtPayload(googleSignupToken) : null),
    [googleSignupToken]
  );

  const initialName = payload?.name ?? (me && me.name !== 'NexusTalk user' ? me.name : '');
  const [name, setName] = useState(initialName);
  const [username, setUsername] = useState(
    (payload?.email ?? me?.email ?? '').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)
  );
  const [avatar, setAvatar] = useState<string | null>(payload?.picture ?? me?.avatar ?? null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const displayEmail = payload?.email ?? me?.email ?? '';
  const usernameValid = /^[a-z0-9_]{3,20}$/.test(username);

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setAvatar(await fileToAvatarDataUrl(file));
    } catch (err: any) {
      setError(err.message ?? 'Could not read that image');
    }
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!usernameValid) {
      setError('Username: 3–20 characters, only a-z, 0-9 and _');
      return;
    }
    setBusy(true);
    try {
      if (googleSignupToken) {
        const res = await api<{ token: string }>('/api/auth/google/complete', {
          method: 'POST',
          body: JSON.stringify({ signupToken: googleSignupToken, name, username, avatar }),
        });
        setToken(res.token);
        onFinished();
      } else {
        await api('/api/me', {
          method: 'PATCH',
          body: JSON.stringify({ name, username, avatar }),
        });
        onFinished();
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[#070b15] text-slate-100">
      <div className="aurora-bg" />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-[28px] glass p-6 sm:p-8 shadow-2xl shadow-black/50 relative z-10"
      >
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-white">Profile info</h1>
          <p className="text-xs text-slate-400 mt-1.5">
            This is how people will see you on NexusTalk
          </p>
        </div>

        {error && (
          <div className="mb-4 px-3.5 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleContinue} className="space-y-5">
          {/* Photo (optional) */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative group cursor-pointer"
              title="Add a profile photo (optional)"
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover ring-2 ring-indigo-400/60 shadow-xl"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-white/[0.06] border-2 border-dashed border-white/20 flex items-center justify-center text-slate-400">
                  <Camera className="w-8 h-8" strokeWidth={1.5} />
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-8 h-8 rounded-full accent-gradient flex items-center justify-center shadow-lg ring-2 ring-[#070b15]">
                <Camera className="w-4 h-4 on-accent" strokeWidth={2} />
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={pickFile}
            />
          </div>

          {/* Name + username */}
          <div className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                Your name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahim Uddin"
                required
                minLength={2}
                maxLength={40}
                className="w-full px-4 py-3 rounded-2xl bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                Username <span className="text-indigo-300">(required — friends add you with this)</span>
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                  }
                  placeholder="rahim_99"
                  required
                  minLength={3}
                  maxLength={20}
                  pattern="[a-z0-9_]{3,20}"
                  className={`w-full pl-10 pr-4 py-3 rounded-2xl bg-white/[0.06] border text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all font-mono ${
                    username.length === 0 || usernameValid
                      ? 'border-white/10 focus:ring-indigo-500/60'
                      : 'border-rose-500/50 focus:ring-rose-500/50'
                  }`}
                />
              </div>
              <p className={`text-[11px] mt-1.5 ${usernameValid || username.length === 0 ? 'text-slate-500' : 'text-rose-400'}`}>
                3–20 characters · a-z, 0-9 and _ only · this is your unique ID
              </p>
            </div>

            {displayEmail && (
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {displayEmail}
              </p>
            )}
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
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
              </>
            )}
          </motion.button>

          <p className="text-center text-[11px] text-slate-500">
            Photo is optional — you can add or change it later in Settings.
          </p>
        </form>
      </motion.div>
    </div>
  );
};

/** Read the (non-secret) payload of a JWT for prefilling the signup step. */
function decodeJwtPayload(token: string): { name?: string; email?: string; picture?: string } | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}
