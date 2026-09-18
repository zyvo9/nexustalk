export type TabType = 'chats' | 'calls' | 'devices' | 'settings' | 'status';

export type UserStatus = 'online' | 'offline' | 'away' | 'busy';

export interface UserProfile {
  id: string;
  name: string;
  username?: string;
  email: string;
  phone?: string;
  avatar: string;
  statusText: string;
  online: boolean;
  lastSeen?: string;
}

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read';

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'file' | 'audio';
  url: string;
  name?: string;
  size?: string;
  duration?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  dateGroup: string; // "Today", "Yesterday", "Sep 15, 2026"
  status: MessageStatus;
  isIncoming: boolean;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  attachments?: Attachment[];
  voiceNote?: {
    duration: number; // in seconds
    waveform: number[]; // relative amplitudes 0-100
  };
  reactions?: MessageReaction[];
}

export interface Chat {
  id: string;
  name: string;
  avatar: string;
  isGroup: boolean;
  online?: boolean;
  lastSeen?: string;
  pinned?: boolean;
  unreadCount?: number;
  lastMessage: {
    text: string;
    timestamp: string;
    isIncoming: boolean;
    status: MessageStatus;
  };
  groupMembers?: {
    id: string;
    name: string;
    avatar: string;
    role: 'owner' | 'admin' | 'member';
    online: boolean;
  }[];
  description?: string;
  messages: Message[];
}

export interface CallRecord {
  id: string;
  contactName: string;
  contactAvatar: string;
  type: 'audio' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  timestamp: string;
  duration?: string;
}

export interface RemoteDevice {
  id: string;
  nineDigitId: string;
  name: string;
  type: 'desktop' | 'laptop' | 'phone' | 'server';
  os: 'macOS Sonoma' | 'Windows 11 Pro' | 'Android 15' | 'Ubuntu 24.04 LTS';
  status: 'online' | 'offline' | 'busy';
  lastActive: string;
  ipAddress: string;
  specs: {
    cpuUsage: number;
    ramUsage: number;
    batteryLevel?: number;
  };
  alias?: string;
}

export interface SessionHistory {
  id: string;
  deviceName: string;
  deviceId: string;
  date: string;
  duration: string;
  mode: 'full-control' | 'view-only';
  dataTransferred: string;
  rating?: number;
}

export interface StoryUpdate {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  timestamp: string;
  hasUnseen: boolean;
  stories: {
    id: string;
    imageUrl: string;
    caption: string;
    timestamp: string;
  }[];
}
