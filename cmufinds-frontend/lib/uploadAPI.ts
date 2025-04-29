import apiClient from './api';

/**
 * Upload API for managing file uploads
 */
export const uploadAPI = {
  /**
   * Upload profile picture
   * @param image - The profile image file to upload
   */
  uploadProfilePicture: async (image: File) => {
    const formData = new FormData();
    formData.append('image', image);

    return apiClient.post('/uploads/profile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Upload images for a post (standalone version)
   * @param images - Array of image files to upload
   */
  uploadPostImages: async (images: File[]) => {
    const formData = new FormData();

    images.forEach((image) => {
      formData.append('images', image);
    });

    return apiClient.post('/uploads/post', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Delete an uploaded file
   * @param context - The context of the file ('posts' or 'profiles')
   * @param filename - The name of the file to delete
   */
  deleteFile: async (context: 'posts' | 'profiles', filename: string) => {
    return apiClient.delete(`/uploads/${context}/${filename}`);
  },

  /**
   * Get the URL for an uploaded file
   * @param context - The context of the file ('posts' or 'profiles')
   * @param filename - The name of the file
   */
  getFileUrl: (context: 'posts' | 'profiles', filename: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    return `${baseUrl}/api/v1/uploads/${context}/${filename}`;
  }
};

export default uploadAPI; 