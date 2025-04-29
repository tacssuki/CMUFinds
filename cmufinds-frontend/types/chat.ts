// cmufinds-frontend/types/chat.ts

export interface Message {
  id: string;
  threadId: string;
  text: string;
  isSystemMessage?: boolean;
  createdAt: string;
  imageUrl?: string;
  senderId: string; // This is the ThreadParticipant ID
  sender?: {
    id: string; // ThreadParticipant ID
    userId: string; // User ID
    user: {
      id: string; // User ID
      name: string;
      username?: string;
      profilePictureUrl?: string;
    }
  };
}

export interface Thread {
  id: string;
  post: {
    id: string;
    title: string;
    type: string;
    imageUrl?: string;
    images?: string[]; // Add original images array if needed
  };
  participants: {
    id: string; // ThreadParticipant ID
    userId: string; // User ID
    user: {
      id: string; // User ID
      name: string;
      username: string;
      profilePictureUrl?: string; // Add URL if pre-calculated
      profilePicture?: string; // Keep original filename if needed
    }
  }[];
  // Include the latest message directly if the backend provides it
  messages: Message[]; // Or potentially just the latest Message
} 