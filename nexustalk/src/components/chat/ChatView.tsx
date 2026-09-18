import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Phone,
  Video,
  MonitorSmartphone,
  Paperclip,
  Smile,
  Mic,
  Send,
  Check,
  CheckCheck,
  Clock,
  Play,
  Pause,
  Download,
  FileText,
  Image as ImageIcon,
  Reply,
  Heart,
  Info,
  Palette,
  X,
  ChevronLeft
} from 'lucide-react';
import { Chat, Message } from '../../types';
import { chatWallpapers } from '../../data/mockData';
import { Avatar } from '../common/Avatar';

interface ChatViewProps {
  chat: Chat;
  remoteTypingName?: string | null;
  onBackToMobileList?: () => void;
  onStartVoiceCall: (contactName: string, avatar: string) => void;
  onStartVideoCall: (contactName: string, avatar: string) => void;
  onStartRemoteSession: (deviceId?: string, deviceName?: string) => void;
  onOpenGroupInfo: () => void;
  onSendMessage: (chatId: string, text: string, replyTo?: Message['replyTo']) => void;
  onTyping?: (chatId: string, isTyping: boolean) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  chat,
  remoteTypingName,
  onBackToMobileList,
  onStartVoiceCall,
  onStartVideoCall,
  onStartRemoteSession,
  onOpenGroupInfo,
  onSendMessage,
  onTyping,
}) => {
  const [inputText, setInputText] = useState('');
  const [activeWallpaper, setActiveWallpaper] = useState(chatWallpapers[0].id);
  const [showWallpaperMenu, setShowWallpaperMenu] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(35); // percentage for demo
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages.length, remoteTypingName]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(
      chat.id,
      inputText.trim(),
      replyingTo
        ? {
            id: replyingTo.id,
            senderName: replyingTo.senderName,
            text: replyingTo.text,
          }
        : undefined
    );

    setInputText('');
    setReplyingTo(null);
    setShowEmojiMenu(false);
    setShowAttachmentMenu(false);
    onTyping?.(chat.id, false);
  };

  const currentWallpaperConfig =
    chatWallpapers.find((w) => w.id === activeWallpaper) || chatWallpapers[0];

  const emojis = ['👍', '❤️', '🔥', '😂', '🎉', '👏', '⚡', '🚀'];

  const toggleAudio = (msgId: string) => {
    if (playingAudioId === msgId) {
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(msgId);
    }
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-slate-950">
      {/* Header */}
      <div className="h-16 px-4 bg-slate-950/80 border-b border-white/5 backdrop-blur-2xl flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToMobileList && (
            <button
              onClick={onBackToMobileList}
              className="md:hidden p-1.5 -ml-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          <div
            onClick={chat.isGroup ? onOpenGroupInfo : undefined}
            className={`relative flex items-center gap-3 select-none group ${chat.isGroup ? 'cursor-pointer' : ''}`}
          >
            <div className="relative shrink-0">
              <Avatar src={chat.avatar || null} name={chat.name} className="w-10 h-10 text-sm" />
              {chat.online && !chat.isGroup && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-slate-100 truncate group-hover:text-white transition-colors">
                {chat.name}
              </h3>
              <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                {remoteTypingName ? (
                  <span className="text-indigo-300 font-medium">{remoteTypingName} is typing…</span>
                ) : chat.isGroup ? (
                  <span>{chat.groupMembers?.length || 5} members</span>
                ) : chat.online ? (
                  <span className="text-emerald-400 font-medium">online</span>
                ) : (
                  <span>last seen {chat.lastSeen || 'recently'}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Quick Remote Access */}
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => onStartRemoteSession(undefined, chat.name + "'s device")}
            className="px-3 py-1.5 rounded-full accent-gradient on-accent text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/45 transition-shadow cursor-pointer"
            title="Start a remote session"
          >
            <MonitorSmartphone className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Remote</span>
          </motion.button>

          <button
            onClick={() => onStartVoiceCall(chat.name, chat.avatar)}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Voice call"
          >
            <Phone className="w-[18px] h-[18px]" strokeWidth={1.8} />
          </button>

          <button
            onClick={() => onStartVideoCall(chat.name, chat.avatar)}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Video call"
          >
            <Video className="w-[18px] h-[18px]" strokeWidth={1.8} />
          </button>

          {/* Wallpaper picker */}
          <div className="relative">
            <button
              onClick={() => setShowWallpaperMenu(!showWallpaperMenu)}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Chat wallpaper"
            >
              <Palette className="w-[18px] h-[18px]" strokeWidth={1.8} />
            </button>

            <AnimatePresence>
              {showWallpaperMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  className="absolute right-0 top-12 w-44 rounded-2xl glass p-1.5 shadow-2xl shadow-black/50 z-30 space-y-0.5"
                >
                  <span className="px-2.5 pt-1 pb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Wallpaper
                  </span>
                  {chatWallpapers.map((wp) => (
                    <button
                      key={wp.id}
                      onClick={() => {
                        setActiveWallpaper(wp.id);
                        setShowWallpaperMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        activeWallpaper === wp.id
                          ? 'bg-indigo-500/20 text-indigo-200 font-semibold'
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <span>{wp.name}</span>
                      {activeWallpaper === wp.id && <Check className="w-3.5 h-3.5 text-indigo-300" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {chat.isGroup && (
            <button
              onClick={onOpenGroupInfo}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Group info"
            >
              <Info className="w-[18px] h-[18px]" strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>

      {/* Message Area */}
      <div className={`flex-1 overflow-y-auto bg-slate-950 px-4 sm:px-8 py-4 space-y-2.5 ${currentWallpaperConfig.class}`}>
        {/* Date Divider */}
        <div className="flex justify-center my-3">
          <span className="px-3 py-1 rounded-full glass text-[11px] font-medium text-slate-400">
            Today
          </span>
        </div>

        {/* E2EE Notice */}
        <div className="flex justify-center mb-4">
          <div className="max-w-md px-4 py-1.5 rounded-2xl glass text-[11px] text-center text-slate-500">
            🔒 Messages and calls are end-to-end encrypted
          </div>
        </div>

        {/* Messages */}
        {chat.messages.map((msg) => {
          const isMe = !msg.isIncoming;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
            >
              {/* Group sender tag */}
              {chat.isGroup && msg.isIncoming && (
                <span className="text-[11px] font-semibold text-indigo-300 ml-3 mb-0.5">
                  {msg.senderName}
                </span>
              )}

              {/* Bubble */}
              <div
                className={`relative max-w-[85%] sm:max-w-md px-3.5 py-2.5 ${
                  isMe
                    ? 'accent-gradient on-accent rounded-3xl rounded-br-lg shadow-lg shadow-indigo-950/30'
                    : 'bg-slate-900/90 border border-white/[0.06] text-slate-100 rounded-3xl rounded-bl-lg shadow-md shadow-black/20 backdrop-blur-md'
                }`}
              >
                {/* Reply banner */}
                {msg.replyTo && (
                  <div
                    className={`mb-2 p-2 rounded-xl text-xs border-l-[3px] ${
                      isMe
                        ? 'bg-black/20 border-white/70 text-slate-100'
                        : 'bg-white/5 border-indigo-400 text-slate-300'
                    }`}
                  >
                    <span className="font-semibold block text-[11px] opacity-90">
                      {msg.replyTo.senderName}
                    </span>
                    <p className="truncate opacity-80">{msg.replyTo.text}</p>
                  </div>
                )}

                {/* Voice Note */}
                {msg.voiceNote && (
                  <div className="flex items-center gap-2.5 py-0.5 min-w-[210px]">
                    <button
                      onClick={() => toggleAudio(msg.id)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer ${
                        isMe ? 'bg-white/20 text-white' : 'bg-indigo-500/20 text-indigo-300'
                      }`}
                    >
                      {playingAudioId === msg.id ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center gap-[2.5px] h-6">
                        {msg.voiceNote.waveform.map((amp, i) => {
                          const isFilled = i < (msg.voiceNote!.waveform.length * audioProgress) / 100;
                          return (
                            <div
                              key={i}
                              style={{ height: `${Math.max(18, amp)}%` }}
                              className={`w-[3px] rounded-full transition-all ${
                                isFilled
                                  ? isMe
                                    ? 'bg-white'
                                    : 'bg-indigo-300'
                                  : isMe
                                  ? 'bg-white/35'
                                  : 'bg-slate-600'
                              }`}
                            />
                          );
                        })}
                      </div>
                      <div className={`text-[10px] mt-0.5 ${isMe ? 'text-white/70' : 'text-slate-500'}`}>
                        0:{String(msg.voiceNote.duration).padStart(2, '0')}
                      </div>
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {msg.attachments &&
                  msg.attachments.map((att) => {
                    if (att.type === 'image') {
                      return (
                        <div key={att.id} className="mb-1.5 -mx-1 rounded-2xl overflow-hidden cursor-pointer">
                          <img
                            src={att.url}
                            alt="Attachment"
                            onClick={() => setPreviewImage(att.url)}
                            className="max-h-64 w-full object-cover rounded-2xl hover:opacity-[0.97] transition-opacity"
                          />
                          <div className={`flex items-center justify-between text-[10px] mt-1 ${isMe ? 'text-white/70' : 'text-slate-500'}`}>
                            <span>{att.name}</span>
                            <span>{att.size}</span>
                          </div>
                        </div>
                      );
                    }
                    if (att.type === 'file') {
                      return (
                        <div
                          key={att.id}
                          className={`flex items-center gap-3 p-2.5 rounded-xl mb-1 ${
                            isMe ? 'bg-black/20' : 'bg-white/5 border border-white/5'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isMe ? 'bg-white/15 text-white' : 'bg-indigo-500/15 text-indigo-300'
                          }`}>
                            <FileText className="w-[18px] h-[18px]" />
                          </div>
                          <div className="min-w-0 flex-1 text-xs">
                            <h5 className="font-medium truncate">{att.name}</h5>
                            <span className={`text-[10px] ${isMe ? 'text-white/70' : 'text-slate-500'}`}>{att.size}</span>
                          </div>
                          <button className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isMe ? 'bg-white/15 hover:bg-white/25' : 'bg-white/10 hover:bg-white/20'
                          }`}>
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })}

                {/* Text */}
                {msg.text && (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                )}

                {/* Footer: time + ticks */}
                <div
                  className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                    isMe ? 'text-white/75' : 'text-slate-500'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {isMe && (
                    <span>
                      {msg.status === 'read' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-white inline" />
                      ) : msg.status === 'delivered' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-white/60 inline" />
                      ) : msg.status === 'sent' ? (
                        <Check className="w-3.5 h-3.5 text-white/60 inline" />
                      ) : (
                        <Clock className="w-3 h-3 text-white/50 inline" />
                      )}
                    </span>
                  )}
                </div>

                {/* Hover quick actions */}
                <div
                  className={`absolute top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 glass rounded-full px-1.5 py-1 shadow-lg z-10 ${
                    isMe ? '-left-[76px]' : '-right-[76px]'
                  }`}
                >
                  <button
                    onClick={() => setReplyingTo(msg)}
                    className="p-1.5 text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer"
                    title="Reply"
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (!msg.reactions) msg.reactions = [];
                      msg.reactions.push({ emoji: '❤️', count: 1, users: ['Me'] });
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="React"
                  >
                    <Heart className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Reactions pill */}
              {msg.reactions && msg.reactions.length > 0 && (
                <div className={`relative -mt-1.5 z-[1] ${isMe ? 'mr-2' : 'ml-2'}`}>
                  <div className="flex gap-1 px-1.5 py-0.5 rounded-full bg-slate-800 border border-white/10 text-[11px] shadow-md backdrop-blur-md w-fit">
                    {msg.reactions.map((r, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span>{r.emoji}</span>
                        <span className="text-slate-300 font-semibold text-[10px]">{r.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Typing Indicator */}
        {remoteTypingName && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 px-4 py-3 rounded-3xl rounded-bl-lg bg-slate-900/90 border border-white/[0.06] w-fit backdrop-blur-md shadow-md"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-bounce" />
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Context Bar */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 sm:px-8 bg-slate-950/90 border-t border-white/5 flex items-center justify-between text-xs overflow-hidden"
          >
            <div className="py-2 border-l-[3px] border-indigo-400 pl-3">
              <span className="font-semibold text-indigo-300 block">
                Replying to {replyingTo.senderName}
              </span>
              <p className="text-slate-500 truncate max-w-sm">{replyingTo.text}</p>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 text-slate-500 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Bar */}
      <div className="px-3 sm:px-4 pt-3 pb-safe bg-slate-950/85 border-t border-white/5 backdrop-blur-2xl shrink-0 relative z-20">
        <form
          onSubmit={handleSend}
          className="flex items-center gap-1.5 p-1.5 rounded-3xl bg-white/[0.05] border border-white/[0.06] focus-within:ring-2 focus-within:ring-indigo-500/40 transition-all"
        >
          {/* Attachments */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Attach"
            >
              <Paperclip className="w-5 h-5" strokeWidth={1.8} />
            </button>

            <AnimatePresence>
              {showAttachmentMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.97 }}
                  className="absolute bottom-14 left-0 w-56 rounded-2xl glass p-1.5 shadow-2xl z-30 space-y-0.5"
                >
                  {[
                    {
                      icon: <ImageIcon className="w-4 h-4 text-sky-300" />,
                      label: 'Photos & videos',
                      text: 'Sharing a photo…',
                    },
                    {
                      icon: <FileText className="w-4 h-4 text-indigo-300" />,
                      label: 'Document',
                      text: 'Sending deployment_log.txt (420 KB)…',
                    },
                    {
                      icon: <MonitorSmartphone className="w-4 h-4 text-emerald-300" />,
                      label: 'Remote session invite',
                      text: 'Connect with me on NexusTalk — ID: 849 203 118',
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        onSendMessage(chat.id, item.text, undefined);
                        setShowAttachmentMenu(false);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-white/5 flex items-center gap-2.5 cursor-pointer"
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Emoji */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiMenu(!showEmojiMenu)}
              className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Emoji"
            >
              <Smile className="w-5 h-5" strokeWidth={1.8} />
            </button>

            <AnimatePresence>
              {showEmojiMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.97 }}
                  className="absolute bottom-14 left-0 p-2 rounded-2xl glass shadow-2xl flex gap-1 z-30"
                >
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setInputText((prev) => prev + emoji);
                        setShowEmojiMenu(false);
                      }}
                      className="p-1.5 rounded-xl hover:bg-white/10 text-lg transition-transform hover:scale-125 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Text Field */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              onTyping?.(chat.id, e.target.value.trim().length > 0);
            }}
            placeholder="Type a message"
            className="flex-1 bg-transparent px-2 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />

          {/* Send / Voice */}
          {inputText.trim() ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="submit"
              className="w-10 h-10 rounded-full accent-gradient on-accent flex items-center justify-center shadow-lg shadow-indigo-600/30 hover:brightness-110 cursor-pointer"
              title="Send"
            >
              <Send className="w-[18px] h-[18px]" strokeWidth={2} />
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => {
                onSendMessage(chat.id, '🎤 [Voice note 0:12]', undefined);
              }}
              className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Record voice note"
            >
              <Mic className="w-[18px] h-[18px]" strokeWidth={1.8} />
            </motion.button>
          )}
        </form>
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {previewImage && (
          <div
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="relative max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl"
            >
              <img src={previewImage} alt="Enlarged" className="w-full h-auto object-contain" />
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
