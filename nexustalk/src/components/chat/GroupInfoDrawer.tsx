import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, UserPlus, Bell, Lock, QrCode, Copy, Check, Shield, Trash2, LogOut } from 'lucide-react';
import { Chat } from '../../types';

interface GroupInfoDrawerProps {
  isOpen: boolean;
  chat: Chat | null;
  onClose: () => void;
}

export const GroupInfoDrawer: React.FC<GroupInfoDrawerProps> = ({ isOpen, chat, onClose }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  if (!isOpen || !chat) return null;

  const handleCopyLink = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="w-full max-w-md h-full bg-slate-900 border-l border-white/10 text-slate-100 flex flex-col shadow-2xl overflow-y-auto"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur-md z-10">
            <h3 className="font-bold text-sm text-white">Group Information</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Group Avatar & Name Section */}
          <div className="p-6 text-center border-b border-white/5 bg-slate-950/40">
            <img
              src={chat.avatar}
              alt={chat.name}
              className="w-24 h-24 rounded-3xl object-cover mx-auto ring-2 ring-indigo-500/40 shadow-xl mb-3"
            />
            <h2 className="text-lg font-bold text-white">{chat.name}</h2>
            <p className="text-xs text-slate-400 mt-1">
              Group • {chat.groupMembers?.length || 5} participants
            </p>
            {chat.description && (
              <p className="text-xs text-slate-300 mt-3 p-3 rounded-2xl bg-slate-800/60 border border-white/5 text-left leading-relaxed">
                {chat.description}
              </p>
            )}
          </div>

          {/* Actions & Settings */}
          <div className="p-4 border-b border-white/5 space-y-2">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/40 border border-white/5">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-medium">Mute Notifications</span>
              </div>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  isMuted ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    isMuted ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Invite Links */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopyLink}
                className="p-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-white/5 text-xs font-medium flex items-center justify-center gap-2 text-indigo-300 transition-colors"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
              </button>
              <button
                onClick={() => setShowQrModal(true)}
                className="p-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-white/5 text-xs font-medium flex items-center justify-center gap-2 text-cyan-300 transition-colors"
              >
                <QrCode className="w-4 h-4" />
                <span>Group QR</span>
              </button>
            </div>
          </div>

          {/* Member List */}
          <div className="p-4 flex-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Members ({chat.groupMembers?.length || 5})
              </span>
              <button className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            <div className="space-y-2">
              {chat.groupMembers?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-800/40 border border-white/5 hover:bg-slate-800/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-10 h-10 rounded-xl object-cover"
                      />
                      {member.online && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-white flex items-center gap-1.5">
                        <span>{member.name}</span>
                        {member.id === 'user_me' && (
                          <span className="text-[10px] text-slate-400 font-normal">(You)</span>
                        )}
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        {member.online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      member.role === 'owner'
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        : member.role === 'admin'
                        ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                        : 'bg-slate-700/30 text-slate-400 border-white/5'
                    }`}
                  >
                    {member.role.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Danger zone */}
          <div className="p-4 border-t border-white/5 space-y-2">
            <button className="w-full py-2.5 px-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center justify-center gap-2 transition-colors">
              <LogOut className="w-4 h-4" />
              Exit Group
            </button>
          </div>
        </motion.div>

        {/* QR Code Modal */}
        {showQrModal && (
          <div
            onClick={() => setShowQrModal(false)}
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-slate-900 border border-white/10 p-6 rounded-3xl text-center max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold text-white mb-1">Group Invite QR Code</h3>
              <p className="text-xs text-slate-400 mb-4">
                Scan with NexusTalk camera to join "{chat.name}"
              </p>
              <div className="p-4 bg-white rounded-2xl inline-block mb-4 shadow-xl">
                {/* Clean inline SVG QR code mock */}
                <svg className="w-48 h-48" viewBox="0 0 100 100" fill="currentColor">
                  <path d="M0 0h30v30H0zm5 5h20v20H5zm35-5h30v30H40zm5 5h20v20H45zM0 40h30v30H0zm5 5h20v20H5zm50 5h10v10H55zm15 15h10v10H70zm-15 15h10v10H55zm30-30h10v10H85zm0 30h10v10H85z" />
                  <rect x="10" y="10" width="10" height="10" />
                  <rect x="50" y="10" width="10" height="10" />
                  <rect x="10" y="50" width="10" height="10" />
                </svg>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
              >
                Close QR
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
