import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

// Maintain a single global socket instance for the entire application
let globalSocket: Socket | null = null;

export function useSocket() {
  const token = useAuthStore(state => state.token);
  const [socket, setSocket] = useState<Socket | null>(globalSocket);

  useEffect(() => {
    // If we lose the token (e.g., user logs out), clean up the global socket
    if (!token) {
      if (globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
        setSocket(null);
      }
      return;
    }

    // If a token exists but no socket, create the singleton socket
    if (!globalSocket) {
      let socketURL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');
      
      if (!socketURL && import.meta.env.DEV) {
        socketURL = 'http://localhost:5000';
      }
      
      globalSocket = io(socketURL, {
        auth: { token },
        withCredentials: true,
        transports: ['websocket']
      });

      globalSocket.on('connect', () => {
        console.log('Socket connected globally');
      });

      globalSocket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
      });
    }

    setSocket(globalSocket);

    // We no longer disconnect when the component unmounts! 
    // This allows the socket to stay alive when navigating between pages/tabs.
  }, [token]);

  return socket;
}
