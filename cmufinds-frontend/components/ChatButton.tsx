"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { chatAPI } from "@/lib/api";
import ChatDrawer from "./chat/ChatDrawer";
import { useGlobalChatDrawer } from "@/store/globalChatDrawerStore";
import { useSocketStore } from "@/store/socketStore";
import { Thread } from '@/types/chat';

export default function ChatButton() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, user } = useAuthStore();
  const pathname = usePathname();
  const { socket, isConnected } = useSocketStore();
  
  // Use the global chat drawer store
  const { isOpen, activePostId, openChatDrawer, closeChatDrawer } = useGlobalChatDrawer();
  
  // Don't show on login, register or chat pages
  const shouldHide = 
    !isAuthenticated || 
    pathname.includes('/login') || 
    pathname.includes('/register') || 
    pathname.includes('/chat/');

  // Initial fetch and polling (simplified)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchAndSetThreads = async () => {
      console.log('[ChatButton] Fetching threads...');
      try {
        const response = await chatAPI.getThreads();
        if (response?.data?.data) {
          const fetchedThreads: Thread[] = response.data.data;
          // Sort threads by latest message initially
          const sortedThreads = fetchedThreads.sort((a, b) => {
             const dateA = new Date(a.messages[0]?.createdAt || 0).getTime();
             const dateB = new Date(b.messages[0]?.createdAt || 0).getTime();
             return dateB - dateA;
          });
          setThreads(sortedThreads);
          setUnreadCount(sortedThreads.length); // Update unread count based on fetched threads
        }
      } catch (error) {
        console.error("Error fetching threads:", error);
      }
    };

    fetchAndSetThreads(); // Initial fetch
    const interval = setInterval(fetchAndSetThreads, 60000); // Polling interval
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Handle socket events for real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log('[ChatButton] Setting up socket listeners...');

    const handleNewThread = (newThread: Thread) => {
      console.log('[ChatButton] Received new_thread:', newThread);
      setThreads(prevThreads => {
        // Avoid adding duplicates if already present (e.g., from initial fetch)
        if (prevThreads.some(t => t.id === newThread.id)) {
          return prevThreads;
        }
        // Add new thread to the beginning
        return [newThread, ...prevThreads];
      });
      // Increment unread count (or refetch count based on your logic)
      setUnreadCount(prev => prev + 1);
    };

    const handleNewMessage = (newMessage: any) => { // Use specific Message type if available
      console.log('[ChatButton] Received new_message:', newMessage);
      setThreads(prevThreads => {
        const threadIndex = prevThreads.findIndex(t => t.id === newMessage.threadId);
        if (threadIndex === -1) {
          // Thread not found, maybe refetch?
          console.warn('Received message for unknown thread:', newMessage.threadId);
          // Potentially trigger a refetch here: fetchThreads();
          return prevThreads;
        }

        // Update the last message preview (optional, depends on UI)
        // const updatedThread = { ...prevThreads[threadIndex], messages: [newMessage, ...prevThreads[threadIndex].messages.slice(0,0)] }; // Or just update timestamp
        const updatedThread = { 
           ...prevThreads[threadIndex], 
           // Update a hypothetical lastMessageTimestamp or similar if needed for sorting
           // Or update the first message in the nested array if that's used for sorting
           messages: [newMessage, ...(prevThreads[threadIndex].messages || [])] // Update message array if needed
        };

        // Move the updated thread to the top
        const newThreads = [
          updatedThread,
          ...prevThreads.slice(0, threadIndex),
          ...prevThreads.slice(threadIndex + 1)
        ];
        return newThreads;
      });
      // Potentially update unread count logic here if needed
    };

    socket.on('new_thread', handleNewThread);
    socket.on('new_message', handleNewMessage);

    return () => {
      console.log('[ChatButton] Cleaning up socket listeners...');
      socket.off('new_thread', handleNewThread);
      socket.off('new_message', handleNewMessage);
    };

  }, [socket, isConnected]); // Rerun when socket connection changes

  // fetchThreads function remains the same, called when drawer opens
  const fetchThreads = async () => {
     if (!isAuthenticated || loading) return;
     console.log('[ChatButton] fetchThreads called (drawer opened?)');
     setLoading(true);
     try {
       const response = await chatAPI.getThreads();
       if (response?.data?.data) {
         const fetchedThreads: Thread[] = response.data.data;
         // Sort threads by latest message
         const sortedThreads = fetchedThreads.sort((a, b) => {
            const dateA = new Date(a.messages[0]?.createdAt || 0).getTime();
            const dateB = new Date(b.messages[0]?.createdAt || 0).getTime();
            return dateB - dateA;
         });
         setThreads(sortedThreads);
         setUnreadCount(sortedThreads.length);
       }
     } catch (error) {
       console.error("Error fetching chat threads:", error);
     } finally {
       setLoading(false);
     }
   };
  
  // Re-fetch threads when drawer is opened
  useEffect(() => {
     if (isOpen && isAuthenticated) {
        fetchThreads();
     }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isAuthenticated]); // Add isAuthenticated dependency

  const toggleChat = () => {
    if (isOpen) {
      closeChatDrawer();
    } else {
      openChatDrawer();
    }
  };

  if (shouldHide) {
    return null;
  }

  return (
    <>
      {/* Floating chat button - moved to bottom right corner */}
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary/90 transition-all z-50 flex items-center justify-center"
        aria-label="Chat"
      >
        {isOpen ? (
          <X size={24} />
        ) : (
          <div className="relative">
            <MessageCircle size={24} />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-secondary text-primary text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Chat drawer - adjusted for right side positioning */}
      <ChatDrawer 
        isOpen={isOpen} 
        onClose={closeChatDrawer}
        threads={threads}
        loading={loading}
        activePostId={activePostId}
      />
    </>
  );
} 