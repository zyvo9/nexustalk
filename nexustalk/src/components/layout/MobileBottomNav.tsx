import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare, PhoneCall, MonitorSmartphone, Sparkles, Settings } from 'lucide-react';
import { TabType } from '../../types';

interface MobileBottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  unreadChatsCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  unreadChatsCount,
}) => {
  const tabs = [
    { id: 'chats' as TabType, label: 'Chats', icon: MessageSquare, badge: unreadChatsCount },
    { id: 'calls' as TabType, label: 'Calls', icon: PhoneCall },
    { id: 'devices' as TabType, label: 'Devices', icon: MonitorSmartphone },
    { id: 'status' as TabType, label: 'Status', icon: Sparkles },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="md:hidden sticky bottom-0 inset-x-0 bg-slate-950/85 border-t border-white/5 backdrop-blur-2xl z-30 px-3 pt-1.5 pb-safe flex items-center justify-around shadow-2xl select-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
              isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <div className="relative">
              <Icon className="w-[21px] h-[21px]" strokeWidth={isActive ? 2.1 : 1.8} />
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full accent-gradient on-accent font-bold text-[9px] flex items-center justify-center shadow-md">
                  {tab.badge}
                </span>
              ) : null}
            </div>
            <span className={`text-[10px] mt-1 tracking-tight ${isActive ? 'font-semibold' : ''}`}>
              {tab.label}
            </span>

            {isActive && (
              <motion.div
                layoutId="mobileActiveTab"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                className="absolute -bottom-0.5 w-5 h-[3px] rounded-full accent-gradient"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
