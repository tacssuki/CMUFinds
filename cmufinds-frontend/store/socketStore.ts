import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './authStore'; // Assuming authStore provides user info
import Cookies from 'js-cookie'; // Import js-cookie
import { toast } from "@/components/ui/use-toast"; // Import toast

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

// Helper to get the base URL for the socket connection
const getSocketUrl = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  // Remove trailing slashes and specific API paths if present
  return apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/?$/, ''); 
};

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: () => {
    // Prevent multiple connections
    if (get().socket?.connected) {
      console.log("Socket already connected.");
      return;
    }

    const token = Cookies.get('token'); // Get token from cookie
    const { user } = useAuthStore.getState(); 

    // Require both token and user info for connection
    if (!token || !user?.userId) {
      console.log("Socket connect: No token or user info available.");
      return; // Don't connect if not properly authenticated
    }

    console.log('Attempting to connect global socket...');
    const socketUrl = getSocketUrl();
    
    // Define connection options - add auth query param
    const options: Partial<any> = { 
      reconnectionAttempts: 5,
      transports: ['websocket'],
      // Add auth token to the handshake query
      query: { token } 
    };

    const newSocket = io(socketUrl, options);

    newSocket.on('connect', () => {
      console.log('Global socket connected:', newSocket.id);
      set({ socket: newSocket, isConnected: true });
      // Automatically join user-specific room on connect
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.userId) {
         console.log(`Global socket joining user room: ${currentUser.userId}`);
         newSocket.emit('join_user_room', currentUser.userId);
      }
    });

    newSocket.on('disconnect', (reason: string) => {
      console.log('Global socket disconnected:', reason);
      set({ socket: null, isConnected: false });
      // Optional: Handle specific disconnect reasons (e.g., server disconnect)
    });

    newSocket.on('connect_error', (error: Error) => {
      console.error('Global socket connection error:', error);
      
      // Check if the error message indicates an authentication problem
      // The backend sends "Authentication error: ..." messages
      const isAuthError = error.message.startsWith('Authentication error');
      
      if (isAuthError) {
         console.log("Socket Auth Error: Logging out user.");
         // Log out if it's an authentication issue
         useAuthStore.getState().logout();
         // Show a toast message
         toast({ 
            variant: "destructive",
            title: "Real-time Connection Failed",
            description: "Your session may be invalid. Please log in again.",
         });
      }
      
      // Disconnect to prevent reconnection loops on error
      newSocket.disconnect(); 
      set({ socket: null, isConnected: false });
    });

    // --- IMPORTANT: Add listeners for events needed by multiple components here? ---
    // Example: If multiple places need 'new_notification', handle it here
    // and update another store (e.g., notificationStore). 
    // newSocket.on('new_notification', (notification) => { ... });
    // For now, components will add their own specific listeners.

  },

  disconnect: () => {
    const socket = get().socket;
    if (socket) {
      console.log('Disconnecting global socket...');
      // Remove all listeners before disconnecting
      socket.removeAllListeners(); 
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },
}));

// Optional: Initialize connection based on auth state elsewhere
// (e.g., in a top-level layout component) 