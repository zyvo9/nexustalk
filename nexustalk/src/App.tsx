import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { TabType, Chat } from './types';
import { sampleCalls, sampleStories } from './data/mockData';
import { api, apiUrl, getToken, setToken, clearToken } from './lib/api';
import { getSocket, resetSocket } from './lib/realtime';

// Layout & Common Components
import { DesktopNavRail } from './components/layout/DesktopNavRail';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { LoginScreen } from './components/auth/LoginScreen';
import { OnboardingScreen } from './components/auth/OnboardingScreen';
import { ConsentDialog, ActiveControlledBanner } from './components/common/ConsentDialog';
import { NetworkDebugOverlay } from './components/common/NetworkDebugOverlay';
import { StatusStoriesModal } from './components/common/StatusStoriesModal';
import { EmptyState } from './components/common/EmptyState';

// Feature Components
import { ChatList } from './components/chat/ChatList';
import { ChatView } from './components/chat/ChatView';
import { GroupInfoDrawer } from './components/chat/GroupInfoDrawer';
import { NewChatModal } from './components/chat/NewChatModal';
import { CallsList } from './components/calls/CallsList';
import { CallOverlay } from './components/calls/CallOverlay';
import { getCallManager, type CallState, type CallType } from './lib/webrtc';
import { DevicesTab } from './components/devices/DevicesTab';
import { RealRemoteSession } from './components/devices/RealRemoteSession';
import { SettingsTab } from './components/settings/SettingsTab';
import { StatusTab } from './components/status/StatusTab';

// ---------- Real backend shapes ----------
interface RealUser {
  id: string; name: string; username: string; email: string; avatar: string | null; nexId: string;
  onboarded: boolean; hasGoogle: boolean;
}
interface RealChat {
  id: string; type: 'dm' | 'group'; title: string;
  other: { id: string; name: string; email: string; avatar: string | null; nexId: string; username: string } | null;
  lastMessage: { body: string; senderId: string; at: string } | null;
  unread: number;
}
interface RealMessage {
  id: string; body: string; at: string; senderId: string; senderName: string;
  attachments?: Array<{ id: string; name: string; mime: string; size: number }>;
}

/** SQLite "YYYY-MM-DD HH:MM:SS" (UTC) or ISO → local HH:MM */
function fmtTime(s: string): string {
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function App() {
  // Authentication (real token in localStorage)
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!getToken());
  // Google signup in progress (new user choosing their name)
  const [googleSignupToken, setGoogleSignupToken] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('googleSignup')
  );

  // Real account + chats
  const [me, setMe] = useState<RealUser | null>(null);
  const [realChats, setRealChats] = useState<RealChat[]>([]);
  const [realMessages, setRealMessages] = useState<Record<string, RealMessage[]>>({});
  const [loadingChats, setLoadingChats] = useState(false);

  // Core Navigation
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Typing indicator (real, from the other side of the chat)
  const [typingChat, setTypingChat] = useState<{ chatId: string; userName: string } | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);

  // Calls (REAL WebRTC P2P) & Remote Session State (simulated until its phase)
  const [callState, setCallState] = useState<CallState>({ phase: 'idle', type: 'audio', peer: null });
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [callToast, setCallToast] = useState<string | null>(null);
  const [remoteSession, setRemoteSession] = useState(false);

  // Host Consent Dialog & Remote Controlled Banner
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [controlledByHost, setControlledByHost] = useState<{
    controllerName: string;
    mode: 'full-control' | 'view-only';
  } | null>(null);

  // Modals & Drawers
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [activeStoryGroup, setActiveStoryGroup] = useState<any>(null);
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);

  // Mobile layout drilldown
  const [mobileShowChatView, setMobileShowChatView] = useState(false);

  // Demo state toggles (surfaced from Settings → Developer demo controls)
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [isLoadingSkeleton, setIsLoadingSkeleton] = useState(false);
  const [isEmptyState, setIsEmptyState] = useState(false);
  const [isConnectionLost, setIsConnectionLost] = useState(false);

  // Capture what Google OAuth redirects back with
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let changed = false;
    const urlToken = params.get('authToken');
    if (urlToken) {
      setToken(urlToken);
      setIsLoggedIn(true);
      params.delete('authToken');
      changed = true;
    }
    const signup = params.get('googleSignup');
    if (signup) {
      setGoogleSignupToken(signup);
      params.delete('googleSignup');
      changed = true;
    }
    if (changed) {
      const qs = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
    }
  }, []);

  const loadChats = useCallback(async () => {
    setLoadingChats(true);
    try {
      const res = await api<{ chats: RealChat[] }>('/api/chats');
      setRealChats(res.chats.map((c) => ({ ...c, unread: 0 })));
    } catch {
      // token invalid etc.
    } finally {
      setLoadingChats(false);
    }
  }, []);

  // Load the real account after login
  useEffect(() => {
    if (!isLoggedIn) return;
    api<{ user: RealUser }>('/api/me')
      .then((r) => setMe(r.user))
      .catch(() => {
        clearToken();
        setIsLoggedIn(false);
      });
    loadChats();
  }, [isLoggedIn, loadChats]);

  // Realtime: live incoming messages + typing
  useEffect(() => {
    if (!isLoggedIn || !me) return;
    const socket = getSocket();

    const onNew = ({ chatId, message }: { chatId: string; message: RealMessage }) => {
      setRealMessages((prev) => {
        const list = prev[chatId] ?? [];
        if (list.some((m) => m.id === message.id)) return prev;
        return { ...prev, [chatId]: [...list, message] };
      });
      if (message.senderId !== me.id) {
        setRealChats((prev) =>
          prev.map((c) =>
            c.id === chatId
              ? { ...c, lastMessage: { body: message.body, senderId: message.senderId, at: message.at } }
              : c
          )
        );
      }
      if (typingChat?.chatId === chatId) setTypingChat(null);
    };

    const onTyping = ({ chatId, user, isTyping }: { chatId: string; user: { id: string; name: string }; isTyping: boolean }) => {
      if (user.id === me.id) return;
      if (!isTyping) {
        setTypingChat((t) => (t?.chatId === chatId ? null : t));
        return;
      }
      setTypingChat({ chatId, userName: user.name });
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTypingChat(null), 3000);
    };

    socket.on('message:new', onNew);
    socket.on('typing', onTyping);
    return () => {
      socket.off('message:new', onNew);
      socket.off('typing', onTyping);
    };
  }, [isLoggedIn, me, typingChat?.chatId]);

  // Join the room + load history when a chat is opened
  useEffect(() => {
    if (!isLoggedIn || !selectedChatId) return;
    const socket = getSocket();
    socket.emit('chat:join', { chatId: selectedChatId });
    api<{ messages: RealMessage[] }>(`/api/chats/${selectedChatId}/messages`)
      .then((r) =>
        setRealMessages((prev) => ({
          ...prev,
          [selectedChatId]: r.messages,
        }))
      )
      .catch(() => undefined);
  }, [isLoggedIn, selectedChatId]);

  // ---- Real chat helpers ----
  const handleRealSend = useCallback(async (chatId: string, text: string, _replyTo?: unknown, attachments?: Array<{ id: string; name: string; mime: string; size: number }>) => {
    await api(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body: text, attachments }),
    });
    // The message comes back through the socket broadcast — no local append here.
  }, []);

  const handleTyping = useCallback((chatId: string, isTyping: boolean) => {
    const socket = getSocket();
    const now = Date.now();
    if (isTyping) {
      if (now - lastTypingSent.current < 1500) return;
      lastTypingSent.current = now;
      socket.emit('typing', { chatId, isTyping: true });
    } else {
      lastTypingSent.current = 0;
      socket.emit('typing', { chatId, isTyping: false });
    }
  }, []);

  // ---- REAL calls (WebRTC P2P) ----
  // CallManager binds its own socket listeners internally — nothing extra here.
  useEffect(() => {
    if (!isLoggedIn || !me) return;
    const cm = getCallManager();
    cm.onState = (s) => setCallState({ ...s });
    cm.onLocalStream = (s) => setLocalStream(s);
    cm.onRemoteStream = (s) => setRemoteStream(s);
  }, [isLoggedIn, me?.id]);

  const startCall = useCallback((type: CallType) => {
    const chat = realChats.find((c) => c.id === selectedChatId);
    if (!chat?.other) {
      setCallToast('Calls work with your real contacts — add someone with their username first');
      setTimeout(() => setCallToast(null), 2600);
      return;
    }
    setMuted(false);
    setCamOff(false);
    setSharing(false);
    getCallManager().start(
      { id: chat.other.id, name: chat.other.name, avatar: chat.other.avatar, username: chat.other.username },
      type
    );
  }, [realChats, selectedChatId]);

  const handleToggleShare = useCallback(() => {
    getCallManager()
      .toggleScreenShare()
      .then(setSharing)
      .catch((err) => {
        setCallToast(err.message ?? 'Screen share failed');
        setTimeout(() => setCallToast(null), 2600);
      });
  }, []);

  const handleCreateChat = async (chatId: string) => {
    setShowNewChatModal(false);
    await loadChats();
    setSelectedChatId(chatId);
    setActiveTab('chats');
    setMobileShowChatView(true);
  };

  const handleLogout = () => {
    clearToken();
    resetSocket();
    setMe(null);
    setRealChats([]);
    setRealMessages({});
    setSelectedChatId(null);
    setIsLoggedIn(false);
  };

  // New Google user finishing signup, or first-run profile setup
  if (googleSignupToken) {
    return (
      <OnboardingScreen
        googleSignupToken={googleSignupToken}
        onFinished={() => {
          setGoogleSignupToken(null);
          setIsLoggedIn(true);
        }}
      />
    );
  }

  if (!isLoggedIn) {
    return (
      <LoginScreen
        onLoginSuccess={(token) => {
          setToken(token);
          setIsLoggedIn(true);
        }}
      />
    );
  }

  // First-run profile setup (WhatsApp-style name + optional photo)
  if (me && !me.onboarded) {
    return (
      <OnboardingScreen
        me={me}
        onFinished={() => {
          api<{ user: RealUser }>('/api/me')
            .then((r) => setMe(r.user))
            .catch(() => undefined);
        }}
      />
    );
  }

  if (!me) {
    return <div className="h-screen w-screen bg-slate-950" />;
  }

  // Build the UI chat shape the presentational components expect
  const uiChats: Chat[] = realChats.map((c) => ({
    id: c.id,
    name: c.title,
    avatar: c.other?.avatar ?? '',
    isGroup: c.type === 'group',
    online: false,
    pinned: false,
    unreadCount: c.unread,
    lastMessage: {
      text: c.lastMessage?.body ?? '',
      timestamp: c.lastMessage ? fmtTime(c.lastMessage.at) : '',
      isIncoming: c.lastMessage ? c.lastMessage.senderId !== me?.id : false,
      status: 'read' as const,
    },
    messages: (realMessages[c.id] ?? []).map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.senderName,
      text: m.body,
      timestamp: fmtTime(m.at),
      dateGroup: 'Today',
      status: 'read' as const,
      isIncoming: m.senderId !== me?.id,
      attachments: (m.attachments ?? []).map((a) => ({
        id: a.id,
        type: (a.mime?.startsWith('image/') ? 'image' : a.mime?.startsWith('video/') ? 'video' : 'file') as 'image' | 'video' | 'file',
        url: apiUrl(`/api/files/${a.id}`),
        name: a.name,
        size: a.size ? `${Math.round(a.size / 1024)} KB` : undefined,
      })),
    })),
  }));

  const activeChat = uiChats.find((c) => c.id === selectedChatId) ?? null;
  const displayedChats = isEmptyState ? [] : uiChats;
  const displayedCalls = isEmptyState ? [] : sampleCalls;

  const remoteTypingName =
    typingChat && typingChat.chatId === selectedChatId ? typingChat.userName : null;

  return (
    <div className={`h-screen w-screen overflow-hidden flex flex-col bg-slate-950 text-slate-100 ${isDarkTheme ? 'dark' : 'light'}`}>
      {/* Ambient aurora backdrop */}
      <div className="relative flex-1 flex overflow-hidden">
        <div className="aurora-bg opacity-60" />

        {/* Persistent Connection Lost Banner */}
        <AnimatePresence>
          {isConnectionLost && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="absolute inset-x-0 top-0 z-40 bg-amber-500/95 text-amber-950 px-4 py-2 text-xs flex items-center justify-between font-semibold shadow-lg backdrop-blur-md shrink-0"
            >
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4" />
                <span>Connection lost — reconnecting… Local chats are available offline.</span>
              </div>
              <button
                onClick={() => setIsConnectionLost(false)}
                className="px-2.5 py-1 rounded-lg bg-black/15 hover:bg-black/25 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Retry now
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Persistent Red "Being Remotely Controlled" Banner */}
        <AnimatePresence>
          {controlledByHost && (
            <div className="absolute inset-x-0 top-0 z-40">
              <ActiveControlledBanner
                controllerName={controlledByHost.controllerName}
                mode={controlledByHost.mode}
                onDisconnect={() => setControlledByHost(null)}
              />
            </div>
          )}
        </AnimatePresence>

        {/* Main Application Frame */}
        <div className="flex-1 flex overflow-hidden relative">
          <DesktopNavRail
            activeTab={activeTab}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              setMobileShowChatView(false);
            }}
            unreadChatsCount={uiChats.reduce((acc, c) => acc + (c.unreadCount || 0), 0)}
            onlineDevicesCount={0}
            user={{
              id: me?.id ?? 'me',
              name: me?.name ?? 'You',
              email: me?.email ?? '',
              avatar: me?.avatar ?? '',
              statusText: '',
              online: true,
            }}
            isDarkTheme={isDarkTheme}
            onToggleTheme={() => setIsDarkTheme(!isDarkTheme)}
            onOpenDebug={() => setShowDebugOverlay(!showDebugOverlay)}
          />

          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Chats Tab (REAL) */}
            {activeTab === 'chats' && (
              <div className="flex-1 flex overflow-hidden">
                <div
                  className={`w-full md:w-80 lg:w-96 shrink-0 h-full ${
                    mobileShowChatView ? 'hidden md:flex md:flex-col' : 'flex flex-col'
                  }`}
                >
                  <ChatList
                    chats={displayedChats}
                    selectedChatId={selectedChatId}
                    onSelectChat={(chatId) => {
                      setSelectedChatId(chatId);
                      setMobileShowChatView(true);
                    }}
                    onOpenNewChatModal={() => setShowNewChatModal(true)}
                    isLoading={isLoadingSkeleton || loadingChats}
                  />
                </div>

                <div
                  className={`flex-1 h-full ${
                    !mobileShowChatView ? 'hidden md:flex md:flex-col' : 'flex flex-col'
                  }`}
                >
                  {activeChat ? (
                    <ChatView
                      chat={activeChat}
                      remoteTypingName={remoteTypingName}
                      onBackToMobileList={() => setMobileShowChatView(false)}
                      onStartVoiceCall={() => startCall('audio')}
                      onStartVideoCall={() => startCall('video')}
                      onStartRemoteSession={() => {
                        setCallToast('Remote control: Devices tab theke session start korun (V1 — own PC)');
                        setTimeout(() => setCallToast(null), 3200);
                      }}
                      onOpenGroupInfo={() => setShowGroupInfo(true)}
                      onSendMessage={handleRealSend}
                      onTyping={handleTyping}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center bg-slate-950/60">
                      <EmptyState
                        type="messages"
                        title={realChats.length === 0 ? 'No conversations yet' : 'Select a chat'}
                        description={
                          realChats.length === 0
                            ? 'Add a friend with their Nexus ID or email and start chatting.'
                            : 'Choose a conversation to start messaging.'
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Calls Tab Content (history is demo; real calls start from chats) */}
            {activeTab === 'calls' && (
              <div className="flex-1 h-full">
                <CallsList
                  calls={displayedCalls}
                  onStartVoiceCall={() => {
                    setCallToast('Start real calls from a chat — open a conversation and tap the phone icon');
                    setTimeout(() => setCallToast(null), 3000);
                  }}
                  onStartVideoCall={() => {
                    setCallToast('Start real calls from a chat — open a conversation and tap the camera icon');
                    setTimeout(() => setCallToast(null), 3000);
                  }}
                  isLoading={isLoadingSkeleton}
                />
              </div>
            )}

            {/* Devices Tab Content (REAL remote control) */}
            {activeTab === 'devices' && (
              <div className="flex-1 h-full">
                <DevicesTab onOpenSession={() => setRemoteSession(true)} />
              </div>
            )}

            {/* Status Tab Content (simulated) */}
            {activeTab === 'status' && (
              <div className="flex-1 h-full">
                <StatusTab
                  myUser={{
                    id: me?.id ?? 'me',
                    name: me?.name ?? 'You',
                    email: me?.email ?? '',
                    avatar: me?.avatar ?? '',
                    statusText: '',
                    online: true,
                  }}
                  stories={sampleStories}
                  onOpenStory={(storyGroup) => setActiveStoryGroup(storyGroup)}
                />
              </div>
            )}

            {/* Settings Tab Content */}
            {activeTab === 'settings' && (
              <div className="flex-1 h-full">
                <SettingsTab
                  user={{
                    id: me?.id ?? 'me',
                    name: me?.name ?? 'You',
                    username: me?.username ?? '',
                    email: me?.email ?? '',
                    avatar: me?.avatar ?? '',
                    statusText: '',
                    online: true,
                  }}
                  isDarkTheme={isDarkTheme}
                  onToggleTheme={() => setIsDarkTheme(!isDarkTheme)}
                  onOpenDebugOverlay={() => setShowDebugOverlay(true)}
                  onLogout={handleLogout}
                  isLoadingSkeleton={isLoadingSkeleton}
                  onToggleSkeleton={() => setIsLoadingSkeleton(!isLoadingSkeleton)}
                  isEmptyState={isEmptyState}
                  onToggleEmptyState={() => setIsEmptyState(!isEmptyState)}
                  isConnectionLost={isConnectionLost}
                  onToggleConnectionLost={() => setIsConnectionLost(!isConnectionLost)}
                  onTriggerConsentDialog={() => setShowConsentDialog(true)}
                />
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Mobile Bottom Navigation Bar */}
      {!remoteSession && callState.phase === 'idle' && (
        <MobileBottomNav
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setMobileShowChatView(false);
          }}
          unreadChatsCount={uiChats.reduce((acc, c) => acc + (c.unreadCount || 0), 0)}
        />
      )}

      {/* REAL WebRTC call overlay */}
      {callState.phase !== 'idle' && (
        <CallOverlay
          state={callState}
          localStream={localStream}
          remoteStream={remoteStream}
          muted={muted}
          camOff={camOff}
          sharing={sharing}
          shareSupported={typeof navigator.mediaDevices?.getDisplayMedia === 'function'}
          onAccept={() => getCallManager().accept()}
          onReject={() => getCallManager().reject()}
          onHangUp={() => getCallManager().hangUp()}
          onToggleMute={() => setMuted(getCallManager().toggleMute())}
          onToggleSpeaker={() => {
            setSpeakerMuted((prev) => {
              getCallManager().setSpeakerMuted(!prev);
              return !prev;
            });
          }}
          onToggleCamera={() => setCamOff(getCallManager().toggleCamera())}
          onToggleShare={() => {
            getCallManager()
              .toggleScreenShare()
              .then(setSharing)
              .catch((err) => {
                setCallToast(err.message ?? 'Screen share failed');
                setTimeout(() => setCallToast(null), 2600);
              });
          }}
          onShareError={(message) => {
            setCallToast(message);
            setTimeout(() => setCallToast(null), 3000);
          }}
          onGrantControl={(peerIds) => {
            (async () => {
              if (!sharing) {
                await getCallManager()
                  .toggleScreenShare()
                  .then((s) => setSharing(s))
                  .catch((err) => {
                    setCallToast(err.message ?? 'Screen share failed');
                    setTimeout(() => setCallToast(null), 3000);
                    return;
                  });
              }
              await getCallManager().grantControl(peerIds);
              setCallToast('Remote control ON — apnar PC control korche');
              setTimeout(() => setCallToast(null), 3000);
            })();
          }}
          onDisableControl={() => {
            getCallManager().disableControl();
            setCallToast('Remote control off');
            setTimeout(() => setCallToast(null), 2000);
          }}
          onControlInput={(obj) => getCallManager().sendControlInput(obj)}
        />
      )}

      {/* Transient call notices */}
      {callToast && (
        <div className="fixed top-4 inset-x-0 z-[60] flex justify-center pointer-events-none px-4">
          <div className="glass px-4 py-2.5 rounded-2xl text-xs font-semibold text-white shadow-xl">
            {callToast}
          </div>
        </div>
      )}

      {/* REAL remote desktop session (controller side) */}
      {remoteSession && (
        <RealRemoteSession onEnd={() => setRemoteSession(null)} />
      )}

      <ConsentDialog
        isOpen={showConsentDialog}
        requesterName="Sadman Sakib"
        requesterDevice="MacBook Pro 16&quot; M3"
        onAccept={(mode) => {
          setShowConsentDialog(false);
          setControlledByHost({ controllerName: 'Sadman Sakib', mode });
        }}
        onDeny={() => setShowConsentDialog(false)}
      />

      <GroupInfoDrawer
        isOpen={showGroupInfo}
        chat={activeChat}
        onClose={() => setShowGroupInfo(false)}
      />

      {/* New Conversation Modal (REAL — search by Nexus ID / email / name) */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onChatCreated={handleCreateChat}
      />

      <StatusStoriesModal
        isOpen={!!activeStoryGroup}
        storyGroup={activeStoryGroup}
        onClose={() => setActiveStoryGroup(null)}
      />

      <NetworkDebugOverlay isOpen={showDebugOverlay} onClose={() => setShowDebugOverlay(false)} />
    </div>
  );
}
