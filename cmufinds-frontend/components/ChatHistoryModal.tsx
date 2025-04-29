'use client';

import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';

// Basic interfaces matching expected data (adjust as needed)
interface ChatUser {
  id: string;
  name?: string | null;
  username?: string | null;
  profilePictureUrl?: string | null;
}

interface ChatMessage {
  id: string;
  text: string;
  imageUrl?: string | null;
  createdAt: string;
  senderId: string;
  sender?: { user: ChatUser }; // Match structure if available
  isSystemMessage?: boolean;
}

interface ChatHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user1: ChatUser | null | undefined;
  user2: ChatUser | null | undefined;
  messages: ChatMessage[];
  threadId?: string | null; // Optional: if viewing a specific thread
  loading?: boolean;
}

const ChatHistoryModal: React.FC<ChatHistoryModalProps> = ({
  isOpen,
  onClose,
  user1,
  user2,
  messages = [],
  threadId,
  loading = false,
}) => {

  const getUserName = (user: ChatUser | null | undefined) => user?.name || user?.username || 'Unknown';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl sm:max-w-3xl md:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Chat History</DialogTitle>
          <DialogDescription>
            Conversation between {getUserName(user1)} and {getUserName(user2)}.
            {threadId && ` (Thread ID: ${threadId})`}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 py-4 px-1 pr-3">
          {loading ? (
            <p className="text-center">Loading chat history...</p>
          ) : messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-2 ${ 
                    msg.isSystemMessage ? "justify-center my-2" 
                    : msg.senderId === user1?.id ? "justify-start" // Assuming user1 is one perspective
                    : "justify-end" 
                  }`}
                >
                  {/* Avatar for user1's messages */}
                  {!msg.isSystemMessage && msg.senderId === user1?.id && (
                    <Avatar className="h-6 w-6 flex-shrink-0 self-start mt-1">
                      <AvatarImage src={user1?.profilePictureUrl || '/placeholders/user.png'} alt={getUserName(user1)} />
                      <AvatarFallback className="text-xs">{getUserName(user1).charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  
                  {/* Message Content */}
                  {msg.isSystemMessage ? (
                    <Badge variant="secondary" className="text-xs font-normal py-1 px-2.5 max-w-[80%]">{msg.text}</Badge>
                  ) : (
                    <div 
                      className={`relative max-w-[75%] rounded-lg p-2 px-3 shadow-sm ${ 
                        msg.senderId === user1?.id 
                        ? "bg-card border text-card-foreground" 
                        : "bg-primary text-primary-foreground" // Assuming user2 is the other perspective
                      }`}
                    >
                      {msg.text && <p className="whitespace-pre-wrap break-words text-sm">{msg.text}</p>}
                      {msg.imageUrl && (
                        <div className="mt-2 rounded-md overflow-hidden max-w-[200px] bg-black/10">
                          <img src={msg.imageUrl} alt="Chat attachment" className="max-w-full max-h-48 object-contain display-block" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')}/>
                        </div>
                      )}
                       <div className={`text-xs mt-1 opacity-70 ${msg.senderId === user1?.id ? 'text-left' : 'text-right'}`}> 
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  )}

                  {/* Avatar for user2's messages */}
                  {!msg.isSystemMessage && msg.senderId !== user1?.id && (
                    <Avatar className="h-6 w-6 flex-shrink-0 self-start mt-1">
                      <AvatarImage src={user2?.profilePictureUrl || '/placeholders/user.png'} alt={getUserName(user2)} />
                      <AvatarFallback className="text-xs">{getUserName(user2).charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No messages found in this thread.</p>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChatHistoryModal; 