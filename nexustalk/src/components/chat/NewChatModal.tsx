import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Loader2, MessageSquarePlus, AtSign, Users, Check } from 'lucide-react';
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

/** Real "start a conversation" — add friends by username, or create a group. */
export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onChatCreated }) => {
  const [mode, setMode] = useState<'chat' | 'group'>('chat');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoundUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<FoundUser[]>([]);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setError('');
      setMode('chat');
      setGroupName('');
      setMembers([]);
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

  const createGroup = async () => {
    setError('');
    if (groupName.trim().length < 2) {
      setError('Group name must be at least 2 characters');
      return;
    }
    if (members.length < 1) {
      setError('Add at least 1 member');
      return;
    }
    setStarting('group');
    try {
      const res = await api<{ chatId: string }>('/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: groupName.trim(),
          usernames: members.map((m) => m.username),
        }),
      });
      onChatCreated(res.chatId);
    } catch (err: any) {
      setError(err.message ?? 'Could not create the group');
    } finally {
      setStarting(null);
    }
  };

  const toggleMember = (user: FoundUser) => {
    setMembers((prev) =>
      prev.some((m) => m.id === user.id)
        ? prev.filter((m) => m.id !== user.id)
        : [...prev, user]
    );
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
                  {mode === 'chat' ? (
                    <MessageSquarePlus className="w-5 h-5 text-indigo-300" strokeWidth={1.8} />
                  ) : (
                    <Users className="w-5 h-5 text-indigo-300" strokeWidth={1.8} />
                  )}
                  {mode === 'chat' ? 'New conversation' : 'New group'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {mode === 'chat' ? 'Add a friend with their username' : 'Group name + members select korun'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode pills */}
            <div className="px-5 pb-3 shrink-0 flex items-center gap-1.5 text-xs">
              {([
                { id: 'chat', label: 'Direct chat' },
                { id: 'group', label: 'New group' },
              ] as const).map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setMode(m.id);
                    setMembers([]);
                    setError('');
                  }}
                  className={`px-3.5 py-1.5 rounded-full font-medium transition-all cursor-pointer ${
                    mode === m.id
                      ? 'accent-gradient on-accent shadow-md shadow-indigo-600/25'
                      : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Group name (group mode) */}
            {mode === 'group' && (
              <div className="px-5 pb-3 shrink-0">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name — e.g. Cricket Team"
                  maxLength={50}
                  className="w-full px-4 py-3 rounded-2xl bg-white/[0.06] border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-transparent transition-all"
                />
                {members.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {members.map((m) => (
                      <span key={m.id} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-[11px] text-indigo-200">
                        {m.name}
                        <button onClick={() => toggleMember(m)} className="cursor-pointer hover:text-white">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

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

              {results.map((user) => {
                const selected = members.some((m) => m.id === user.id);
                return (
                  <motion.button
                    key={user.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => (mode === 'group' ? toggleMember(user) : startChat(user))}
                    disabled={starting !== null}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/[0.05] text-left transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <Avatar src={user.avatar} name={user.name} className="w-12 h-12 text-base" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-slate-100 truncate">{user.name}</h4>
                      <p className="text-xs text-indigo-300/90 font-mono truncate">@{user.username}</p>
                    </div>
                    {mode === 'group' && selected && (
                      <span className="w-5 h-5 rounded-full accent-gradient on-accent flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                    )}
                    {mode === 'chat' && starting === user.id && (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
                    )}
                  </motion.button>
                );
              })}

              {query.trim().length < 2 && (
                <div className="text-center py-10 px-6">
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Type your friend's{' '}
                    <span className="text-slate-200 font-semibold font-mono">@username</span>{' '}
                    {mode === 'group' ? 'to add them to the group.' : 'to start chatting.'}
                  </p>
                </div>
              )}

              {mode === 'group' && members.length > 0 && (
                <div className="px-1 pt-2 sticky bottom-0">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={createGroup}
                    disabled={starting === 'group'}
                    className="w-full py-3 rounded-2xl accent-gradient on-accent font-semibold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                  >
                    {starting === 'group' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Users className="w-4 h-4" />
                        <span>Create group ({members.length + 1} members)</span>
                      </>
                    )}
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
