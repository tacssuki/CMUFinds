import PrismaService from "./prismaService";
import { ReportStatus, ReportType, ReportReason, Prisma } from "@prisma/client";

class ReportService {
  private prisma = PrismaService.getClient();

  /**
   * Create a new report
   */
  public async createReport(
    reporterId: string,
    type: ReportType,
    reason: ReportReason,
    description?: string,
    reportedPostId?: string,
    reportedUserId?: string
  ) {
    try {
      // Validate that exactly one entity ID is provided
      if ((!reportedPostId && !reportedUserId) || (reportedPostId && reportedUserId)) {
        return { status: 400, message: "Must provide either reportedPostId OR reportedUserId" };
      }
      
      // Validate based on type
      if (type === ReportType.POST && !reportedPostId) {
        return { status: 400, message: "Post ID is required for post reports" };
      }
      if (type === ReportType.USER && !reportedUserId) {
        return { status: 400, message: "User ID is required for user reports" };
      }
      
      // Create the report
      const report = await this.prisma.report.create({
        data: {
          reporterId,
          type,
          reason,
          description,
          reportedPostId,
          reportedUserId,
          status: ReportStatus.PENDING
        }
      });
      
      // TODO: Optionally notify admins via notification/socket?
      
      return { 
        status: 201, 
        message: "Report submitted successfully.", 
        data: report 
      };
    } catch (error) {
      console.error("Error creating report:", error);
      // Check for specific Prisma errors (e.g., foreign key violation if IDs are wrong)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
         return { status: 400, message: "Invalid reported user or post ID." };
      }
      return { status: 500, message: "Failed to submit report due to a server error." };
    }
  }
  
  /**
   * Get reports with pagination and filtering (for Admin)
   */
  public async getReports(
    type?: ReportType,
    status?: ReportStatus,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;
      
      // Build where clause
      const where: Prisma.ReportWhereInput = {}; // Use Prisma type for safety
      if (type) {
        where.type = type;
      }
      if (status) {
        where.status = status;
      }
      
      const [reports, total] = await this.prisma.$transaction([
         this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
             reporter: { select: { id: true, name: true, username: true } },
             reportedPost: { 
            select: {
              id: true,
              title: true,
                 user: { select: { name: true, id: true } }
               } 
             }, 
             reportedUser: { select: { id: true, name: true, username: true } }
        }
         }),
         this.prisma.report.count({ where })
      ]);
      
      return {
        status: 200,
        data: reports,
        meta: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error("Error getting reports:", error);
      return { 
        status: 500,
        message: "Failed to retrieve reports.",
        data: [],
        meta: { total: 0, page, limit, pages: 0 }
      };
    }
  }
  
  /**
   * Get a specific report by ID (for Admin)
   */
  public async getReportById(id: string) {
    try {
      const report = await this.prisma.report.findUnique({
        where: { id },
        include: {
          reporter: { select: { id: true, name: true, username: true } },
          reportedPost: { // Include more details for context
            select: {
              id: true,
              title: true,
              description: true,
              userId: true, // Post owner ID
              user: { select: { name: true, username: true } } // Post owner name
            } 
          },
          reportedUser: { // Include reported user details
                select: {
              id: true, 
                  name: true,
              username: true, 
              email: true, // Include email for admin review
              isSuspended: true, 
              deletedAt: true
            }
          }
        }
      });
      
      if (!report) {
         return { status: 404, message: "Report not found." };
      }
      
      return { status: 200, data: report };
    } catch (error) {
      console.error("Error getting report:", error);
      return { status: 500, message: "Failed to retrieve report details." };
    }
  }
  
  /**
   * Update report status and add admin notes (for Admin)
   */
  public async updateReportStatus(
    id: string,
    status: ReportStatus,
    adminNotes?: string,
    adminUserId?: string // Track which admin took action
  ) {
    try {
      // Use transaction to ensure atomicity if performing related actions
      const updatedReport = await this.prisma.$transaction(async (tx) => {
        const report = await tx.report.findUnique({ where: { id } });
      if (!report) {
           throw new Error('ReportNotFound'); // Throw error to be caught by outer catch
      }
      
        const updatedReport = await tx.report.update({
        where: { id },
          data: { 
            status, 
            adminNotes, 
            resolvedAt: new Date() // Mark as resolved now
          }
      });
      
        // Log the action (optional but recommended)
        if (adminUserId) {
          const adminUser = await tx.user.findUnique({ where: { id: adminUserId }});
          await tx.userLog.create({
        data: {
               userId: adminUserId,
               username: adminUser?.username || 'UnknownAdmin',
               action: `ADMIN_UPDATE_REPORT_${id}_STATUS_TO_${status}`,
          ipAddress: "system"
        }
      });
        }
      
        // TODO: Perform related actions based on status 
        // (e.g., soft-delete post, suspend user) here within the transaction
        if (status === ReportStatus.ACTION_TAKEN) {
          // Example: If it was a post report, maybe delete the post
          if (report.type === ReportType.POST && report.reportedPostId) {
             // Soft-delete the post
             await tx.post.update({
                 where: { id: report.reportedPostId },
                 data: { deletedAt: new Date() }
             });
             console.log(`Admin action: Soft-deleted post ${report.reportedPostId} due to report ${id}`);
      }
          // Example: If it was a user report, maybe suspend the user
          else if (report.type === ReportType.USER && report.reportedUserId) {
             // Suspend the user
             await tx.user.update({
                 where: { id: report.reportedUserId },
                 data: { isSuspended: true }
             });
             console.log(`Admin action: Suspended user ${report.reportedUserId} due to report ${id}`);
          }
        }
        
        // TODO: Notify reporter/reported user about resolution?

        return updatedReport;
      });
      
      return { 
        status: 200, 
        message: `Report status updated to ${status}.`, 
        data: updatedReport 
      };
    } catch (error: any) {
      console.error("Error updating report status:", error);
      if (error.message === 'ReportNotFound') {
         return { status: 404, message: "Report not found." };
      }
      return { status: 500, message: "Failed to update report status." };
    }
  }
  
  /**
   * Get reports made by a specific user
   */
  public async getMyReports(reporterId: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [reports, total] = await this.prisma.$transaction([
        this.prisma.report.findMany({
      where: { reporterId },
      orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: { // Include basic info about what was reported
            reportedPost: { select: { id: true, title: true } }, 
            reportedUser: { select: { id: true, name: true, username: true } } 
          }
        }),
        this.prisma.report.count({ where: { reporterId } })
      ]);
      
      return {
        status: 200,
        data: reports,
        meta: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error("Error getting user reports:", error);
      return {
        status: 500,
        message: "Failed to retrieve your reports.",
        data: [],
        meta: { total: 0, page, limit, pages: 0 }
      };
    }
  }
}

export default new ReportService();
