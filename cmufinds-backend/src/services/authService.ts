import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import PrismaService from "./prismaService";
import { formatTimestamp } from "../utils/timeUtils";
import ValidationService from "./validationService";
import EmailService from "./emailService";

const JWT_SECRET = process.env.JWT_SECRET!;

if (!JWT_SECRET) {
  throw new Error("FATAL ERROR: JWT_SECRET environment variable is not set.");
}
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);

class AuthService {
  private prisma = PrismaService.getClient();

  public async registerUser(name: string, email: string, password: string, ip: string) {

    const errors = ValidationService.validate(ValidationService.registerSchema, { name, email, password });
    if (errors) return { status: 400, message: errors };

    const username = email.split("@")[0];

    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });

    if (existingUser) return { status: 400, message: "Username or Email already exists." };

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const newUser = await this.prisma.user.create({
      data: { name, username, email, password: hashedPassword, ipAddress: ip, roles: ["STUDENT"] },
    });

    await this.prisma.userLog.create({
      data: { userId: newUser.id, username, action: "REGISTER", ipAddress: ip },
    });

    console.log(`[NEW USER] ${newUser.name} - Registered at ${formatTimestamp(newUser.createdAt)}`);

    return { status: 201, message: "User registered successfully" };
  }

  public async loginUser(username: string, password: string, ip: string) {
    const errors = ValidationService.validate(ValidationService.loginSchema, { username, password });
    if (errors) return { status: 400, message: errors };

    const user = await this.prisma.user.findFirst({ where: { OR: [{ email: username }, { username }] } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return { status: 401, message: "Invalid email, username, or password." };
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        roles: user.roles, 
        name: user.name,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
        ip: user.ipAddress 
      }, 
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    await this.prisma.userLog.create({
      data: { userId: user.id, username, action: "LOGIN", ipAddress: ip },
    });

    console.log(`[LOGIN] ${user.name} - Logged in at ${formatTimestamp(new Date())}`);

    return { status: 200, message: "Login successful", token };
  }

  public async adminLogin(username: string, password: string, ip: string) {
    const errors = ValidationService.validate(ValidationService.loginSchema, { username, password });
    if (errors) return { status: 400, message: errors };

    const user = await this.prisma.user.findFirst({ where: { OR: [{ email: username }, { username }] } });

    if (!user) return { status: 401, message: "Invalid credentials" };

    if (!user.roles.includes("ADMIN") && !user.roles.includes("DEVELOPER")) {
      return { status: 403, message: "Access denied" };
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return { status: 401, message: "Invalid credentials" };

    const token = jwt.sign(
      { 
        userId: user.id, 
        roles: user.roles, 
        name: user.name,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
        ip: user.ipAddress 
      },
      JWT_SECRET,
      { expiresIn: "3h" }
    );

    if (user.roles.includes("ADMIN")) {
      await this.prisma.userLog.create({
        data: {
          userId: user.id,
          username: user.username,
          action: "ADMIN_LOGIN",
          ipAddress: ip,
        },
      });
    }
    if (user.roles.includes("DEVELOPER")) {
      await this.prisma.userLog.create({
        data: {
          userId: user.id,
          username: user.username,
          action: "DEVELOPER_LOGIN",
          ipAddress: ip,
        },
      });
    }

    console.log(`[ADMIN LOGIN] ${user.name} logged in at ${formatTimestamp(new Date())}`);

    return { status: 200, message: "Login Successful!", token };
  }

  /**
   * Request password reset
   */
  public async forgotPassword(email: string) {
    try {
      // Find the user
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        // We return success even when user not found for security
        return { status: 200, message: "If your email is registered, you'll receive a password reset link shortly." };
      }

      // Generate a random token
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      // Set token expiry (1 hour)
      const resetTokenExpiry = new Date();
      resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1);

      // Save to database
      await this.prisma.user.update({
        where: { id: user.id },
        data: { 
          resetToken: resetToken as any, 
          resetTokenExpiry: resetTokenExpiry as any 
        }
      });

      // Send email
      const emailSent = await EmailService.sendPasswordResetEmail(
        user.email,
        user.name,
        resetToken
      );

      if (!emailSent) {
        console.error(`Failed to send password reset email to ${user.email}`);
        return { status: 500, message: "Error sending password reset email. Please try again later." };
      }

      console.log(`[PASSWORD RESET] Reset token generated for ${user.email} at ${formatTimestamp(new Date())}`);
      
      return { 
        status: 200, 
        message: "If your email is registered, you'll receive a password reset link shortly." 
      };
    } catch (error) {
      console.error("Error in forgotPassword:", error);
      return { status: 500, message: "An error occurred. Please try again later." };
    }
  }

  /**
   * Reset password with token
   */
  public async resetPassword(token: string, newPassword: string) {
    try {
      // Validate token and find user
      const user = await this.prisma.user.findFirst({ 
        where: {
          resetToken: token as any,
          resetTokenExpiry: { gt: new Date() }
        }
      });

      if (!user) {
        return { status: 400, message: "Invalid or expired reset token" };
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

      // Update user with new password and clear token
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null as any,
          resetTokenExpiry: null as any
        }
      });

      console.log(`[PASSWORD RESET] Password reset completed for ${user.email} at ${formatTimestamp(new Date())}`);

      // Log the password reset
      await this.prisma.userLog.create({
        data: {
          userId: user.id,
          username: user.username,
          action: "PASSWORD_RESET",
          ipAddress: "password-reset"
        }
      });

      return { status: 200, message: "Password has been reset successfully" };
    } catch (error) {
      console.error("Error in resetPassword:", error);
      return { status: 500, message: "An error occurred. Please try again later." };
    }
  }
}

export default new AuthService();
