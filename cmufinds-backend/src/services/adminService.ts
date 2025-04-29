import PrismaService from "./prismaService";
import { Role, Prisma, PostStatus, PostType, ReportStatus, ReportType } from "@prisma/client";
import bcrypt from 'bcryptjs';
import NotificationService from "./notificationService";

export type AuditLogEntry = {
  id: string;
  userId: string;
  username: string;
  action: string;
  timestamp: Date;
  ipAddress: string;
  logType: "USER" | "ADMIN" | "DEVELOPER";
  roles: Role[];
};

class AdminService {
  private prisma = PrismaService.getClient();

  /** USERS & ROLES */
  public async listUsers(page = 1, limit = 20, includeDeleted = false) {
    const skip = (page - 1) * limit;
    
    const whereClause: Prisma.UserWhereInput = {};
    if (!includeDeleted) {
      whereClause.deletedAt = null;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          roles: true,
          createdAt: true,
          ipAddress: true,
          deletedAt: true,
        },
      }),
      this.prisma.user.count({ where: whereClause }),
    ]);
    return { users, total, page, limit };
  }

  public async updateUserRoles(userId: string, roles: Role[]) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: { set: roles },
      },
      select: { id: true, roles: true },
    });
    return user;
  }

  public async updateUserProfile(userId: string, profileData: { name?: string; email?: string; username?: string }) {
    try {
      if (!profileData || Object.keys(profileData).length === 0) {
        return { status: 400, message: "No profile data provided" };
      }

      const updatePayload: Prisma.UserUpdateInput = {};
      if (profileData.name) updatePayload.name = profileData.name;
      if (profileData.email) updatePayload.email = profileData.email;

      if (Object.keys(updatePayload).length === 0) {
        return { status: 400, message: "No valid fields to update" };
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updatePayload,
        select: { id: true, name: true, email: true, username: true }
      });

      return { status: 200, message: "Profile updated successfully", user: updatedUser };
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return { status: 409, message: `Update failed: ${error.meta?.target} must be unique.` };
        }
      }
      console.error("Error updating user profile:", error);
      return { status: 500, message: "Internal server error updating profile" };
    }
  }

  public async resetUserPassword(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
      if (!user) {
        return { status: 404, message: "User not found" };
      }

      const defaultPassword = user.username;
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return { status: 200, message: `Password reset to default (${defaultPassword}) successfully.` };
    } catch (error) {
      console.error("Error resetting user password:", error);
      return { status: 500, message: "Internal server error resetting password" };
    }
  }

  public async restoreUser(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return { status: 404, message: "User not found" };
      }
      if (!user.deletedAt) {
        return { status: 400, message: "User is already active" };
      }
      
      await this.prisma.user.update({
        where: { id: userId },
        data: { deletedAt: null },
      });
      return { status: 200, message: "User restored successfully" };
    } catch (error) {
       console.error("Error restoring user:", error);
       return { status: 500, message: "Internal server error restoring user" };
    }
  }

  public async deactivateUser(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return { status: 404, message: "User not found" };
      }
      
    await this.prisma.user.update({
      where: { id: userId },
        data: { deletedAt: new Date(), roles: { set: [] } }, 
    });
      return { status: 200, message: "User deactivated successfully" };
    } catch (error) {
       console.error("Error deactivating user:", error);
       return { status: 500, message: "Internal server error deactivating user" };
    }
  }

  /** REPORT HANDLING */
  public async listReports(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.report.count(),
    ]);
    return { reports, total, page, limit };
  }

  public async resolveReport(reportId: string, status: ReportStatus, adminNotes?: string, adminUserId?: string) {
    try {
      const updatedReport = await this.prisma.report.update({
        where: { id: reportId },
        data: { 
          status: status,
          adminNotes: adminNotes,
          resolvedAt: new Date()
        },
      });
      
      if (adminUserId) {
        try {
           const adminUser = await this.prisma.user.findUnique({ where: { id: adminUserId }, select: { username: true } });
           await this.prisma.userLog.create({
             data: {
               userId: adminUserId,
               username: adminUser?.username || 'UnknownAdmin',
               action: `ADMIN_RESOLVE_REPORT_${reportId}_TO_${status}`,
               ipAddress: "system"
             }
           });
        } catch (logError) {
           console.error("Failed to create admin log for report resolution:", logError);
        }
      }

      if (status === ReportStatus.ACTION_TAKEN) {
        const report = await this.prisma.report.findUnique({ 
      where: { id: reportId },
            select: { type: true, reportedPostId: true, reportedUserId: true } 
        });
        if (report?.type === ReportType.POST && report.reportedPostId) {
          await this.prisma.post.update({ where: { id: report.reportedPostId }, data: { deletedAt: new Date() } });
          console.log(`Admin action: Soft-deleted post ${report.reportedPostId} due to report ${reportId}`);
        } else if (report?.type === ReportType.USER && report.reportedUserId) {
           await this.prisma.user.update({ where: { id: report.reportedUserId }, data: { isSuspended: true } });
           console.log(`Admin action: Suspended user ${report.reportedUserId} due to report ${reportId}`);
        }
      }

      return { status: 200, message: `Report ${reportId} resolved to ${status}.`, data: updatedReport };
    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
          return { status: 404, message: `Report with ID ${reportId} not found.` };
        }
        console.error(`Error resolving report ${reportId}:`, error);
        return { status: 500, message: "Internal server error resolving report." };
    }
  }

  public async getReportDetails(reportId: string) {
    try {
      const report = await this.prisma.report.findUnique({
        where: { id: reportId },
        include: {
          reporter: {
            select: { id: true, username: true, name: true }
          },
          reportedPost: { 
             select: { id: true, title: true, description: true, userId: true, user: { select: { username: true } } }
          },
          reportedUser: {
            select: { id: true, username: true, name: true, isSuspended: true }
          }
        }
      });

      if (!report) {
        return { status: 404, message: "Report not found" };
      }

      return { status: 200, data: report };
    } catch (error) {
      console.error(`Error fetching report details for ID ${reportId}:`, error);
      return { status: 500, message: "Internal server error fetching report details" };
    }
  }

  /** STATISTICS */
  public async getStats() {
    const [
      totalUsers,
      totalPosts,
      lostCount,
      foundCount,
      matchedCount,
      resolvedCount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.post.count(),
      this.prisma.post.count({ where: { type: "LOST" } }),
      this.prisma.post.count({ where: { type: "FOUND" } }),
      this.prisma.post.count({ where: { status: "MATCHED" } }),
      this.prisma.post.count({ where: { status: "RESOLVED" } }),
    ]);
    return {
      totalUsers,
      totalPosts,
      lostCount,
      foundCount,
      matchedCount,
      resolvedCount,
    };
  }

  /** AUDIT LOGS */
  public async getLogs(
    page = 1,
    limit = 20,
    filters: { 
      username?: string; 
      action?: string; 
      startDate?: string; 
      endDate?: string; 
      role?: string;
    } = {}
  ): Promise<{ logs: AuditLogEntry[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    
    const where: Prisma.UserLogWhereInput = {};

    if (filters.username) {
      where.username = { contains: filters.username, mode: 'insensitive' };
    }
    if (filters.action) {
      where.action = { contains: filters.action, mode: 'insensitive' };
    }
    
    let timestampFilter: Prisma.DateTimeFilter | undefined = undefined;

    if (filters.startDate) {
      try {
        if (!timestampFilter) {
          timestampFilter = {};
        }
        timestampFilter.gte = new Date(filters.startDate);
      } catch (e) { console.error("Invalid startDate for logs filter:", filters.startDate); }
    }
    if (filters.endDate) {
      try {
        const endDate = new Date(filters.endDate);
        endDate.setDate(endDate.getDate() + 1);
         if (!timestampFilter) {
          timestampFilter = {};
        }
        timestampFilter.lt = endDate;
      } catch (e) { console.error("Invalid endDate for logs filter:", filters.endDate); }
    }

    if (timestampFilter) {
      where.timestamp = timestampFilter;
    }
    
     if (filters.role) {
      const rolePrefix = filters.role.toUpperCase();
      if (rolePrefix === 'USER') {
        where.NOT = [
          { action: { startsWith: 'ADMIN_' } },
          { action: { startsWith: 'DEVELOPER_' } }
        ];
      } else if (rolePrefix === 'ADMIN' || rolePrefix === 'DEVELOPER') {
         where.action = { startsWith: `${rolePrefix}_` };
      }
    }

    const [userLogs, total] = await this.prisma.$transaction([
       this.prisma.userLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: { user: { select: { roles: true, id: true } } }
       }),
       this.prisma.userLog.count({ where })
    ]);
    
    const formattedLogs = userLogs.map((l) => {
       let logType: AuditLogEntry['logType'] = 'USER';
       if (l.action.startsWith('ADMIN_')) logType = 'ADMIN';
       else if (l.action.startsWith('DEVELOPER_')) logType = 'DEVELOPER';
       
       return {
      id: l.id,
      userId: l.userId,
      username: l.username,
      action: l.action,
      timestamp: l.timestamp,
      ipAddress: l.ipAddress,
        logType: logType,
        roles: l.user?.roles || []
       };
    }) satisfies AuditLogEntry[];
    
    return { logs: formattedLogs, total, page, limit };
  }

  /** POSTS MANAGEMENT (Admin Service) */
  public async updatePost(postId: string, updateData: Prisma.PostUpdateInput) {
    try {
       const post = await this.prisma.post.findUnique({ where: { id: postId } });
       if (!post || post.deletedAt) {
         return { status: 404, message: "Post not found or has been deleted" };
       }
       
       delete (updateData as any).userId; 
       delete (updateData as any).id;

       const updatedPost = await this.prisma.post.update({
        where: { id: postId },
        data: updateData, 
       });
       return { status: 200, message: "Post updated successfully by admin", post: updatedPost };
    } catch (error: any) {
       if (error instanceof Prisma.PrismaClientKnownRequestError) {
         // Add specific error handling if needed
       }
       console.error(`Error updating post ${postId} by admin:`, error);
       return { status: 500, message: "Internal server error updating post" };
    }
  }
  
  public async updatePostStatus(postId: string, statusData: { status: string }) { 
    try {
      const validStatuses = Object.values(PostStatus);
      if (!validStatuses.includes(statusData.status as PostStatus)) {
        return { status: 400, message: `Invalid status provided. Valid statuses are: ${validStatuses.join(', ')}` };
      }
      
      const post = await this.prisma.post.findUnique({ where: { id: postId } });
      if (!post || post.deletedAt) {
        return { status: 404, message: "Post not found or has been deleted" };
      }

      const updatedPost = await this.prisma.post.update({
        where: { id: postId },
        data: { status: statusData.status as PostStatus }, 
      });
      return { status: 200, message: "Post status updated successfully by admin", post: updatedPost };
    } catch (error) {
       console.error(`Error updating status for post ${postId} by admin:`, error);
       return { status: 500, message: "Internal server error updating post status" };
    }
  }
  
  public async deletePost(postId: string) {
    try {
      const post = await this.prisma.post.findUnique({ where: { id: postId } });
      if (!post || post.deletedAt) { 
        return { status: 404, message: "Post not found or already deleted" };
      }
      
      await this.prisma.post.update({
        where: { id: postId },
        data: { deletedAt: new Date() },
      });
      return { status: 200, message: "Post deleted successfully" };
    } catch (error) {
       console.error(`Error deleting post ${postId}:`, error);
       return { status: 500, message: "Internal server error deleting post" };
    }
  }

  public async restorePost(postId: string) {
    try {
      const post = await this.prisma.post.findUnique({ where: { id: postId } });
      if (!post) { 
        return { status: 404, message: "Post not found" };
      }
      if (!post.deletedAt) {
        return { status: 400, message: "Post is not deleted" };
      }
      
      await this.prisma.post.update({
        where: { id: postId },
        data: { deletedAt: null },
      });
      return { status: 200, message: "Post restored successfully" };
    } catch (error) {
       console.error(`Error restoring post ${postId}:`, error);
       return { status: 500, message: "Internal server error restoring post" };
    }
  }

  public async getPotentialMatches(postId: string) {
    try {
      const currentPost = await this.prisma.post.findUnique({ 
        where: { id: postId, deletedAt: null },
        select: { type: true, category: true, location: true, createdAt: true, id: true } 
      });

      if (!currentPost) {
        return { status: 404, message: "Original post not found or has been deleted" };
      }

      const oppositeType = currentPost.type === PostType.LOST ? PostType.FOUND : PostType.LOST;
      
      const potentialMatches = await this.prisma.post.findMany({
        where: {
          id: { not: postId },
          type: oppositeType,
          status: PostStatus.PENDING,
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          location: true,
          category: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 20
      });

      return { status: 200, message: "Potential matches fetched successfully", potentialMatches };

    } catch (error) {
      console.error(`Error finding potential matches for post ${postId}:`, error);
      return { status: 500, message: "Internal server error finding potential matches", potentialMatches: [] };
    }
  }

  /** POST HISTORY */
  public async listPostHistory(page = 1, limit = 20 /*, filters?: any */) {
    try {
    const skip = (page - 1) * limit;
      const where: Prisma.PostHistoryWhereInput = {};
      
      const [history, total] = await this.prisma.$transaction([
        this.prisma.postHistory.findMany({
          where,
          skip,
          take: limit,
          orderBy: { timestamp: 'desc' },
        }),
        this.prisma.postHistory.count({ where })
      ]);

      return {
        status: 200,
        data: {
          history,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error listing post history:", error);
      return { status: 500, message: "Internal server error listing post history" };
    }
  }
  
  /** ARCHIVED POSTS */
  public async listArchivedPosts(page = 1, limit = 20 /*, filters?: any */) {
     try {
      const skip = (page - 1) * limit;
      const where: Prisma.ArchivePostWhereInput = {};

      const [archived, total] = await this.prisma.$transaction([
        this.prisma.archivePost.findMany({
          where,
          skip,
          take: limit,
          orderBy: { archivedAt: 'desc' },
        }),
        this.prisma.archivePost.count({ where })
      ]);

      return {
        status: 200,
        data: {
          archivedPosts: archived,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error listing archived posts:", error);
      return { status: 500, message: "Internal server error listing archived posts" };
    }
  }

  public async listPosts(params: { 
    page?: number; 
    limit?: number; 
    type?: PostType; 
    status?: PostStatus;
    search?: string; 
    includeDeleted?: boolean 
  }) {
    const { 
      page = 1, 
      limit = 10, 
      type, 
      status, 
      search, 
      includeDeleted = false 
    } = params;
    
    const skip = (page - 1) * limit;
    const whereClause: Prisma.PostWhereInput = {};

    if (!includeDeleted) {
      whereClause.deletedAt = null;
    }
    
    if (type) {
      whereClause.type = type;
    }

    if (status) {
       whereClause.status = status; 
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    try {
      const [posts, totalPosts] = await this.prisma.$transaction([
        this.prisma.post.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, username: true },
            },
          },
        }),
        this.prisma.post.count({ where: whereClause }),
      ]);

      return {
        status: 200,
        data: {
          posts,
          totalPosts,
          page,
          limit,
          totalPages: Math.ceil(totalPosts / limit),
        },
      };
    } catch (error) {
      console.error("Error listing posts for admin:", error);
      return { status: 500, message: "Internal server error listing posts" };
    }
  }

  /** CHAT MANAGEMENT (Admin) */
  public async getThreadsBetweenUsers(userId1: string, userId2: string) {
    try {
      const threads = await this.prisma.thread.findMany({
        where: {
          AND: [
            { participants: { some: { userId: userId1 } } },
            { participants: { some: { userId: userId2 } } },
          ],
        },
        include: {
          participants: {
            include: {
              user: { select: { id: true, name: true, username: true } },
            },
          },
          post: { select: { id: true, title: true } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { text: true, createdAt: true, sender: { select: { user: { select: { name: true } } } } }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!threads || threads.length === 0) {
        return { status: 404, message: "No chat threads found between these users." };
      }

      return { status: 200, data: threads };
    } catch (error) {
      console.error(`Error fetching threads between users ${userId1} and ${userId2}:`, error);
      return { status: 500, message: "Internal server error fetching chat threads." };
    }
  }

  public async getMessagesForThread(threadId: string) {
    try {
      const messages = await this.prisma.message.findMany({
        where: {
          threadId: threadId,
        },
        include: {
          sender: {
            include: {
              user: {
                select: { id: true, name: true, username: true, profilePicture: true } 
              }
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      return { status: 200, data: messages };
    } catch (error) {
      console.error(`Error fetching messages for thread ${threadId}:`, error);
      return { status: 500, message: "Internal server error fetching messages." };
    }
  }
}

export default new AdminService();
