import React, { useRef, useState, useEffect, FC, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, ArrowLeft, MessageSquare, X, Image as ImageIcon, DownloadIcon, ChevronDown, Flag } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/authStore';
import { chatAPI } from '@/lib/api';
import ImageViewModal from '../ImageViewModal';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSocketStore } from "@/store/socketStore";
import { Socket } from "socket.io-client";
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Upload, Maximize, Paperclip } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast, type Toast } from '@/components/ui/use-toast';
import { Message, Thread } from '@/types/chat';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import ReportDialog from '@/components/ReportDialog';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  threads: Thread[];
  loading: boolean;
  activePostId?: string;
}

// Thread item component for the list
const ThreadItem = ({ thread, onClick, isActive }: { 
  thread: Thread; 
  onClick: () => void; 
  isActive: boolean;
}) => {
  const { user } = useAuthStore();
  
  // Helper function to get the other participant's name
  const getOtherParticipant = () => {
    if (!user?.userId || !thread.participants) return "Unknown User";
    const otherParticipant = thread.participants.find(p => p.user.id !== user.userId)?.user;
    return otherParticipant?.name || otherParticipant?.username || "Unknown User";
  };

  return (
    <div
      className={cn(
        "flex items-center p-3 border rounded-md hover:bg-muted/30 cursor-pointer transition-colors space-x-3",
        isActive && "bg-primary/10 border-primary dark:bg-secondary/10 dark:border-secondary"
      )}
      onClick={onClick}
    >
      {/* Post Thumbnail */}
      {thread.post.imageUrl ? (
        <img
          src={thread.post.imageUrl}
          alt={thread.post.title}
          className="h-12 w-12 rounded object-cover flex-shrink-0"
          onError={(e) => (e.currentTarget.src = '/placeholders/no-image.png')}
        />
      ) : (
        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      {/* Thread Info */}
      <div className="flex-1 overflow-hidden">
        <p 
          className="font-medium text-foreground truncate"
          title={getOtherParticipant()}
        >
          {getOtherParticipant()}
        </p>
        <p 
          className="text-xs text-muted-foreground truncate"
          title={thread.post.title}
        >
          Regarding: {thread.post.title}
        </p>
      <div className="flex justify-between items-center mt-1">
          <p className="text-xs text-muted-foreground truncate flex-1 mr-2">
            {thread.messages && thread.messages.length > 0 && thread.messages[0]?.text
            ? thread.messages[0].text
            : "Start a conversation"}
        </p>
          <span className={cn(
              "px-1.5 py-0.5 text-xs rounded font-medium flex-shrink-0",
              thread.post.type === 'LOST' 
                ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-300 dark:text-red-900 dark:border-red-400"
                : "bg-green-50 text-green-700 border border-green-200 dark:bg-green-300 dark:text-green-900 dark:border-green-400"
          )}>
            {thread.post.type}
          </span>
        </div>
      </div>
    </div>
  );
};

// Thread header component
const ThreadHeader = ({ 
  thread, 
  onExport, 
  onReportUser
}: { 
  thread: Thread | undefined; 
  onExport: (threadId: string) => void;
  onReportUser: (userId: string) => void;
}) => {
  const { user } = useAuthStore();
  
  if (!thread) return <div className="h-10">Loading...</div>;

  // Find the other participant and their ID
  const otherParticipant = thread.participants.find(p => p.user.id !== user?.userId)?.user;
  const otherParticipantId = otherParticipant?.id;
  const otherParticipantName = otherParticipant?.name || otherParticipant?.username || "Unknown User";
  
  const navigateToPost = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `/posts/${thread.post.id}`;
  };

  const handleExportClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (thread) {
      onExport(thread.id);
    }
  };

  const handleReportClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (otherParticipantId) {
      onReportUser(otherParticipantId);
    }
  };

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex flex-col flex-1 overflow-hidden mr-2">
        <h4 
          className="text-base font-semibold text-foreground truncate"
          title={otherParticipantName}
        >
          {otherParticipantName}
        </h4>
        <p
          className="text-xs text-muted-foreground hover:underline cursor-pointer truncate"
          onClick={navigateToPost}
          title={thread.post.title}
        >
          Regarding: {thread.post.title}
        </p>
      </div>
      {/* Action Buttons */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportClick} 
              aria-label="Export chat history"
            >
              <DownloadIcon className="h-4 w-4" />
            </Button>
           </TooltipTrigger>
          <TooltipContent>
            <p>Export Chat</p>
          </TooltipContent>
        </Tooltip>
        
        {/* Report User Button - only show if other participant ID exists */}
        {otherParticipantId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleReportClick} 
                aria-label="Report this user"
                className="text-destructive hover:bg-destructive/10 border-destructive/50 hover:text-destructive"
              >
                <Flag className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Report User</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

const ChatDrawer: FC<ChatDrawerProps> = ({ isOpen, onClose, threads = [], loading: threadsLoading, activePostId }) => {
  const { user } = useAuthStore();
  const { socket, isConnected } = useSocketStore((state) => ({ 
     socket: state.socket,
     isConnected: state.isConnected
  }));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);
  const optimisticMessageId = useRef<string | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportingUserId, setReportingUserId] = useState<string | null>(null);

  // Helper function to get the other participant's name
  const getOtherParticipant = (thread: Thread) => {
    if (!user?.userId || !thread.participants) return "Unknown User";
    const otherParticipant = thread.participants.find(p => p.user.id !== user.userId);
    return otherParticipant?.user.name || otherParticipant?.user.username || "Unknown User";
  };
  
  // Initialize thread when activePostId is provided
  useEffect(() => {
    if (activePostId && isOpen && threads.length > 0 && !activeThread && !initializing) {
      const threadForPost = threads.find(t => t.post.id === activePostId);
      if (threadForPost) {
        console.log("Opening drawer to existing thread:", threadForPost.id);
        setActiveThread(threadForPost.id);
        fetchMessages(threadForPost.id, toast);
      } else {
        console.log("Opening drawer, creating thread for post:", activePostId);
        createThreadForPost(activePostId);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePostId, isOpen, threads, user?.userId]);

  // Initialize the thread with the post
  const createThreadForPost = async (postId: string) => {
    if (!postId || !user?.userId) return;
    console.log("Attempting to create/get thread for post:", postId);
    setInitializing(true);
    try {
      const response = await chatAPI.getOrCreateThread(postId);
      if (response?.data?.data?.id) {
        const threadId = response.data.data.id;
        console.log("Created/Got thread:", threadId);
        setActiveThread(threadId);
        fetchMessages(threadId, toast);
        // TODO: Update the main threads list in the parent component or refetch
      } else {
         throw new Error(response?.data?.message || "Failed to get thread ID");
      }
    } catch (error: any) {
      console.error("Error creating thread:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create conversation",
        variant: "destructive",
      });
      setActiveThread(null); 
    } finally {
      setInitializing(false);
    }
  };

  const handleThreadClick = (threadId: string) => {
    if (threadId === activeThread) return; 
    setActiveThread(threadId);
    setMessages([]); 
    fetchMessages(threadId, toast);
  };

  const handleBack = () => {
    setActiveThread(null);
    setMessages([]);
  };

  const navigateToPost = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `/posts/${postId}`;
  };

  const fetchMessages = async (threadId: string, showToast: (props: Omit<Toast, "id">) => void) => {
    console.log("Fetching messages for thread:", threadId);
    setLoadingMessages(true);
    try {
      const response = await chatAPI.getMessages(threadId);
      if (response?.data?.data) {
        setMessages(response.data.data);
        setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: "auto" }); }, 100);
      } else {
         setMessages([]); 
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      showToast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
      setMessages([]); 
    } finally {
      setLoadingMessages(false);
    }
  };

  // Add a method to view image in modal
  const handleViewImage = (imageUrl: string) => {
    setViewImageUrl(imageUrl);
  };

  // Add method to handle image selection
  const handleImageSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
      setImageFile(file);
    }
  };

  // Clear image preview
  const clearImagePreview = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Update handleSendMessage to handle image upload
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeThread || (!newMessage.trim() && !imageFile) || sending) return;

    setSending(true);
    const tempMessageId = `temp-${Date.now()}`;
    let optimisticMessage: Message | null = null;

    // Create and add optimistic message locally
    if (newMessage.trim() || imagePreview) {
      optimisticMessage = {
        id: tempMessageId,
        threadId: activeThread,
        text: newMessage,
        imageUrl: imagePreview || undefined, 
        createdAt: new Date().toISOString(),
        isSystemMessage: false,
        senderId: user!.userId, 
        sender: {
          id: 'temp-participant', // Note: This participant ID is temporary/fictional
          userId: user!.userId,
          user: {
            id: user!.userId,
            name: user?.name || 'You',
            username: user?.username,
            profilePictureUrl: user?.profilePictureUrl
          }
        }
      };
      optimisticMessageId.current = tempMessageId;
      // Add optimistic message only if ID doesn't exist (shouldn't, but safe check)
      setMessages(prev => prev.some(msg => msg.id === tempMessageId) ? prev : [...prev, optimisticMessage!]);
      setNewMessage('');
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, 100);
    } else {
       optimisticMessageId.current = null;
    }

    try {
      let uploadedImageUrl: string | null = null;
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        try {
          const uploadResponse = await chatAPI.uploadImage(formData);
          uploadedImageUrl = uploadResponse?.data?.url;
        } catch (uploadError) {
          console.error("Error uploading image:", uploadError);
          toast({
            title: "Image upload failed",
            description: "Message sent without image.",
            variant: "destructive",
          });
          // Update optimistic message if image upload failed
             setMessages(prev => prev.map(msg =>
               msg.id === tempMessageId ? { ...msg, imageUrl: undefined } : msg
             ));
        }
      }

      const messagePayload = {
        text: optimisticMessage?.text || '',
        imageUrl: uploadedImageUrl ?? undefined
      };

      // Only send if there is text or a successfully uploaded image
      if (messagePayload.text.trim() || messagePayload.imageUrl) {
         const response = await chatAPI.sendMessage(activeThread, messagePayload);
      if (response?.data?.data) {
           const actualMessage = response.data.data;
           // Replace optimistic message with actual message
           // No longer needed here, handled by socket listener OR fallback in finally
           // setMessages(prev => prev.map(msg => msg.id === tempMessageId ? actualMessage : msg));
         } else {
           // If sending failed, remove the optimistic message
           console.error("Send message API call failed, removing optimistic message.")
           setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
           throw new Error("Failed to send message");
         }
      } else if (optimisticMessage && !messagePayload.imageUrl) {
         // If there was only an image and it failed to upload, remove optimistic msg
         console.log("Image upload failed and no text, removing optimistic message.")
         setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
      }

    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      // Ensure optimistic message is removed on error if it exists
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
    } finally {
      setSending(false);
      // Fallback: If the socket listener didn't handle the replacement (e.g., socket disconnected briefly),
      // ensure the optimistic ID is cleared so we don't accidentally replace a future message.
      // Check if the optimistic message still exists before clearing the ID.
       setMessages(prev => {
         if (prev.some(msg => msg.id === optimisticMessageId.current)) {
             // If the optimistic message is still here, something went wrong (API/socket)
             // Remove it as a fallback cleanup
             console.warn(`Optimistic message ${optimisticMessageId.current} still present in finally block. Removing.`);
            return prev.filter(msg => msg.id !== optimisticMessageId.current);
         }
         return prev;
       })
    }
  };

  // --- Effect to Listen for New Messages ---
  useEffect(() => {
    if (socket && isConnected) {
       console.log('>>> CHATDRAWER EFFECT [Msg Listener]: Socket connected, ADDING message listener...');

       const messageListener = (newMessage: Message) => {
         console.log('>>> CHATDRAWER LISTENER [Msg Listener]: Received new_message event via shared socket:', newMessage);

         // Get the current active thread ID directly from state
         const currentThreadId = activeThread;

         // Only process if the message belongs to the currently active thread
             if (currentThreadId && newMessage.threadId === currentThreadId) {
            console.log(`ChatDrawer: Message ${newMessage.id} matches active thread ${currentThreadId}. Processing.`);

                 setMessages(prevMessages => {
                // --- Optimistic Update Handling ---
                // Check if it's our own message AND we currently have an optimistic ID tracked in the ref
                if (newMessage.senderId === user?.userId && optimisticMessageId.current) {
                  console.log(`ChatDrawer: Incoming message ${newMessage.id} is from current user. Checking against optimistic message ${optimisticMessageId.current}.`);
                  const index = prevMessages.findIndex(msg => msg.id === optimisticMessageId.current);

                  if (index !== -1) {
                    console.log(`ChatDrawer: Replacing optimistic message ${optimisticMessageId.current} with actual message ${newMessage.id}.`);
                    const updatedMessages = [...prevMessages];
                    updatedMessages[index] = newMessage; // Replace with the actual message
                    // Clear the optimistic ID *after* replacement is confirmed within this update cycle
                    optimisticMessageId.current = null;
                    return updatedMessages;
                  } else {
                    console.warn(`ChatDrawer: Optimistic message ${optimisticMessageId.current} not found for replacement by ${newMessage.id}. Will proceed to duplicate check.`);
                  }
                }

                // --- Standard Duplicate/Add Logic ---
                // Check if the message ID already exists (avoids duplicates if optimistic failed or it's from another user)
                    if (prevMessages.some(msg => msg.id === newMessage.id)) {
                  console.log(`ChatDrawer: Duplicate message ID ${newMessage.id} received (or already handled optimistically), ignoring.`);
                  return prevMessages; // Return unchanged state
                } else {
                  console.log(`ChatDrawer: Adding new message ${newMessage.id} (not a duplicate or optimistic replacement).`);
                  return [...prevMessages, newMessage]; // Add the new message
                }
                 });

            // Scroll after messages state is potentially updated
                 setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                 }, 100);

             } else {
               console.log(`ChatDrawer: Message ${newMessage.id} for thread ${newMessage.threadId} ignored (active: ${currentThreadId})`);
             }
       };

       socket.on('new_message', messageListener);
       console.log('>>> CHATDRAWER EFFECT [Msg Listener]: Added listener for new_message');

       return () => {
         console.log('>>> CHATDRAWER EFFECT CLEANUP [Msg Listener]: Removing message listener.');
         socket.off('new_message', messageListener);
       };
    } else {
       console.log('>>> CHATDRAWER EFFECT [Msg Listener]: Socket NOT connected, cannot add message listener.');
    }
  }, [socket, isConnected, user?.userId, activeThread]);

  // --- Effect to Join/Leave Thread Room ---
  useEffect(() => {
    // Only emit if socket is connected
    if (socket && isConnected) {
       if (activeThread) {
          console.log(`>>> CHATDRAWER EFFECT [Room]: Socket joining thread room: ${activeThread}`);
          socket.emit('join_thread', activeThread);
          console.log(`>>> CHATDRAWER EFFECT [Room]: Sent join_thread event for ${activeThread}`);

          // Cleanup: leave the room when activeThread changes or component unmounts
          return () => {
             console.log(`>>> CHATDRAWER EFFECT CLEANUP [Room]: Socket leaving thread room: ${activeThread}`);
             socket.emit('leave_thread', activeThread);
             console.log(`>>> CHATDRAWER EFFECT CLEANUP [Room]: Sent leave_thread event for ${activeThread}`);
          };
       } else {
         console.log(">>> CHATDRAWER EFFECT [Room]: No active thread, not joining.");
       }
    } else {
       console.log('>>> CHATDRAWER EFFECT [Room]: Socket NOT connected, cannot join/leave thread room.');
    }
    // Ensure leave is emitted if activeThread was set before cleanup runs
    // Note: This fallback might emit leave even if join wasn't successful if socket disconnects rapidly after activeThread is set.
    // Consider adding a flag if more robust handling is needed.
    return () => {
      if (socket && isConnected && activeThread) {
         console.log(`>>> CHATDRAWER EFFECT CLEANUP [Room]: Socket leaving thread room (fallback): ${activeThread}`);
         socket.emit('leave_thread', activeThread);
      }
    };
  }, [activeThread, socket, isConnected]);

  // --- Add PDF Export Handler ---
  const handleExportChat = async (threadId: string) => {
    if (!threadId || exporting) return;
    setExporting(true);
    console.log("Attempting to export thread:", threadId);
    try {
      const exportResponse = await chatAPI.exportChat(threadId);
      
      // Handle the blob response for download
      const blob = new Blob([exportResponse.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const currentThread = threads.find(t => t.id === threadId);
      const postTitle = currentThread?.post.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'chat';
      const otherParticipantName = currentThread ? getOtherParticipant(currentThread).replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'user';
      
      link.setAttribute('download', `cmufinds_chat_${postTitle}_with_${otherParticipantName}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // Optionally, show success toast if desired, or remove for silent success
      // toast({
      //   title: "Success",
      //   description: "Chat history export started.",
      // });

    } catch (error: any) {
      // Check for specific Axios network errors that might occur even if download succeeds
      if (error?.code === 'ERR_NETWORK') {
        // Log a less alarming warning specifically for Network Errors during export,
        // as this often happens due to client-side blocking (ERR_BLOCKED_BY_CLIENT)
        // even when the download works via headers.
        console.warn(
          `Chat export request resulted in Network Error (code: ${error.code}). ` +
          'This might be due to client-side blocking (e.g., ad blocker), ' +
          'but the download may succeed anyway.',
           error.message // Log just the message
        );
      } else {
        // Log any other errors as genuine problems
        console.error("Unexpected error during chat export request:", error);
      }
    } finally {
      setExporting(false);
    }
  };

  // --- Group threads by post ID --- 
  const groupedThreads = threads.reduce((acc, thread) => {
    const postId = thread.post.id;
    if (!acc[postId]) {
      acc[postId] = [];
    }
    acc[postId].push(thread);
    // Sort threads within the group by latest message (optional, but good UX)
    acc[postId].sort((a, b) => new Date(b.messages[0]?.createdAt || 0).getTime() - new Date(a.messages[0]?.createdAt || 0).getTime());
    return acc;
  }, {} as Record<string, Thread[]>);

  // Sort the groups themselves by the latest message across all threads in the group
  const sortedGroupKeys = Object.keys(groupedThreads).sort((postA_ID, postB_ID) => {
    const latestTimeA = Math.max(...groupedThreads[postA_ID].map(t => new Date(t.messages[0]?.createdAt || 0).getTime()));
    const latestTimeB = Math.max(...groupedThreads[postB_ID].map(t => new Date(t.messages[0]?.createdAt || 0).getTime()));
    return latestTimeB - latestTimeA;
  });
  // --- End grouping --- 

  // Define drawerClasses ONCE before the return statement
  const drawerClasses = isOpen 
    ? "fixed inset-y-0 right-0 z-50 w-full border-l shadow-lg transform transition-transform duration-300 ease-in-out bg-background sm:w-96 md:w-[650px] lg:w-[750px]"
    : "fixed inset-y-0 right-0 z-50 w-full border-l shadow-lg transform translate-x-full transition-transform duration-300 ease-in-out bg-background sm:w-96 md:w-[650px] lg:w-[750px]";

  // Function to handle opening the report dialog
  const handleOpenReportDialog = (userId: string) => {
    setReportingUserId(userId);
    setIsReportDialogOpen(true);
  };

  // Find the currently active thread object
  const currentThread = threads.find(t => t.id === activeThread);

  // Find the ID of the other participant in the current thread
  const otherUserIdInActiveThread = currentThread?.participants.find(p => p.user.id !== user?.userId)?.user.id;

  return (
    <>
      {/* Backdrop when drawer is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={onClose}
        ></div>
      )}

      {/* Drawer */}
      <div className={drawerClasses} aria-labelledby="messages-title">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header with close button */}
          <div className="p-3 border-b flex justify-between items-center bg-muted/30 flex-shrink-0">
            {/* Show Back button only on mobile when a thread is active */ }
            {activeThread && (
               <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="mr-2 md:hidden" // Hide on md and up
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
            )}
            <h2 id="messages-title" className={`text-lg font-semibold text-foreground ${activeThread ? 'md:ml-3' : 'ml-3'}`}>Messages</h2>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close messages">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* {/* Main Content Area - Flex Row for Desktop */ }
          <div className="flex-1 flex md:flex-row overflow-hidden">
            
            {/* --- Left Column: Thread List --- */} 
            {/* Always render list structure, control visibility with classes */} 
            <div className={cn(
              "flex flex-col h-full w-full md:w-[250px] lg:w-[300px] flex-shrink-0 border-r",
              activeThread ? "hidden md:flex" : "flex" // Hide on mobile if thread active, always show on desktop
            )}>
              <div className="p-3 border-b flex-shrink-0">
                 <h3 className="text-base font-medium text-foreground">Conversations</h3>
              </div>
              <ScrollArea className="flex-1 p-2">
                {threadsLoading || initializing ? (
                   <div className="space-y-2">
                     {[...Array(3)].map((_, i) => (
                       <div key={i} className="p-3 border rounded-md flex space-x-3">
                         <Skeleton className="h-12 w-12 rounded" />
                         <div className="flex-1 space-y-2">
                           <Skeleton className="h-4 w-3/4" />
                           <Skeleton className="h-3 w-full" />
                           <Skeleton className="h-3 w-1/2" />
                         </div>
                       </div>
                     ))}
                   </div>
                ) : sortedGroupKeys.length > 0 ? (
                  <div className="space-y-1">
                     {/* Map over sorted group keys (post IDs) */} 
                     {sortedGroupKeys.map((postId) => {
                       const groupThreads = groupedThreads[postId];
                       const firstThread = groupThreads[0]; // Use first thread for post info
                       
                       return (
                         <Collapsible key={postId} defaultOpen={true} className="rounded-md border border-transparent hover:border-muted transition-colors">
                           <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 rounded-t-md data-[state=open]:bg-muted/50">
                             <span className="truncate pr-2" title={firstThread.post.title}>Regarding: {firstThread.post.title}</span>
                             <ChevronDown className="h-4 w-4 flex-shrink-0 transition-transform duration-200 data-[state=open]:rotate-180" />
                           </CollapsibleTrigger>
                           <CollapsibleContent className="px-1 pb-1 space-y-1">
                             {/* Map over threads within this group */} 
                             {groupThreads.map((thread) => (
                               <ThreadItem
                                 key={thread.id}
                                 thread={thread}
                                 onClick={() => handleThreadClick(thread.id)}
                                 isActive={thread.id === activeThread}
                               />
                             ))}
                           </CollapsibleContent>
                         </Collapsible>
                       );
                     })}
                   </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <MessageSquare className="h-12 w-12 text-primary/30 mb-2" />
                    <p className="text-primary/70">No conversations yet</p>
                    <p className="text-muted-foreground text-sm mt-1">
                      Start a chat from a post page.
                    </p>
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* --- Right Column: Message View --- */} 
            {/* Render message view structure only if a thread is active */} 
            {activeThread ? (
              <div className="flex flex-col flex-1 h-full overflow-hidden bg-muted/5">
                 {/* Thread Header */} 
                 <TooltipProvider>
                    <div className="flex items-center justify-between p-3 border-b h-16 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={handleBack} className="md:hidden mr-2">
                         <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <ThreadHeader 
                        thread={currentThread} 
                        onExport={handleExportChat}
                        onReportUser={handleOpenReportDialog}
                      />
                      <Button variant="ghost" size="icon" onClick={onClose} className="ml-2">
                         <X className="h-5 w-5" />
                      </Button>
                    </div>
                 </TooltipProvider>
                 
                 {/* Message Area */} 
                 <div className="flex-1 overflow-y-auto p-3" id="message-list">
                {loadingMessages ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : messages.length > 0 ? (
                  <div className="space-y-3">
                    {messages.map((message) => (
                        // Keep existing message rendering structure here
                      <div 
                        key={message.id} 
                          className={`flex items-end space-x-2 ${ message.isSystemMessage ? "justify-center my-2" : message.sender?.user.id === user?.userId ? "justify-end" : "justify-start" }`}
                        >
                          {!message.isSystemMessage && message.sender?.user.id !== user?.userId && (
                            <Avatar className="h-6 w-6 flex-shrink-0 self-start mt-1">
                              <AvatarImage src={message.sender?.user.profilePictureUrl || '/placeholders/user.png'} alt={message.sender?.user.name} />
                              <AvatarFallback className="text-xs">{message.sender?.user.name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                            </Avatar>
                          )}
                          {message.isSystemMessage ? (
                            <Badge variant="secondary" className="text-xs font-normal py-1 px-2.5">{message.text}</Badge>
                          ) : (
                            <div className={`max-w-[75%] rounded-lg p-2 px-3 shadow-sm ${ message.sender?.user.id === user?.userId ? "bg-primary text-primary-foreground" : "bg-card border text-card-foreground" }`}>
                              {message.text && (<p className="whitespace-pre-wrap break-words text-sm">{message.text}</p>)}
                              {message.imageUrl && (
                                <div className="mt-2 cursor-pointer rounded-md overflow-hidden max-w-[200px] bg-black/10" onClick={() => handleViewImage(message.imageUrl!)}>
                                  <img src={message.imageUrl} alt="Chat attachment" className="max-w-full max-h-48 object-contain hover:opacity-90 transition-opacity display-block" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')}/>
                            </div>
                              )}
                              <div className={`text-xs mt-1 ${message.sender?.user.id === user?.userId ? "text-primary-foreground/70" : "text-muted-foreground"} ${message.sender?.user.id === user?.userId ? 'text-right' : 'text-left'}`}>
                                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                          </div>
                          )}
                          {!message.isSystemMessage && message.sender?.user.id === user?.userId && (
                            <Avatar className="h-6 w-6 flex-shrink-0 self-start mt-1">
                              <AvatarImage src={user?.profilePictureUrl || '/placeholders/user.png'} alt="You" />
                              <AvatarFallback className="text-xs">{user?.name?.charAt(0).toUpperCase() || 'Y'}</AvatarFallback>
                            </Avatar>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <MessageSquare className="h-12 w-12 text-primary/30 mb-2" />
                    <p className="text-primary/70">No messages yet</p>
                        <p className="text-muted-foreground text-sm mt-1">Start the conversation!</p>
                  </div>
                )}
              </div>
              
                 {/* Input Area */} 
                 <div className="p-3 border-t bg-background flex-shrink-0">
                   <form onSubmit={handleSendMessage} className="space-y-2">
                  {imagePreview && (
                      <div className="relative inline-block mr-2">
                        <div className="relative h-16 w-16 rounded overflow-hidden border border-muted">
                          <img src={imagePreview} alt="Preview" className="h-full w-full object-cover"/>
                          <Button type="button" variant="destructive" size="icon" onClick={clearImagePreview} className="absolute top-0 right-0 h-5 w-5 rounded-full p-0 transform translate-x-1/2 -translate-y-1/2" aria-label="Remove image preview">
                          <X className="h-3 w-3" />
                           </Button>
                        </div>
                    </div>
                  )}
                    <div className="flex items-end space-x-2">
                      <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={sending} className="flex-shrink-0" aria-label="Upload image">
                        <ImageIcon className="h-5 w-5" />
                      </Button>
                      <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSelection} className="hidden"/>
                      <Textarea
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        rows={1}
                        className="flex-1 resize-none min-h-[40px] max-h-[120px] bg-muted/40 focus-visible:ring-primary rounded-full px-4 py-2"
                        disabled={sending}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (!sending) {
                              handleSendMessage();
                            }
                          }
                        }}
                      />
                      <Button type="submit" disabled={sending || (!newMessage.trim() && !imageFile)} size="icon" className="flex-shrink-0 rounded-full" aria-label="Send message">
                        {sending ? ( <Loader2 className="h-4 w-4 animate-spin" /> ) : ( <Send className="h-4 w-4" /> )}
                      </Button>
                    </div>
                   </form>
                  </div>
              </div>
            ) : (
               <div className="hidden md:flex flex-1 items-center justify-center h-full bg-muted/20">
                  <div className="text-center text-muted-foreground">
                     <MessageSquare className="mx-auto h-12 w-12 mb-2" />
                     <p>Select a conversation to start chatting</p>
                  </div>
               </div>
            )}
          {/* End of Main Content Flex Row */} 
          </div> 
        {/* End of Main Drawer Flex Column */} 
        </div>
      {/* End of Drawer Container */} 
      </div>

      {/* Image Viewing Modal (Outside the main drawer structure but within the fragment) */} 
      {viewImageUrl && (
        <ImageViewModal 
          imageUrl={viewImageUrl} 
          isOpen={!!viewImageUrl} 
          onClose={() => setViewImageUrl(null)} 
          filename="Chat Image"
        />
      )}

      {/* Report Dialog - Render it here, conditionally based on state */}
      {reportingUserId && (
        <ReportDialog 
          isOpen={isReportDialogOpen}
          onClose={() => {
            setIsReportDialogOpen(false);
            setReportingUserId(null); // Clear the user ID when closing
          }}
          entityType="USER" 
          entityId={reportingUserId}
        />
      )}
    {/* End of Root Fragment */} 
    </>
  );
};

export default ChatDrawer; 