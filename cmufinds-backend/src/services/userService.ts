import PrismaService from "./prismaService";
import bcrypt from "bcryptjs";
import { User } from "@prisma/client";

const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);

class UserService {
  private prisma = PrismaService.getClient();

  public async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        name: true, 
        username: true, 
        email: true, 
        roles: true, 
        createdAt: true,
        profilePicture: true
      },
    });
    
    if (!user) return { status: 404, message: "User not found" };
    
    // Add full URL for profile picture if exists
    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    const userData = {
      ...user,
      profilePictureUrl: user.profilePicture 
        ? `${baseUrl}/api/v1/uploads/profiles/${user.profilePicture}` 
        : null
    };
    
    return { status: 200, data: userData };
  }

  public async searchUsers(query: string, page: number, limit: number) {
    try {
      const skip = (page - 1) * limit;
      
      // Search by name, username, or email
      const users = await this.prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { username: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } }
          ],
          // Exclude sensitive roles if needed
          // roles: { notIn: ['ADMIN', 'DEVELOPER'] }
        },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          createdAt: true,
          // Don't return password, roles, or other sensitive info
        },
        take: limit,
        skip: skip,
        orderBy: { name: 'asc' }
      });
      
      // Get total count for pagination
      const total = await this.prisma.user.count({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { username: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } }
          ],
          // roles: { notIn: ['ADMIN', 'DEVELOPER'] }
        }
      });
      
      return {
        status: 200,
        data: users,
        meta: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error("Error searching users:", error);
      return { status: 500, message: "Failed to search users" };
    }
  }

  public async updateProfile(
    userId: string,
    data: { name?: string; email?: string; password?: string; currentPassword?: string } // Added currentPassword
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return { status: 404, message: "User not found" };
    }

    // --- Start Validation and Preparation ---
    const updateData: Partial<User> = {}; // Use Partial<User> for type safety

    // Validate and prepare name
    if (data.name && data.name !== user.name) {
        updateData.name = data.name; // Assume already sanitized by Zod transform
    }

    // Validate and prepare email
    if (data.email && data.email !== user.email) {
      const exists = await this.prisma.user.findFirst({
        where: { email: data.email, NOT: { id: userId } },
      });
      if (exists) {
          return { status: 400, message: "Email already in use by another account" };
      }
      updateData.email = data.email;
    }

    // Validate and prepare password (if provided)
    if (data.password) {
      // currentPassword is required by Zod schema if new password is set
      if (!data.currentPassword) {
          // This should ideally be caught by Zod, but double-check
          return { status: 400, message: "Current password is required to set a new password" };
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return { status: 403, message: "Incorrect current password" };
      }

      // Hash the new password
      updateData.password = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);
    }

    // Check if there's actually anything to update
    if (Object.keys(updateData).length === 0) {
        return { status: 200, message: "No changes detected", data: this.mapUserToProfileData(user) };
    }

    try {
        const updatedUser = await this.prisma.user.update({
          where: { id: userId },
          data: updateData,
        });

        // Return only safe profile data
        return { status: 200, message: "Profile updated successfully", data: this.mapUserToProfileData(updatedUser) };

    } catch (error) {
        console.error("Error updating profile:", error);
        // Consider more specific error handling (e.g., Prisma known errors)
        return { status: 500, message: "Failed to update profile due to a server error" };
    }
  }

  // Helper to select only the data safe to return
  private mapUserToProfileData(user: User) {
      const baseUrl = process.env.API_URL || 'http://localhost:5000';
      return {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          roles: user.roles,
          createdAt: user.createdAt,
          profilePicture: user.profilePicture,
          profilePictureUrl: user.profilePicture 
            ? `${baseUrl}/api/v1/uploads/profiles/${user.profilePicture}` 
            : null
      };
  }
}
export default new UserService();
