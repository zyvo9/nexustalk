import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Plus, Search, Shield, Sparkles } from 'lucide-react';
import { CallRecord } from '../../types';
import { EmptyState } from '../common/EmptyState';
import { CallItemSkeleton } from '../common/SkeletonLoader';

interface CallsListProps {
  calls: CallRecord[];
  onStartVoiceCall: (name: string, avatar: string) => void;
  onStartVideoCall: (name: string, avatar: string) => void;
  isLoading?: boolean;
}

export const CallsList: React.FC<CallsListProps> = ({
  calls,
  onStartVoiceCall,
  onStartVideoCall,
  isLoading = false,
}) => {
  const [filter, setFilter] = useState<'all' | 'missed'>('all');
  const [search, setSearch] = useState('');

  const filteredCalls = calls.filter((call) => {
    const matchesSearch = call.contactName.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'missed') return call.direction === 'missed';
    return true;
  });

  const renderCallIcon = (direction: CallRecord['direction'], type: CallRecord['type']) => {
    if (direction === 'missed') {
      return <PhoneMissed className="w-4 h-4 text-rose-400 shrink-0" />;
    }
    if (direction === 'incoming') {
      return <PhoneIncoming className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    return <PhoneOutgoing className="w-4 h-4 text-cyan-400 shrink-0" />;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/70 relative">
      {/* Search & Filter Header */}
      <div className="p-3.5 space-y-3 border-b border-white/5 bg-slate-950/40 backdrop-blur-md">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search call logs..."
            className="w-full pl-9 pr-3 py-2 rounded-2xl bg-slate-900/80 border border-white/5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filter === 'all'
                ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Calls
          </button>
          <button
            onClick={() => setFilter('missed')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filter === 'missed'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            Missed
          </button>
        </div>
      </div>

      {/* List Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <>
            <CallItemSkeleton />
            <CallItemSkeleton />
            <CallItemSkeleton />
          </>
        ) : filteredCalls.length === 0 ? (
          <EmptyState
            type="calls"
            title="No call history"
            description="Start encrypted voice or video calls directly from NexusTalk."
            actionText="New Call"
            onAction={() =>
              onStartVoiceCall('Ayesha Rahman', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80')
            }
          />
        ) : (
          filteredCalls.map((call) => (
            <motion.div
              key={call.id}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/50 hover:bg-slate-900/90 border border-white/5 transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={call.contactAvatar}
                  alt={call.contactName}
                  className="w-12 h-12 rounded-2xl object-cover ring-1 ring-white/10"
                />
                <div className="min-w-0">
                  <h4
                    className={`font-semibold text-sm truncate ${
                      call.direction === 'missed' ? 'text-rose-400' : 'text-slate-100'
                    }`}
                  >
                    {call.contactName}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                    {renderCallIcon(call.direction, call.type)}
                    <span>{call.timestamp}</span>
                    {call.duration && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span>{call.duration}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Call Trigger Buttons */}
              <div className="flex items-center gap-1">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => onStartVoiceCall(call.contactName, call.contactAvatar)}
                  className="p-2.5 rounded-xl text-slate-300 hover:text-cyan-300 hover:bg-white/5 transition-colors"
                  title="Voice Call"
                >
                  <Phone className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => onStartVideoCall(call.contactName, call.contactAvatar)}
                  className="p-2.5 rounded-xl text-slate-300 hover:text-indigo-300 hover:bg-white/5 transition-colors"
                  title="Video Call"
                >
                  <Video className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Floating New Call Button */}
      <div className="absolute right-4 bottom-5 z-20">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={() =>
            onStartVoiceCall('Ayesha Rahman', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80')
          }
          className="w-12 h-12 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 cursor-pointer"
          title="New Voice/Video Call"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      </div>
    </div>
  );
};
