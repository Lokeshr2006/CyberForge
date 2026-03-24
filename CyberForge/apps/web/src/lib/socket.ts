import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

let socket: Socket | null = null;

export function initSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function closeSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function subscribeToAlerts(callback: (alert: any) => void) {
  const socket = initSocket();
  socket.on('alert-triggered', callback);

  return () => {
    socket.off('alert-triggered', callback);
  };
}

export function subscribeToUpdates(callback: (data: any) => void) {
  const socket = initSocket();
  socket.on('data-updated', callback);

  return () => {
    socket.off('data-updated', callback);
  };
}
