import axios from 'axios';
import Cookies from 'js-cookie';
import { useAuthStore } from '@/store/authStore'; // Import auth store
import { toast } from "@/components/ui/use-toast"; // Import toast for messages
import { useToast } from "@/components/ui/use-toast";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for API calls
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token') || localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
apiClient.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response;
  },
  async (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    const status = error.response?.status;
    const originalRequest = error.config;

    console.error("API Error Interceptor:", { 
      status: status, 
      message: error.response?.data?.message, 
      url: originalRequest?.url 
    });

    if (status === 401 || status === 403) {
      // Handle Unauthorized or Forbidden
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      
      // Check if we are already on a public page or login page to avoid redirect loops
      const isPublicPage = ['/login', '/register', '/forgot-password', '/reset-password', '/'].includes(currentPath);

      // Perform logout action from the store
      // Check if already logged out to prevent unnecessary actions
      if (useAuthStore.getState().isAuthenticated) {
        console.log(`Interceptor: Detected ${status}, logging out.`);
        useAuthStore.getState().logout(); // Clear user state and token cookie
      }

      // Redirect to login only if not already on a public/login page
      if (typeof window !== 'undefined' && !isPublicPage) {
         console.log(`Interceptor: Redirecting to /login from ${currentPath}`);
         // Use replace to avoid adding the failed page to history
         window.location.replace('/login'); 
         // Show toast *after* potential redirect logic
         toast({ 
            variant: "destructive",
            title: "Session Expired or Access Denied",
            description: "Please log in again.",
         });
      } else if (status === 403) {
          // If 403 on a public page (less likely, but possible), show access denied
          toast({ 
            variant: "destructive",
            title: "Access Denied",
            description: "You do not have permission to perform this action.",
         });
      }
      
      // Return a rejected promise to prevent the original call from proceeding
      return Promise.reject(new Error(status === 401 ? 'Unauthorized' : 'Forbidden'));
    }
    
    if (status === 429) {
       // Handle Too Many Requests
       toast({ 
          variant: "destructive",
          title: "Rate Limit Exceeded",
          description: error.response?.data?.message || "Too many requests. Please try again later.", // Use server message if available
       });
       // Return rejected promise
       return Promise.reject(new Error('Rate limit exceeded'));
    }

    // For other errors, let the specific API call handler deal with them
    return Promise.reject(error);
  }
);

// Authentication APIs
export const authAPI = {
  register: async (data: { name: string; email: string; password: string }) => {
    return apiClient.post('/auth/register', data);
  },

  login: async (data: { usernameOrEmail: string; password: string }) => {
    // Transform payload to match backend expectations
    return apiClient.post('/auth/login', { 
      username: data.usernameOrEmail, 
      password: data.password 
    });
  },

  adminLogin: async (data: { usernameOrEmail: string; password: string }) => {
    return apiClient.post('/auth/admin', data);
  },

  forgotPassword: async (email: string) => {
    return apiClient.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, newPassword: string) => {
    return apiClient.post('/auth/reset-password', { token, newPassword });
  },
};

// User APIs
export const userAPI = {
  getProfile: async () => {
    return apiClient.get('/user/me');
  },

  updateProfile: async (data: any) => {
    return apiClient.put('/user/me', data);
  },

  updatePassword: async (data: { currentPassword: string; newPassword: string }) => {
    return apiClient.put('/user/me/password', data);
  },
  
  uploadProfilePicture: async (image: File) => {
    const formData = new FormData();
    formData.append('image', image);
    
    return apiClient.post('/uploads/profile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Admin APIs
export const adminAPI = {
  getUsers: async (params?: { page?: number; limit?: number; includeDeleted?: boolean }) => {
    return apiClient.get('/admin/users', { params });
  },

  updateUserRoles: async (userId: string, roles: string[]) => {
    return apiClient.put(`/admin/users/${userId}/roles`, { roles });
  },

  updateUserProfile: async (userId: string, data: { name: string; email: string }) => {
    return apiClient.put(`/admin/users/${userId}/profile`, data);
  },

  deleteUser: async (userId: string, options: { reason: string; sendEmail: boolean }) => {
    return apiClient.delete(`/admin/users/${userId}`, { data: options });
  },

  restoreUser: async (userId: string) => {
    return apiClient.post(`/admin/users/${userId}/restore`);
  },

  resetUserPassword: async (userId: string) => {
    return apiClient.post(`/admin/users/${userId}/reset-password`);
  },

  deactivateUser: async (userId: string) => {
    return apiClient.delete(`/admin/users/${userId}`);
  },

  getReports: async (params?: { page?: number; limit?: number; status?: string }) => {
    return apiClient.get('/admin/reports', { params });
  },

  getReportDetails: async (reportId: string) => {
    return apiClient.get(`/admin/reports/${reportId}`);
  },

  resolveReport: async (reportId: string, status: string, adminNotes?: string) => {
    return apiClient.patch(`/admin/reports/${reportId}/resolve`, { status, adminNotes });
  },

  getPostHistoryById: async (postId: string) => {
    return apiClient.get(`/admin/posts/${postId}/history`);
  },

  getPostHistory: async (params?: { page?: number; limit?: number; search?: string }) => {
    return apiClient.get('/admin/posts/history', { params });
  },

  getArchivedPosts: async (params?: { page?: number; limit?: number; search?: string }) => {
    return apiClient.get('/admin/posts/archived', { params });
  },

  updatePost: async (postId: string, data: any) => {
    return apiClient.put(`/admin/posts/${postId}`, data);
  },

  updatePostStatus: async (postId: string, data: { status: string }) => {
    return apiClient.patch(`/admin/posts/${postId}/status`, data);
  },

  deletePost: async (postId: string) => {
    return apiClient.delete(`/admin/posts/${postId}`);
  },

  getPosts: async (params?: { 
    page?: number; 
    limit?: number; 
    type?: string; 
    status?: string;
    search?: string 
  }) => {
    return apiClient.get('/admin/posts', { params });
  },

  getPotentialMatches: async (postId: string) => {
    return apiClient.get(`/admin/posts/${postId}/potential-matches`);
  },

  matchPost: async (postId: string, targetId: string) => {
    return apiClient.post(`/posts/${postId}/match/${targetId}`);
  },

  resolvePost: async (postId: string) => {
    return apiClient.post(`/posts/${postId}/resolve`);
  },

  archivePost: async (postId: string) => {
    return apiClient.post(`/posts/${postId}/archive`);
  },

  restorePost: async (postId: string) => {
    return apiClient.post(`/admin/posts/${postId}/restore`);
  },

  getStats: async () => {
    return apiClient.get('/admin/stats');
  },

  getLogs: async (params?: { page?: number; limit?: number; role?: string; search?: string }) => {
    return apiClient.get('/admin/logs', { params });
  },

  getThreadsBetweenUsers: async (userId1: string, userId2: string): Promise<{ status: number, data: any[], message?: string }> => {
    console.log(`Calling API: adminAPI.getThreadsBetweenUsers(${userId1}, ${userId2})`);
    try {
      const response = await apiClient.get(`/admin/chats/users/${userId1}/${userId2}`);
      return { status: response.status, data: response.data.data || [], message: response.data.message }; 
    } catch (error: any) {
       console.error(`Error fetching threads between users ${userId1} and ${userId2}:`, error);
       return {
         status: error.response?.status || 500,
         data: [],
         message: error.response?.data?.message || "Failed to fetch threads from server."
       };
    }
  },

  getMessagesForThread: async (threadId: string): Promise<{ status: number, data: any[], message?: string }> => {
    console.log(`Calling API: adminAPI.getMessagesForThread(${threadId})`);
    try {
      const response = await apiClient.get(`/admin/chats/threads/${threadId}/messages`);
      return { status: response.status, data: response.data.data || [], message: response.data.message }; 
    } catch (error: any) {
       console.error(`Error fetching messages for thread ${threadId}:`, error);
       return {
         status: error.response?.status || 500,
         data: [],
         message: error.response?.data?.message || "Failed to fetch messages from server."
       };
    }
  }
};

// Chat APIs
export const chatAPI = {
  getOrCreateThread: async (postId: string) => {
    return apiClient.post('/chats/thread', { postId });
  },

  getThreads: async () => {
    return apiClient.get('/chats/threads');
  },

  getMessages: async (threadId: string) => {
    return apiClient.get(`/chats/${threadId}/messages`);
  },

  sendMessage: async (threadId: string, data: { text: string, imageUrl?: string }) => {
    return apiClient.post(`/chats/${threadId}/messages`, data);
  },

  uploadImage: async (formData: FormData) => {
    return apiClient.post('/uploads/chat-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  exportChat: async (threadId: string) => {
    return apiClient.get(`/chats/${threadId}/export`, { responseType: 'blob' });
  },
};

// Notifications APIs
export const notificationAPI = {
  getNotifications: async () => {
    return apiClient.get('/notifications');
  },

  markAsRead: async (notificationId: string) => {
    return apiClient.patch(`/notifications/${notificationId}/read`);
  },

  markAllAsRead: async () => {
    return apiClient.patch('/notifications/read-all');
  },
  
  deleteNotification: async (notificationId: string) => {
    return apiClient.delete(`/notifications/${notificationId}`);
  },
};

// Define an interface for the report data right here
interface SubmitReportPayload {
  entityType: 'POST' | 'USER';
  entityId: string;
  reason: string; // Corresponds to ReportReason enum on backend
  description?: string;
}

// Re-add the reportAPI object with corrections
export const reportAPI = {
  getMyReports: (params = {}) => {
    return apiClient.get('/reports/my-reports', { params });
  },

  // Use the defined interface and apiClient
  submitReport: async (reportData: SubmitReportPayload): Promise<{ status: number; message: string; data?: any }> => {
    const payload: any = {
      type: reportData.entityType,
      reason: reportData.reason,
      description: reportData.description,
    };
    if (reportData.entityType === 'POST') {
      payload.reportedPostId = reportData.entityId;
    } else {
      payload.reportedUserId = reportData.entityId; 
    }
    const response = await apiClient.post('/reports', payload);
    return response.data;
  },
};

export default apiClient; 