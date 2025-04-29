import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Middleware to check if the user is authenticated
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 401,
        message: 'Authentication required. Please login.'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        status: 401,
        message: 'Authentication token is missing'
      });
    }
    
    // Verify the token
    const secret = process.env.JWT_SECRET || 'default-secret-key';
    const decoded = jwt.verify(token, secret) as any;
    
    // Add the user info to the request
    req.user = {
      userId: decoded.userId,
      roles: decoded.roles
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      status: 401,
      message: 'Invalid or expired token'
    });
  }
};

// Export other auth middleware functions here 