import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Loader2, MessageSquarePlus, AtSign } from 'lucide-react';
import { api } from '../../lib/api';
import { Avatar } from '../common/Avatar';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatCreated: (chatId: string) => void;
}

interface FoundUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  username: string;
}

/** Real "start a conversation" — add friends by their username. */
export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onChatCreated }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoundUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = query.trim().replace(/^@/, '');
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      try {
        const res = await api<{ users: FoundUser[] }>(
          `/api/users/search?q=${encodeURIComponent(q)}`
        );
        setResults(res.users);
      } catch (err: any) {
        setError(err.message ?? 'Search failed');
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  const startChat = async (user: FoundUser) => {
    setError('');
    setStarting(user.id);
    try {
      const res = await api<{ chatId: string }>('/api/chats/dm', {
        method: 'POST',
        body: JSON.stringify({ username: user.username }),
      });
      onChatCreated(res.chatId);
    } catch (err: any) {
      setError(err.message ?? 'Could not start the chat');
    } finally {
      setStarting(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md h-[80vh] sm:h-auto sm:max-h-[70vh] rounded-t-[28px] sm:rounded-[28px] glass shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 pb-3 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <MessageSquarePlus className="w-5 h-5 text-indigo-300" strokeWidth={1.8} />
                  New conversation
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Add a friend with their username
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 pb-3 shrink-0">
              <div className="relative">
                <AtSign className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={1.8} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="username"
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/[0.06] border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent transition-all font-mono"
                />
              </div>
              {error && <p className="text-xs text-rose-400 mt-2 font-medium">{error}</p>}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
              {query.trim().length >= 2 && !searching && results.length === 0 && (
                <div className="text-center py-10 text-sm text-slate-500">
                  No user found with @{query.trim()}
                </div>
              )}

              {searching && (
                <div className="flex items-center justify-center py-10 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              )}

              {results.map((user) => (
                <motion.button
                  key={user.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => startChat(user)}
                  disabled={starting !== null}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/[0.05] text-left transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Avatar src={user.avatar} name={user.name} className="w-12 h-12 text-base" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-slate-100 truncate">{user.name}</h4>
                    <p className="text-xs text-indigo-300/90 font-mono truncate">@{user.username}</p>
                  </div>
                  {starting === user.id && (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
                  )}
                </motion.button>
              ))}

              {query.trim().length < 2 && (
                <div className="text-center py-10 px-6">
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Type your friend's{' '}
                    <span className="text-slate-200 font-semibold font-mono">@username</span>{' '}
                    to start chatting.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
