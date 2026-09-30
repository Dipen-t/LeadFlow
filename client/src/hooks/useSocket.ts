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
    // We check VITE_API_BASE_URL to match axios config, and fallback to VITE_API_URL.
    let socketURL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
    
    // If no URL is provided and we are in development mode, default to localhost:5000
    if (!socketURL && import.meta.env.DEV) {
      socketURL = 'http://localhost:5000';
    }
    // If socketURL is still empty (in production), socket.io will default to window.location (the current domain).

    
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
