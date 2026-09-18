import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Pin, Check, CheckCheck, Plus, Clock } from 'lucide-react';
import { Chat } from '../../types';
import { ChatItemSkeleton } from '../common/SkeletonLoader';
import { EmptyState } from '../common/EmptyState';
import { Avatar } from '../common/Avatar';

interface ChatListProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onOpenNewChatModal: () => void;
  isLoading?: boolean;
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  selectedChatId,
  onSelectChat,
  onOpenNewChatModal,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'groups'>('all');

  const filteredChats = chats.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.text.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'unread') return (c.unreadCount ?? 0) > 0;
    if (filterType === 'groups') return c.isGroup;
    return true;
  });

  const pinnedChats = filteredChats.filter((c) => c.pinned);
  const unpinnedChats = filteredChats.filter((c) => !c.pinned);

  const renderStatusTicks = (status: string, isIncoming: boolean) => {
    if (isIncoming) return null;
    switch (status) {
      case 'read':
        return <CheckCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
      case 'delivered':
        return <CheckCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
      case 'sent':
        return <Check className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
      case 'pending':
        return <Clock className="w-3 h-3 text-slate-600 shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/60 border-r border-white/5 relative">
      {/* Top Search & Filter Bar */}
      <div className="px-3.5 pt-4 pb-3 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/[0.05] border border-white/5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
          {([
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread' },
            { id: 'groups', label: 'Groups' },
          ] as const).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3.5 py-1.5 rounded-full font-medium transition-all cursor-pointer ${
                filterType === f.id
                  ? 'accent-gradient on-accent shadow-md shadow-indigo-600/25'
                  : 'bg-white/[0.04] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat List Body */}
      <div className="flex-1 overflow-y-auto px-2 pb-16 space-y-0.5">
        {isLoading ? (
          <>
            <ChatItemSkeleton />
            <ChatItemSkeleton />
            <ChatItemSkeleton />
            <ChatItemSkeleton />
          </>
        ) : filteredChats.length === 0 ? (
          <EmptyState
            type={searchQuery ? 'search' : 'chats'}
            title={searchQuery ? 'No chats matched' : 'No chats found'}
            description={searchQuery ? `No conversation matching "${searchQuery}"` : 'Start a chat with your contacts'}
            actionText="Start New Chat"
            onAction={onOpenNewChatModal}
          />
        ) : (
          <>
            {pinnedChats.length > 0 && (
              <div className="mb-1.5">
                <div className="px-3 pt-2 pb-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Pin className="w-3 h-3" />
                  <span>Pinned</span>
                </div>
                {pinnedChats.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isSelected={selectedChatId === chat.id}
                    onSelect={() => onSelectChat(chat.id)}
                    renderStatusTicks={renderStatusTicks}
                  />
                ))}
              </div>
            )}

            {unpinnedChats.length > 0 && (
              <div>
                {pinnedChats.length > 0 && (
                  <div className="px-3 pt-2 pb-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    All Messages
                  </div>
                )}
                {unpinnedChats.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isSelected={selectedChatId === chat.id}
                    onSelect={() => onSelectChat(chat.id)}
                    renderStatusTicks={renderStatusTicks}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating "New Chat" Button */}
      <div className="absolute right-4 bottom-5 z-20">
        <motion.button
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.93 }}
          onClick={onOpenNewChatModal}
          className="w-13 h-13 p-3.5 rounded-2xl accent-gradient on-accent flex items-center justify-center shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 cursor-pointer transition-shadow"
          title="New Chat / Group"
        >
          <Plus className="w-6 h-6" strokeWidth={2.2} />
        </motion.button>
      </div>
    </div>
  );
};

interface ChatItemProps {
  chat: Chat;
  isSelected: boolean;
  onSelect: () => void;
  renderStatusTicks: (status: string, isIncoming: boolean) => React.ReactNode;
}

const ChatItem: React.FC<ChatItemProps> = ({
  chat,
  isSelected,
  onSelect,
  renderStatusTicks,
}) => {
  return (
    <motion.div
      whileTap={{ scale: 0.985 }}
      onClick={onSelect}
      className={`group relative flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-all ${
        isSelected
          ? 'bg-white/[0.07] text-white'
          : 'hover:bg-white/[0.04] text-slate-300'
      }`}
    >
      {/* Selection accent bar */}
      {isSelected && (
        <motion.span
          layoutId="chatSelectionBar"
          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-full accent-gradient"
        />
      )}

      {/* Avatar with Status */}
      <div className="relative shrink-0">
        <Avatar src={chat.avatar || null} name={chat.name} className="w-12 h-12 text-base" />
        {chat.online && !chat.isGroup && (
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 ring-[2.5px] ring-slate-950" />
        )}
      </div>

      {/* Info Column */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <h4 className={`font-semibold text-sm truncate flex items-center gap-1.5 ${isSelected ? 'text-white' : 'text-slate-100'}`}>
            <span className="truncate">{chat.name}</span>
            {chat.pinned && <Pin className="w-3 h-3 text-slate-500 shrink-0 rotate-45" />}
          </h4>
          <span className={`text-[11px] shrink-0 ${chat.unreadCount ? 'text-indigo-300 font-semibold' : 'text-slate-500'}`}>
            {chat.lastMessage.timestamp}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500 truncate flex items-center gap-1">
            {renderStatusTicks(chat.lastMessage.status, chat.lastMessage.isIncoming)}
            <span className="truncate">
              {!chat.lastMessage.isIncoming && chat.lastMessage.text ? 'You: ' : ''}
              {chat.lastMessage.text}
            </span>
          </p>

          {chat.unreadCount && chat.unreadCount > 0 ? (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full accent-gradient on-accent font-bold text-[10px] flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/40">
              {chat.unreadCount}
            </span>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
};
