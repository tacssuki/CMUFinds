// Token debugging utilities for development use only
import { jwtDecode } from 'jwt-decode';
import Cookies from 'js-cookie';

interface DecodedToken {
  userId: string;
  roles?: string[];
  iat: number;
  exp: number;
}

// This is a safe way to check the token in the browser console
export function checkToken() {
  if (process.env.NODE_ENV === 'production') {
    console.warn('Token debugging is disabled in production');
    return null;
  }

  try {
    const token = Cookies.get('token');
    if (!token) {
      console.warn('No token found in cookies');
      return null;
    }

    const decoded = jwtDecode<DecodedToken>(token);
    console.log('Token decoded successfully:', decoded);
    
    // Check for common issues
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp < currentTime) {
      console.error('⚠️ Token is EXPIRED');
    } else {
      console.log('✅ Token is valid (not expired)');
    }

    if (!decoded.roles || !Array.isArray(decoded.roles)) {
      console.error('⚠️ No roles array in token');
    } else {
      console.log('Roles:', decoded.roles);
      const hasAdminAccess = decoded.roles.some((role: string) => ['ADMIN', 'DEVELOPER'].includes(role));
      if (hasAdminAccess) {
        console.log('✅ User has admin access');
      } else {
        console.error('⚠️ User does NOT have admin access roles');
      }
    }
    
    return decoded;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

// Expose this in development mode for browser console debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  // @ts-ignore - attach to window for debugging
  window.checkToken = checkToken;
}

// Export more utilities as needed
export default {
  checkToken
}; 