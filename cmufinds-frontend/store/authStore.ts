import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';
import { AuthState, Role } from '@/types';
import { authAPI } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import Cookies from 'js-cookie';
import { userAPI } from '@/lib/api';

// Cookie settings
const COOKIE_OPTIONS = {
  expires: 1, // 1 day
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const
};

interface AuthUser {
  userId: string;
  roles: Role[];
  name?: string;
  email?: string;
  username?: string;
  createdAt?: string;
  profilePicture?: string;
  profilePictureUrl?: string;
}

interface DecodedToken {
  userId: string;
  roles: Role[];
  name?: string;
  email?: string;
  username?: string;
  createdAt?: string;
  profilePicture?: string;
  profilePictureUrl?: string;
  iat: number;
  exp: number;
}

interface AuthActions {
  login: (credentials: { usernameOrEmail: string; password: string }) => Promise<boolean>;
  adminLogin: (credentials: { usernameOrEmail: string; password: string }) => Promise<boolean>;
  register: (data: { name: string; email: string; password: string }) => Promise<boolean>;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setUserFromToken: (token: string) => void;
  updateUser: (userData: Partial<AuthUser>) => void;
  initializeAuth: () => Promise<void>;
}

// Initial state for auth
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  isLoading: false,
  error: null,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.login(credentials);
          const { token } = response.data;
          
          // Save token to cookie (and localStorage for backwards compatibility)
          Cookies.set('token', token, COOKIE_OPTIONS);
          localStorage.setItem('token', token);
          
          // Set user data from token
          get().setUserFromToken(token);
          
          // Fetch latest profile data after setting from token
          try {
            const profileResponse = await userAPI.getProfile();
            if (profileResponse.data?.data) {
              const userData = profileResponse.data.data;
              // Update user state with fresh data, preserving token-derived info if needed
              set(state => ({
                user: {
                  ...(state.user || {}), // Keep existing user data from token
                  profilePicture: userData.profilePicture,
                  profilePictureUrl: userData.profilePictureUrl,
                  // Explicitly update other fields if they might change and are needed
                  name: userData.name, 
                  email: userData.email,
                } as AuthUser
              }));
            }
          } catch (profileError) {
            console.error('Error fetching profile data after login:', profileError);
            // Don't fail login if profile fetch fails, just use token data
          }

          set({ isLoading: false, isAuthenticated: true, token });
          return true; // Indicate success
        } catch (error: any) {
          console.error('Login error:', error);
          const errorMessage = error.response?.data?.message || 'Login failed. Please check your credentials.';
          set({ 
            isLoading: false, 
            error: errorMessage
          });
          // Clean up potentially partially set cookie/token on login fail
          Cookies.remove('token');
          localStorage.removeItem('token');
          return false; // Indicate failure
        }
      },

      adminLogin: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.adminLogin(credentials);
          const { token } = response.data;
          
          // Save token to cookie (and localStorage for backwards compatibility)
          Cookies.set('token', token, COOKIE_OPTIONS);
          localStorage.setItem('token', token);
          
          // Set user data from token
          get().setUserFromToken(token);
          
          // Verify admin role
          const initialUserData = get().user; // Get user data set from token
          if (!initialUserData?.roles.includes(Role.ADMIN) && !initialUserData?.roles.includes(Role.DEVELOPER)) {
            // Clean up immediately if not authorized
            Cookies.remove('token');
            localStorage.removeItem('token');
            set({ user: null, isAuthenticated: false, token: null }); // Clear user state
            throw new Error('Unauthorized: Admin access required');
          }
          
          // Fetch latest profile data after setting from token and verifying role
          try {
            const profileResponse = await userAPI.getProfile();
            if (profileResponse.data?.data) {
              const userData = profileResponse.data.data;
              // Update user state with fresh data
               set(state => ({
                user: {
                  ...(state.user || {}), // Keep existing user data from token
                  profilePicture: userData.profilePicture,
                  profilePictureUrl: userData.profilePictureUrl,
                   // Explicitly update other fields if they might change and are needed
                  name: userData.name, 
                  email: userData.email,
                } as AuthUser
              }));
            }
          } catch (profileError) {
            console.error('Error fetching profile data after admin login:', profileError);
             // Don't fail login if profile fetch fails, just use token data (already verified role)
          }

          set({ isLoading: false, isAuthenticated: true, token });
          return true; // Indicate success
        } catch (error: any) {
          console.error('Admin login error:', error);
          const errorMessage = error.response?.data?.message || error.message || 'Admin login failed.';
          set({ 
            isLoading: false, 
            error: errorMessage 
          });
          // Clean up token/local storage
          Cookies.remove('token');
          localStorage.removeItem('token');
          return false; // Indicate failure
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await authAPI.register(data);
          set({ isLoading: false });
          return true; // Indicate success
        } catch (error: any) {
          console.error('Registration error:', error);
          const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
          set({ 
            isLoading: false, 
            error: errorMessage
          });
          return false; // Indicate failure
        }
      },

      logout: () => {
        // Remove token from storage
        Cookies.remove('token');
        localStorage.removeItem('token');
        
        // Reset state
        set({ 
          isAuthenticated: false, 
          user: null, 
          token: null
        });
        
        // Show logout toast
        toast({
          title: "Logged out",
          description: "You have been successfully logged out.",
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),
      
      clearError: () => set({ error: null }),

      setUserFromToken: (token) => {
        try {
          const decodedToken = jwtDecode<DecodedToken>(token);
          
          // Extract user data from token
          const user: AuthUser = {
            userId: decodedToken.userId,
            roles: decodedToken.roles,
            name: decodedToken.name,
            email: decodedToken.email,
            username: decodedToken.username,
            createdAt: decodedToken.createdAt,
            profilePicture: decodedToken.profilePicture,
            profilePictureUrl: decodedToken.profilePictureUrl
          };
          
          set({ user, isAuthenticated: true });
        } catch (error) {
          console.error('Error decoding token:', error);
          set({ user: null, isAuthenticated: false });
        }
      },

      updateUser: (userData) => {
        const currentUser = get().user;
        if (!currentUser) return;
        
        set({ 
          user: { 
            ...currentUser, 
            ...userData 
          } 
        });
      },

      initializeAuth: async () => {
        // Check if we're in a browser environment
        if (typeof window === 'undefined') return;
        
        // Try to get token from cookie first, then localStorage as fallback
        const token = Cookies.get('token') || localStorage.getItem('token');
        if (!token) return;
        
        try {
          // Decode token to check expiration
          const decodedToken = jwtDecode<DecodedToken>(token);
          const currentTime = Date.now() / 1000;
          
          if (decodedToken.exp < currentTime) {
            // Token expired
            Cookies.remove('token');
            localStorage.removeItem('token');
            set({ isAuthenticated: false, user: null, token: null });
            return;
          }
          
          // Set basic user data from token
          get().setUserFromToken(token);
          set({ token });
          
          // Try to fetch current user data to get latest profile info
          try {
            const response = await userAPI.getProfile();
            if (response.data?.data) {
              const userData = response.data.data;
              set({
                user: {
                  ...get().user,
                  profilePicture: userData.profilePicture,
                  profilePictureUrl: userData.profilePictureUrl
                } as AuthUser
              });
            }
          } catch (error) {
            console.error('Error fetching current user data:', error);
            // Don't logout on profile fetch error, just continue with token data
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          Cookies.remove('token');
          localStorage.removeItem('token');
          set({ isAuthenticated: false, user: null, token: null });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

// Initialize auth on import
if (typeof window !== 'undefined') {
  useAuthStore.getState().initializeAuth();
} 