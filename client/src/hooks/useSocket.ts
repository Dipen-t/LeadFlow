import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore(state => state.token);

  useEffect(() => {
    if (!token) return;

    // Connect to the Socket.IO server running on the same domain or an API URL
    // Use regex to properly strip /api or /api/ from the end of the URL
    const socketURL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5000';
    
    socketRef.current = io(socketURL, {
      auth: { token },
      withCredentials: true,
      // Force websocket transport to avoid sticky session requirements / polling issues on Render
      transports: ['websocket']
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token]);

  return socketRef.current;
}
