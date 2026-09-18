import React from 'react';
import { motion } from 'motion/react';
import { Plus, Camera, Sparkles, Clock, Eye } from 'lucide-react';
import { StoryUpdate, UserProfile } from '../../types';

interface StatusTabProps {
  myUser: UserProfile;
  stories: StoryUpdate[];
  onOpenStory: (story: StoryUpdate) => void;
}

export const StatusTab: React.FC<StatusTabProps> = ({
  myUser,
  stories,
  onOpenStory,
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-950/80 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Status Updates</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          End-to-end encrypted ephemeral stories that disappear after 24 hours
        </p>
      </div>

      {/* My Status Card */}
      <div className="flex items-center justify-between p-4 rounded-3xl bg-slate-900/80 border border-white/10 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="relative cursor-pointer">
            <img
              src={myUser.avatar}
              alt="My Avatar"
              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/40"
            />
            <button
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center font-bold text-xs shadow-md"
              title="Add to My Status"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h4 className="font-bold text-sm text-white">My Status</h4>
            <p className="text-xs text-slate-400">Tap to add photo, video, or snippet update</p>
          </div>
        </div>

        <button
          className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-white/5 transition-colors"
          title="Camera"
        >
          <Camera className="w-5 h-5" />
        </button>
      </div>

      {/* Recent Updates */}
      <div className="space-y-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block px-1">
          Recent Updates ({stories.length})
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {stories.map((storyGroup) => (
            <motion.div
              key={storyGroup.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onOpenStory(storyGroup)}
              className="p-3.5 rounded-3xl bg-slate-900/70 hover:bg-slate-900 border border-white/10 cursor-pointer shadow-md flex items-center gap-3.5 transition-all group"
            >
              {/* Avatar with colorful gradient ring for unseen status */}
              <div
                className={`p-0.5 rounded-2xl ${
                  storyGroup.hasUnseen
                    ? 'bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-500 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-700'
                }`}
              >
                <img
                  src={storyGroup.userAvatar}
                  alt={storyGroup.userName}
                  className="w-12 h-12 rounded-[14px] object-cover bg-slate-900"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-white truncate group-hover:text-cyan-300 transition-colors">
                  {storyGroup.userName}
                </h4>
                <p className="text-xs text-slate-400 truncate flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{storyGroup.timestamp}</span>
                  <span className="text-slate-600">•</span>
                  <span>{storyGroup.stories.length} stories</span>
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
