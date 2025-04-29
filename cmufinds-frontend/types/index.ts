// Enum types matching backend
export enum Role {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN',
  DEVELOPER = 'DEVELOPER'
}

export enum PostType {
  LOST = 'LOST',
  FOUND = 'FOUND'
}

export enum PostStatus {
  PENDING = 'PENDING',
  MATCHED = 'MATCHED',
  RESOLVED = 'RESOLVED'
}

export enum NotificationType {
  MATCH = 'MATCH',
  RESOLVE = 'RESOLVE'
}

export enum ReportType {
  POST = 'POST',
  CHAT = 'CHAT'
}

export enum ReportStatus {
  PENDING = 'PENDING',
  DISMISSED = 'DISMISSED',
  TAKEN_DOWN = 'TAKEN_DOWN'
}

// User types
export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  roles: Role[];
  createdAt: string;
  ipAddress?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  roles: Role[];
  createdAt: string;
}

// Authentication types
export interface LoginCredentials {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: {
    userId: string;
    roles: Role[];
    name?: string;
    email?: string;
    username?: string;
    createdAt?: string;
    profilePicture?: string;
    profilePictureUrl?: string;
  } | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

// Post types
export interface Post {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    username: string;
  };
  type: PostType;
  title: string;
  description: string;
  location: string;
  category?: string;
  dateLost?: string;
  dateFound?: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
  status: PostStatus;
  isOwner?: boolean;
}

export interface CreatePostInput {
  title: string;
  description: string;
  location: string;
  type: PostType;
  category?: string;
  dateLost?: Date | null;
  dateFound?: Date | null;
  images?: FileList | null;
}

export interface UpdatePostInput {
  title?: string;
  description?: string;
  location?: string;
  category?: string;
  dateLost?: Date | null;
  dateFound?: Date | null;
}

// Chat types
export interface Thread {
  id: string;
  postId: string;
  createdAt: string;
  post?: Post;
  participants: ThreadParticipant[];
  messages?: Message[];
}

export interface ThreadParticipant {
  id: string;
  threadId: string;
  userId: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    username: string;
    profilePictureUrl?: string;
  };
}

export interface Message {
  id: string;
  threadId: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
  isSystemMessage: boolean;
  senderId?: string;
  sender?: ThreadParticipant;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  payload?: any;
  isRead: boolean;
  createdAt: string;
}

// Report types
export interface Report {
  id: string;
  type: ReportType;
  postId?: string;
  threadId?: string;
  reporterId: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  reporter?: {
    id: string;
    name: string;
    username: string;
  };
  post?: Post;
}

// Admin types
export interface AdminStats {
  totalUsers: number;
  totalPosts: number;
  pendingPosts: number;
  resolvedPosts: number;
  pendingReports: number;
  postsLastWeek: number;
  registrationsLastWeek: number;
}

export interface Log {
  id: string;
  userId: string;
  username: string;
  action: string;
  timestamp: string;
  ipAddress: string;
} 