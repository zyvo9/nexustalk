import { io, type Socket } from 'socket.io-client';
import { getToken, apiUrl } from './api';

let socket: Socket | null = null;

/** Shared Socket.IO connection (created once, authenticated with the JWT). */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(apiUrl('/'), {
      auth: { token: getToken() },
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function resetSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
