import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store';

let socketInstance = null;

export function useSocket() {
  const token = useAuthStore(s => s.token);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    if (socketInstance && socketInstance.connected) {
      socketRef.current = socketInstance;
      return;
    }

    const socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3001', {
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => console.log('[WS] Connected'));
    socket.on('disconnect', () => console.log('[WS] Disconnected'));

    socketInstance = socket;
    socketRef.current = socket;

    return () => {
      // No desconectamos al desmontar para mantener la conexión entre páginas
    };
  }, [token]);

  return socketRef.current;
}

export function getSocket() {
  return socketInstance;
}
