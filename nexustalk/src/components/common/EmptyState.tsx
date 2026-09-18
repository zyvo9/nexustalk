import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare, PhoneCall, MonitorSmartphone, Search } from 'lucide-react';

interface EmptyStateProps {
  type: 'chats' | 'calls' | 'devices' | 'search' | 'messages';
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  actionText,
  onAction,
}) => {
  const getIconAndText = () => {
    switch (type) {
      case 'chats':
        return {
          icon: <MessageSquare className="w-12 h-12 text-indigo-400/80" />,
          title: title || 'No conversations yet',
          desc: description || 'Start an encrypted chat or group with your teammates and friends.',
          action: actionText || 'Start New Chat',
        };
      case 'calls':
        return {
          icon: <PhoneCall className="w-12 h-12 text-cyan-400/80" />,
          title: title || 'No recent calls',
          desc: description || 'Crystal clear low-latency voice and HD video calls will show up here.',
          action: actionText || 'Make a Call',
        };
      case 'devices':
        return {
          icon: <MonitorSmartphone className="w-12 h-12 text-violet-400/80" />,
          title: title || 'No remote devices connected',
          desc: description || 'Connect to a PC, Mac, server or phone using a 9-digit ID or QR code.',
          action: actionText || 'Add New Device',
        };
      case 'search':
        return {
          icon: <Search className="w-12 h-12 text-slate-400/80" />,
          title: title || 'No results found',
          desc: description || 'Check for typos or try searching with a different name or keyword.',
          action: actionText,
        };
      case 'messages':
        return {
          icon: <MessageSquare className="w-12 h-12 text-indigo-400/80" />,
          title: title || 'Select a chat to begin',
          desc: description || 'Enjoy end-to-end encrypted messaging, voice notes, and seamless remote session handoffs.',
          action: actionText,
        };
    }
  };

  const config = getIconAndText();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto"
    >
      <div className="relative mb-5 flex items-center justify-center">
        {/* Soft glowing ambient circle */}
        <div className="absolute w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 blur-xl animate-pulse" />
        <div className="relative w-20 h-20 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center justify-center shadow-lg shadow-black/40 backdrop-blur-md">
          {config.icon}
        </div>
      </div>

      <h3 className="text-lg font-semibold text-slate-100 mb-2">{config.title}</h3>
      <p className="text-sm text-slate-400 mb-6 leading-relaxed">{config.desc}</p>

      {config.action && onAction && (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onAction}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-medium text-sm shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all flex items-center gap-2"
        >
          {config.action}
        </motion.button>
      )}
    </motion.div>
  );
};
