import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Heart, Send, Sparkles } from 'lucide-react';
import { StoryUpdate } from '../../types';

interface StatusStoriesModalProps {
  isOpen: boolean;
  storyGroup: StoryUpdate | null;
  onClose: () => void;
}

export const StatusStoriesModal: React.FC<StatusStoriesModalProps> = ({
  isOpen,
  storyGroup,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    setCurrentIndex(0);
    setLiked(false);
    setReplyText('');
  }, [storyGroup]);

  // Auto progression
  useEffect(() => {
    if (!isOpen || !storyGroup) return;
    const timer = setTimeout(() => {
      if (currentIndex < storyGroup.stories.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        onClose();
      }
    }, 6000);
    return () => clearTimeout(timer);
  }, [isOpen, storyGroup, currentIndex, onClose]);

  if (!isOpen || !storyGroup) return null;

  const currentStory = storyGroup.stories[currentIndex];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < storyGroup.stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md h-[85vh] max-h-[760px] rounded-3xl overflow-hidden bg-slate-900 border border-white/10 flex flex-col shadow-2xl"
        >
          {/* Progress Indicators */}
          <div className="absolute top-3 inset-x-4 z-20 flex gap-1.5">
            {storyGroup.stories.map((story, i) => (
              <div key={story.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-white transition-all duration-300 ${
                    i < currentIndex ? 'w-full' : i === currentIndex ? 'w-full animate-pulse' : 'w-0'
                  }`}
                />
              </div>
            ))}
          </div>

          {/* User Header */}
          <div className="absolute top-6 inset-x-4 z-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={storyGroup.userAvatar}
                alt={storyGroup.userName}
                className="w-10 h-10 rounded-full ring-2 ring-indigo-500 object-cover"
              />
              <div>
                <h4 className="text-sm font-semibold text-white leading-tight">
                  {storyGroup.userName}
                </h4>
                <span className="text-[11px] text-white/70">{currentStory.timestamp}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white backdrop-blur-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Story Media */}
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
            <img
              src={currentStory.imageUrl}
              alt="Story"
              className="w-full h-full object-cover select-none"
            />
            {/* Subtle dark gradient on top and bottom for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />

            {/* Left & Right Tap Hotspots */}
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Caption */}
          {currentStory.caption && (
            <div className="absolute bottom-16 inset-x-4 z-20 text-center">
              <p className="inline-block px-4 py-2 rounded-2xl bg-black/50 backdrop-blur-md text-white text-sm font-medium border border-white/10 shadow-lg">
                {currentStory.caption}
              </p>
            </div>
          )}

          {/* Bottom Reply Bar */}
          <div className="relative z-20 p-3 bg-slate-950/80 border-t border-white/10 backdrop-blur-md flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply to story..."
                className="w-full pl-4 pr-10 py-2.5 rounded-2xl bg-white/10 text-white placeholder-white/50 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <button
                onClick={() => {
                  if (replyText.trim()) setReplyText('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
              >
                <Send className="w-4 h-4 text-indigo-400" />
              </button>
            </div>
            <button
              onClick={() => setLiked(!liked)}
              className={`p-2.5 rounded-2xl border transition-all ${
                liked
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : 'bg-white/10 border-white/5 text-white/70 hover:text-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${liked ? 'fill-rose-400' : ''}`} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
