import apiClient from './api';

// Types
export interface PostParams {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  search?: string;
  category?: string;
  keyword?: string;
  location?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  createdAfter?: string;
  createdBefore?: string;
}

export interface PostData {
  title: string;
  description: string;
  location: string;
  type: 'LOST' | 'FOUND';
  category?: string;
  date?: string;
  images?: File[];
}

// Posts APIs
export const postAPI = {
  // Get posts for feed with optional filters
  getFeed: async (params?: PostParams) => {
    // Apply the same parameter transformations for consistency
    const mappedParams = { ...params };
    
    if (mappedParams?.search) {
      mappedParams.keyword = mappedParams.search;
      delete mappedParams.search;
    }
    
    // Format date parameters
    if (mappedParams?.createdAfter) {
      try {
        const date = new Date(mappedParams.createdAfter);
        if (!isNaN(date.getTime())) {
          mappedParams.createdAfter = date.toISOString();
        }
      } catch (e) {
        delete mappedParams.createdAfter;
      }
    }
    
    if (mappedParams?.createdBefore) {
      try {
        const date = new Date(mappedParams.createdBefore);
        if (!isNaN(date.getTime())) {
          mappedParams.createdBefore = date.toISOString();
        }
      } catch (e) {
        delete mappedParams.createdBefore;
      }
    }
    
    return apiClient.get('/posts', { params: mappedParams });
  },

  // Get all posts (typically for admin)
  getAllPosts: async (params?: PostParams) => {
    return apiClient.get('/posts', { params });
  },

  // Get posts created by the current user
  getMyPosts: async (params?: PostParams) => {
    // Apply the same parameter transformations as searchPosts
    const mappedParams = { ...params };
    
    if (mappedParams?.search) {
      mappedParams.keyword = mappedParams.search;
      delete mappedParams.search;
    }
    
    // Format date parameters
    if (mappedParams?.createdAfter) {
      try {
        const date = new Date(mappedParams.createdAfter);
        if (!isNaN(date.getTime())) {
          mappedParams.createdAfter = date.toISOString();
        }
      } catch (e) {
        delete mappedParams.createdAfter;
      }
    }
    
    if (mappedParams?.createdBefore) {
      try {
        const date = new Date(mappedParams.createdBefore);
        if (!isNaN(date.getTime())) {
          mappedParams.createdBefore = date.toISOString();
        }
      } catch (e) {
        delete mappedParams.createdBefore;
      }
    }
    
    return apiClient.get('/posts/my-posts', { params: mappedParams });
  },

  // Get a single post by ID
  getPostById: async (id: string) => {
    return apiClient.get(`/posts/${id}`);
  },

  // Create a new post with optional images
  createPost: async (data: PostData) => {
    const formData = new FormData();
    
    // Append text fields
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('location', data.location);
    formData.append('type', data.type);
    
    if (data.category) formData.append('category', data.category);
    
    // Format date to ISO string if it exists
    if (data.date) {
      try {
        // Create a date object from the input (which should be in YYYY-MM-DD format)
        const dateObj = new Date(data.date);
        // Check if the date is valid
        if (!isNaN(dateObj.getTime())) {
          // Set time to noon UTC to avoid timezone issues
          dateObj.setUTCHours(12, 0, 0, 0);
          formData.append('date', dateObj.toISOString());
        } else {
          console.error('Invalid date:', data.date);
        }
      } catch (error) {
        console.error('Error parsing date:', error);
      }
    }
    
    // Append images if any
    if (data.images && data.images.length > 0) {
      data.images.forEach((image, index) => {
        formData.append('images', image);
      });
    }
    
    return apiClient.post('/posts/create', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Update an existing post
  updatePost: async (id: string, data: Partial<PostData>) => {
    const formData = new FormData();
    
    // Only append fields that are provided
    if (data.title) formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.location) formData.append('location', data.location);
    if (data.type) formData.append('type', data.type);
    if (data.category) formData.append('category', data.category);
    if (data.date) formData.append('date', data.date);
    
    // Append images if any
    if (data.images && data.images.length > 0) {
      data.images.forEach((image) => {
        formData.append('images', image);
      });
    }
    
    return apiClient.put(`/posts/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Delete a post
  deletePost: async (id: string) => {
    return apiClient.delete(`/posts/${id}`);
  },

  // Search for posts with various filters
  searchPosts: async (params: PostParams) => {
    // Map 'search' to 'keyword' for the backend API
    const mappedParams = { ...params };
    if (mappedParams.search) {
      mappedParams.keyword = mappedParams.search;
      delete mappedParams.search;
    }
    
    // Ensure proper date formatting if provided
    if (mappedParams.createdAfter) {
      try {
        const date = new Date(mappedParams.createdAfter);
        if (!isNaN(date.getTime())) {
          mappedParams.createdAfter = date.toISOString();
        }
      } catch (e) {
        console.error("Invalid createdAfter date:", mappedParams.createdAfter);
        delete mappedParams.createdAfter;
      }
    }
    
    if (mappedParams.createdBefore) {
      try {
        const date = new Date(mappedParams.createdBefore);
        if (!isNaN(date.getTime())) {
          mappedParams.createdBefore = date.toISOString();
        }
      } catch (e) {
        console.error("Invalid createdBefore date:", mappedParams.createdBefore);
        delete mappedParams.createdBefore;
      }
    }
    
    // Ensure sort parameters are valid
    if (mappedParams.sortBy && !['createdAt', 'title', 'type', 'status', 'category'].includes(mappedParams.sortBy)) {
      delete mappedParams.sortBy;
    }
    
    if (mappedParams.sortOrder && !['asc', 'desc'].includes(mappedParams.sortOrder)) {
      delete mappedParams.sortOrder;
    }
    
    return apiClient.get('/posts/search', { params: mappedParams });
  },
  
  // Match two posts (for resolving lost/found items)
  matchPost: async (postId: string, targetId: string) => {
    return apiClient.post(`/posts/${postId}/match/${targetId}`);
  },
  
  // Mark a post as resolved
  resolvePost: async (postId: string) => {
    return apiClient.post(`/posts/${postId}/resolve`);
  },
  
  // Archive a post
  archivePost: async (postId: string) => {
    return apiClient.post(`/posts/${postId}/archive`);
  },

  // Update status of user's own post
  updateMyPostStatus: async (id: string, status: string) => {
    return apiClient.patch(`/posts/${id}/status`, { status });
  },

  // Archive user's own post (if resolved)
  archiveMyPost: async (id: string) => {
    return apiClient.post(`/posts/${id}/my-archive`);
  },
}; 