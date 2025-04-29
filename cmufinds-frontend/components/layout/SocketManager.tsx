'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';

/**
 * SocketManager Component
 * 
 * This client component manages the global Socket.IO connection lifecycle 
 * based on the user's authentication status.
 * It renders nothing to the DOM.
 */
export default function SocketManager() {
  const { isAuthenticated, user } = useAuthStore((state) => ({ 
    isAuthenticated: state.isAuthenticated, 
    user: state.user 
  }));
  const { connect, disconnect, socket } = useSocketStore((state) => ({
    connect: state.connect,
    disconnect: state.disconnect,
    socket: state.socket
  }));

  useEffect(() => {
    if (isAuthenticated && user?.userId) {
      // console.log("Auth state changed: User is authenticated, ensuring socket connection.");
      connect(); // Connect the socket if authenticated
    } else {
      // console.log("Auth state changed: User is not authenticated, disconnecting socket.");
      disconnect(); // Disconnect if not authenticated
    }

    // Optional: Cleanup on unmount, though disconnect handles this too
    // return () => {
    //   if (!isAuthenticated) {
    //     disconnect(); 
    //   }
    // };
  }, [isAuthenticated, user?.userId, connect, disconnect]); // Rerun when auth state changes

  // This component doesn't render anything
  return null;
} 