import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  User,
  Shield,
  Bell,
  Palette,
  Laptop,
  Activity,
  LogOut,
  Moon,
  Sun,
  Camera,
  Check,
  TerminalSquare,
  MonitorSmartphone
} from 'lucide-react';
import { UserProfile } from '../../types';
import { chatWallpapers } from '../../data/mockData';

interface SettingsTabProps {
  user: UserProfile;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  onOpenDebugOverlay: () => void;
  onLogout: () => void;
  isLoadingSkeleton: boolean;
  onToggleSkeleton: () => void;
  isEmptyState: boolean;
  onToggleEmptyState: () => void;
  isConnectionLost: boolean;
  onToggleConnectionLost: () => void;
  onTriggerConsentDialog: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  user,
  isDarkTheme,
  onToggleTheme,
  onOpenDebugOverlay,
  onLogout,
  isLoadingSkeleton,
  onToggleSkeleton,
  isEmptyState,
  onToggleEmptyState,
  isConnectionLost,
  onToggleConnectionLost,
  onTriggerConsentDialog,
}) => {
  const [activeSection, setActiveSection] = useState<'profile' | 'devices' | 'privacy' | 'appearance' | 'notifications'>('profile');
  const [name, setName] = useState(user.name);
  const [statusText, setStatusText] = useState(user.statusText);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedWallpaper, setSelectedWallpaper] = useState(chatWallpapers[0].id);

  const [notificationTones, setNotificationTones] = useState(true);
  const [remoteChime, setRemoteChime] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);

  const [linkedSessions, setLinkedSessions] = useState([
    { id: 'sess_mac', name: 'MacBook Pro 16" (Safari 18)', location: 'Dhaka, Bangladesh', ip: '103.14.22.1', activeNow: true },
    { id: 'sess_win', name: 'Windows 11 Studio (Nexus Agent)', location: 'Dhaka, Bangladesh', ip: '103.14.22.18', activeNow: false, lastActive: 'Active 2h ago' },
    { id: 'sess_phone', name: 'Pixel 9 Pro Fold (Android 15)', location: 'Dhaka, Bangladesh', ip: '103.14.22.99', activeNow: false, lastActive: 'Active yesterday' },
  ]);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleRevokeSession = (sessionId: string) => {
    setLinkedSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  const Toggle = ({ on, onClick, tone = 'accent' }: { on: boolean; onClick: () => void; tone?: 'accent' | 'green' }) => (
    <button
      onClick={onClick}
      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer ${
        on ? (tone === 'green' ? 'bg-emerald-500' : 'accent-gradient') : 'bg-slate-700'
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-slate-950/80 overflow-y-auto p-4 sm:p-8 space-y-6">
      {/* Section pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        {[
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'devices', label: 'Sessions', icon: Laptop },
          { id: 'appearance', label: 'Appearance', icon: Palette },
          { id: 'privacy', label: 'Security', icon: Shield },
          { id: 'notifications', label: 'Notifications', icon: Bell },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id as any)}
              className={`px-3.5 py-2 rounded-full font-medium whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'accent-gradient on-accent shadow-md shadow-indigo-600/25'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" strokeWidth={1.9} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Profile */}
      {activeSection === 'profile' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-slate-900/80 border border-white/[0.07] p-5 sm:p-6 shadow-xl space-y-5"
        >
          <div className="flex flex-col sm:flex-row items-center gap-5 pb-5 border-b border-white/5">
            <div className="relative group cursor-pointer">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-24 h-24 rounded-full object-cover ring-2 ring-indigo-400/50 shadow-xl"
              />
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                <Camera className="w-6 h-6" strokeWidth={1.8} />
              </div>
            </div>

            <div className="text-center sm:text-left space-y-1">
              <h3 className="text-lg font-bold text-slate-100">{name}</h3>
              <p className="text-xs text-indigo-300/90 font-mono">
                {user.username ? `@${user.username}` : user.email}
              </p>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Verified account
              </div>
            </div>
          </div>

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Display name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-white/[0.05] border border-white/10 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-medium transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">About</label>
              <input
                type="text"
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-white/[0.05] border border-white/10 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
            </div>

            <div className="flex items-center justify-end pt-1">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-2xl accent-gradient on-accent text-xs font-semibold shadow-md shadow-indigo-600/25 flex items-center gap-1.5 hover:shadow-indigo-600/45 cursor-pointer"
              >
                {isSaved ? <Check className="w-4 h-4" /> : null}
                <span>{isSaved ? 'Saved' : 'Save changes'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Linked sessions */}
      {activeSection === 'devices' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-slate-900/80 border border-white/[0.07] p-5 sm:p-6 shadow-xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-slate-100">Active login sessions</h3>
              <p className="text-xs text-slate-500 mt-0.5">Log out from any device remotely</p>
            </div>
            <button
              onClick={() => setLinkedSessions(linkedSessions.filter((s) => s.activeNow))}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
            >
              Log out all others
            </button>
          </div>

          <div className="space-y-2.5">
            {linkedSessions.map((sess) => (
              <div
                key={sess.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-slate-300">
                    <Laptop className="w-[18px] h-[18px]" strokeWidth={1.7} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-100 flex items-center gap-2">
                      <span>{sess.name}</span>
                      {sess.activeNow && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold">
                          This device
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {sess.location} · {sess.ip} · {sess.activeNow ? 'Active now' : sess.lastActive}
                    </p>
                  </div>
                </div>

                {!sess.activeNow && (
                  <button
                    onClick={() => handleRevokeSession(sess.id)}
                    className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer"
                    title="Terminate session"
                  >
                    <LogOut className="w-4 h-4" strokeWidth={1.8} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Appearance */}
      {activeSection === 'appearance' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-slate-900/80 border border-white/[0.07] p-5 sm:p-6 shadow-xl space-y-5"
        >
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
            <div>
              <h4 className="font-semibold text-sm text-slate-100">Theme</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Currently using <span className="text-slate-300 font-semibold">{isDarkTheme ? 'Dark' : 'Light'}</span>
              </p>
            </div>
            <button
              onClick={onToggleTheme}
              className="px-4 py-2 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
            >
              {isDarkTheme ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-300" />}
              <span>Switch to {isDarkTheme ? 'Light' : 'Dark'}</span>
            </button>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-slate-100 mb-1">Default chat wallpaper</h4>
            <p className="text-xs text-slate-500 mb-3">Backdrop for your conversations</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {chatWallpapers.map((wp) => (
                <div
                  key={wp.id}
                  onClick={() => setSelectedWallpaper(wp.id)}
                  className={`h-24 rounded-2xl p-3 border cursor-pointer relative flex flex-col justify-end transition-all bg-slate-950 ${wp.class} ${
                    selectedWallpaper === wp.id
                      ? 'border-indigo-400 ring-2 ring-indigo-500/40 shadow-lg'
                      : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  <span className="text-xs font-semibold text-slate-200 truncate drop-shadow">
                    {wp.name}
                  </span>
                  {selectedWallpaper === wp.id && (
                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full accent-gradient on-accent flex items-center justify-center font-bold text-[10px] shadow-md">
                      ✓
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Security */}
      {activeSection === 'privacy' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-slate-900/80 border border-white/[0.07] p-5 sm:p-6 shadow-xl space-y-4 text-xs"
        >
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
            <div>
              <h4 className="font-semibold text-sm text-slate-100">Two-step verification</h4>
              <p className="text-slate-500 mt-0.5">Require a security PIN when registering your number</p>
            </div>
            <Toggle on={twoFactorAuth} onClick={() => setTwoFactorAuth(!twoFactorAuth)} tone="green" />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
            <div>
              <h4 className="font-semibold text-sm text-slate-100">Read receipts</h4>
              <p className="text-slate-500 mt-0.5">Show blue ticks when messages are read</p>
            </div>
            <Toggle on={readReceipts} onClick={() => setReadReceipts(!readReceipts)} />
          </div>

          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 text-indigo-200">
            <h5 className="font-bold mb-1 flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> End-to-end encryption
            </h5>
            <p className="leading-relaxed text-indigo-200/80">
              Messages, calls, and remote sessions are encrypted end-to-end. Keys never leave your devices.
            </p>
          </div>
        </motion.div>
      )}

      {/* Notifications */}
      {activeSection === 'notifications' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-slate-900/80 border border-white/[0.07] p-5 sm:p-6 shadow-xl space-y-3 text-xs"
        >
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
            <div>
              <h4 className="font-semibold text-sm text-slate-100">Message tones</h4>
              <p className="text-slate-500 mt-0.5">Play a subtle sound on incoming messages</p>
            </div>
            <Toggle on={notificationTones} onClick={() => setNotificationTones(!notificationTones)} />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
            <div>
              <h4 className="font-semibold text-sm text-slate-100">Remote request chime</h4>
              <p className="text-slate-500 mt-0.5">Alert when someone asks to control your device</p>
            </div>
            <Toggle on={remoteChime} onClick={() => setRemoteChime(!remoteChime)} />
          </div>
        </motion.div>
      )}

      {/* Diagnostics */}
      <div className="relative z-10 rounded-3xl bg-slate-900/70 border border-white/[0.07] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 text-sky-300 flex items-center justify-center">
            <Activity className="w-[18px] h-[18px]" strokeWidth={1.8} />
          </div>
          <div>
            <h4 className="font-bold text-slate-100">Network quality HUD</h4>
            <p className="text-slate-500 text-[11px] mt-0.5">Live ping, FPS, bitrate and WebRTC transport info</p>
          </div>
        </div>
        <button
          onClick={onOpenDebugOverlay}
          className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 font-semibold border border-white/10 transition-colors cursor-pointer"
        >
          Open HUD
        </button>
      </div>

      {/* Developer demo controls (UI showcase) */}
      <div className="relative z-10 rounded-3xl border border-dashed border-white/15 p-4 sm:p-5 text-xs space-y-3">
        <div className="flex items-center gap-2 text-slate-400">
          <TerminalSquare className="w-4 h-4" strokeWidth={1.8} />
          <h4 className="font-bold text-slate-300">Developer demo controls</h4>
        </div>
        <p className="text-slate-500 text-[11px]">
          Preview UI states — hidden in the real product.
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Consent dialog', active: false, onClick: onTriggerConsentDialog, icon: MonitorSmartphone },
            { label: 'Skeleton loading', active: isLoadingSkeleton, onClick: onToggleSkeleton },
            { label: 'Empty states', active: isEmptyState, onClick: onToggleEmptyState },
            { label: 'Offline mode', active: isConnectionLost, onClick: onToggleConnectionLost },
          ].map((chip) => (
            <button
              key={chip.label}
              onClick={chip.onClick}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
                chip.active
                  ? 'accent-gradient on-accent'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="relative z-10 pt-1 pb-4">
        <button
          onClick={onLogout}
          className="w-full py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.8} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
};
