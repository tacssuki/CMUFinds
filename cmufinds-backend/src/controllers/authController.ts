import { Request, Response } from "express";
import AuthService from "../services/authService";
import { z } from 'zod';

// --- Validation Schemas ---
const registerSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Name must be at least 3 characters long'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
  }),
});

const loginSchema = z.object({
  body: z.object({
    // Allow either email or username (adjust based on actual login logic if needed)
    username: z.string().min(1, 'Username or email is required'), 
    password: z.string().min(1, 'Password is required'),
  }),
});

// Add schemas for forgotPassword and resetPassword too
const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
  }),
});
// --- End Validation Schemas ---

class AuthController {
  
  // Expose schemas for use in routes/middleware
  public static schemas = {
    register: registerSchema,
    login: loginSchema,
    forgotPassword: forgotPasswordSchema,
    resetPassword: resetPasswordSchema,
  };
  
  public async register(req: Request, res: Response) {
    try {
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const { name, email, password } = req.body;

      const result = await AuthService.registerUser(name, email, password, ip as string);

      return res.status(result.status).json({ message: result.message });
    } catch (error) {
      console.error("[REGISTER ERROR]", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  public async login(req: Request, res: Response) {
    try {
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const { username, password } = req.body;

      const result = await AuthService.loginUser(username, password, ip as string);

      if (result.token) {
        return res.status(result.status).json({ message: result.message, token: result.token });
      } else {
        return res.status(result.status).json({ message: result.message });
      }
    } catch (error) {
      console.error("[LOGIN ERROR]", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  public async adminLogin(req: Request, res: Response) {
    try {
      const { username, password } = req.body; // Accepts email or username
      
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
      const result = await AuthService.adminLogin(username, password, ip as string);

      return res.status(result.status).json({ message: result.message, token: result.token });
    } catch (error) {
      console.error("[ADMIN LOGIN ERROR]", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };
  
  /**
   * Handle forgot password request
   */
  public async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const result = await AuthService.forgotPassword(email);
      return res.status(result.status).json({ message: result.message });
    } catch (error) {
      console.error("[FORGOT PASSWORD ERROR]", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  /**
   * Reset password with token
   */
  public async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      const result = await AuthService.resetPassword(token, newPassword);
      return res.status(result.status).json({ message: result.message });
    } catch (error) {
      console.error("[RESET PASSWORD ERROR]", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
}

export default new AuthController();
