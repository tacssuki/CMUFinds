import { create } from 'zustand';

interface GlobalChatDrawerState {
  isOpen: boolean;
  activePostId?: string;
  openChatDrawer: (postId?: string) => void;
  closeChatDrawer: () => void;
}

export const useGlobalChatDrawer = create<GlobalChatDrawerState>((set) => ({
  isOpen: false,
  activePostId: undefined,
  openChatDrawer: (postId?: string) => set({ isOpen: true, activePostId: postId }),
  closeChatDrawer: () => set({ isOpen: false, activePostId: undefined }),
})); 