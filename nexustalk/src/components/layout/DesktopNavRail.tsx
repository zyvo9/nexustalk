import React from 'react';
import { motion } from 'motion/react';
import {
  MessageSquare,
  PhoneCall,
  MonitorSmartphone,
  Sparkles,
  Settings,
  Sun,
  Moon,
  Activity
} from 'lucide-react';
import { TabType, UserProfile } from '../../types';

interface DesktopNavRailProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  unreadChatsCount: number;
  onlineDevicesCount: number;
  user: UserProfile;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  onOpenDebug: () => void;
}

export const DesktopNavRail: React.FC<DesktopNavRailProps> = ({
  activeTab,
  onSelectTab,
  unreadChatsCount,
  onlineDevicesCount,
  user,
  isDarkTheme,
  onToggleTheme,
  onOpenDebug,
}) => {
  const navItems = [
    { id: 'chats' as TabType, label: 'Chats', icon: MessageSquare, badge: unreadChatsCount },
    { id: 'calls' as TabType, label: 'Calls', icon: PhoneCall },
    { id: 'devices' as TabType, label: 'Devices', icon: MonitorSmartphone, dot: onlineDevicesCount > 0 },
    { id: 'status' as TabType, label: 'Status', icon: Sparkles },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="hidden md:flex flex-col items-center justify-between w-[74px] h-full bg-slate-950/70 backdrop-blur-2xl border-r border-white/5 py-5 shrink-0 z-30 select-none">
      {/* Brand mark */}
      <div className="flex flex-col items-center gap-7">
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => onSelectTab('chats')}
          className="w-11 h-11 rounded-[14px] accent-gradient flex items-center justify-center shadow-lg shadow-indigo-600/30 cursor-pointer"
          title="NexusTalk"
        >
          <span className="on-accent font-extrabold text-[15px] tracking-tight">N</span>
        </motion.button>

        {/* Navigation */}
        <nav className="flex flex-col items-center gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <div key={item.id} className="relative group">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => onSelectTab(item.id)}
                  className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                  }`}
                  title={item.label}
                >
                  {isActive && (
                    <motion.span
                      layoutId="activeTabIndicator"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      className="absolute -left-[15px] w-[3px] h-5 rounded-full accent-gradient"
                    />
                  )}
                  <Icon className="w-[19px] h-[19px]" strokeWidth={isActive ? 2.2 : 1.8} />

                  {/* Counter badge */}
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full accent-gradient on-accent text-[10px] font-bold flex items-center justify-center shadow-md shadow-indigo-600/40">
                      {item.badge}
                    </span>
                  ) : null}
                  {item.dot && !item.badge ? (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
                  ) : null}
                </motion.button>

                {/* Hover tooltip */}
                <div className="absolute left-[54px] top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-white text-xs font-medium shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  {item.label}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom controls */}
      <div className="flex flex-col items-center gap-2.5">
        <button
          onClick={onOpenDebug}
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
          title="Network quality HUD"
        >
          <Activity className="w-[18px] h-[18px]" strokeWidth={1.8} />
        </button>

        <button
          onClick={onToggleTheme}
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
          title={isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDarkTheme ? <Sun className="w-[18px] h-[18px]" strokeWidth={1.8} /> : <Moon className="w-[18px] h-[18px]" strokeWidth={1.8} />}
        </button>

        <button
          onClick={() => onSelectTab('settings')}
          className="relative cursor-pointer group mt-1"
          title={`${user.name} — Settings`}
        >
          <img
            src={user.avatar}
            alt={user.name}
            className={`w-10 h-10 rounded-full object-cover transition-all ${
              activeTab === 'settings'
                ? 'ring-2 ring-indigo-400'
                : 'ring-1 ring-white/10 group-hover:ring-white/30'
            }`}
          />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
        </button>
      </div>
    </div>
  );
};
