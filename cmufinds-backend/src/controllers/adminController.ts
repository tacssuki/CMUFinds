import { Request, Response } from "express";
import AdminService from "../services/adminService";
import { PostType, PostStatus, ReportStatus } from '@prisma/client';
import adminServiceInstance from "../services/adminService"; // Corrected import if needed
import reportServiceInstance from "../services/reportService";

class AdminController {
  public async listUsers(req: Request, res: Response) {
    const { page, limit } = req.query as any;
    const data = await AdminService.listUsers(+page||1, +limit||20);
    res.json(data);
  }

  public async updateUserRoles(req: Request, res: Response) {
    const { id } = req.params;
    const { roles } = req.body;
    const user = await AdminService.updateUserRoles(id, roles);
    res.json(user);
  }

  public async updateUserProfile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const profileData = req.body; // Assuming body contains name, email etc.
      const result = await AdminService.updateUserProfile(id, profileData);
      res.status(result.status).json(result);
    } catch (error) {
      console.error("[ADMIN UPDATE USER PROFILE ERROR]", error);
      res.status(500).json({ message: "Internal Server Error updating profile" });
    }
  }

  public async resetUserPassword(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await AdminService.resetUserPassword(id);
      res.status(result.status).json(result);
    } catch (error) {
      console.error("[ADMIN RESET USER PASSWORD ERROR]", error);
      res.status(500).json({ message: "Internal Server Error resetting password" });
    }
  }

  public async deactivateUser(req: Request, res: Response) {
    const { id } = req.params;
    await AdminService.deactivateUser(id);
    res.status(204).send();
  }

  public async restoreUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await AdminService.restoreUser(id);
      res.status(result.status).json(result);
    } catch (error) {
      console.error("[ADMIN RESTORE USER ERROR]", error);
      res.status(500).json({ message: "Internal Server Error restoring user" });
    }
  }

  public async listReports(req: Request, res: Response) {
    const { page, limit } = req.query as any;
    const data = await AdminService.listReports(+page||1, +limit||20);
    res.json(data);
  }

  public async resolveReport(req: Request, res: Response) {
    const { id } = req.params;
    const { status, adminNotes } = req.body as { status: ReportStatus; adminNotes?: string };
    const adminUserId = req.user!.userId;
    
    const result = await reportServiceInstance.updateReportStatus(id, status, adminNotes, adminUserId);
    res.status(result.status).json(result);
  }

  public async updatePost(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      // TODO: Add validation for updateData
      const result = await AdminService.updatePost(id, updateData);
      res.status(result.status).json(result);
    } catch (error) {
      console.error(`[ADMIN UPDATE POST ERROR - ID: ${req.params.id}]`, error);
      res.status(500).json({ message: "Internal Server Error updating post" });
    }
  }

  public async updatePostStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const statusData = req.body; // Expecting { status: "NEW_STATUS" }
      // TODO: Add validation for statusData
      const result = await AdminService.updatePostStatus(id, statusData);
      res.status(result.status).json(result);
    } catch (error) {
       console.error(`[ADMIN UPDATE POST STATUS ERROR - ID: ${req.params.id}]`, error);
       res.status(500).json({ message: "Internal Server Error updating post status" });
    }
  }

  public async deletePost(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await AdminService.deletePost(id); // Soft delete
      res.status(result.status).json(result);
    } catch (error) {
       console.error(`[ADMIN DELETE POST ERROR - ID: ${req.params.id}]`, error);
       res.status(500).json({ message: "Internal Server Error deleting post" });
    }
  }

  public async restorePost(req: Request, res: Response) {
     try {
      const { id } = req.params;
      const result = await AdminService.restorePost(id);
      res.status(result.status).json(result);
    } catch (error) {
       console.error(`[ADMIN RESTORE POST ERROR - ID: ${req.params.id}]`, error);
       res.status(500).json({ message: "Internal Server Error restoring post" });
    }
  }

  public async getPotentialMatches(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await AdminService.getPotentialMatches(id);
      res.status(result.status).json(result);
    } catch (error) {
       console.error(`[ADMIN GET POTENTIAL MATCHES ERROR - ID: ${req.params.id}]`, error);
       res.status(500).json({ message: "Internal Server Error getting potential matches" });
    }
  }

  public async listPostHistory(req: Request, res: Response) {
    try {
      const { page = "1", limit = "20" } = req.query as any;
      const result = await AdminService.listPostHistory(+page, +limit);
      res.status(result.status).json(result);
    } catch (error) {
       console.error(`[ADMIN LIST POST HISTORY ERROR]`, error);
       res.status(500).json({ message: "Internal Server Error listing post history" });
    }
  }

  public async listArchivedPosts(req: Request, res: Response) {
     try {
      const { page = "1", limit = "20" } = req.query as any;
      const result = await AdminService.listArchivedPosts(+page, +limit);
      res.status(result.status).json(result);
    } catch (error) {
       console.error(`[ADMIN LIST ARCHIVED POSTS ERROR]`, error);
       res.status(500).json({ message: "Internal Server Error listing archived posts" });
    }
  }

  public async getReportDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ message: "Report ID is required" });
      }
      const result = await AdminService.getReportDetails(id);
      res.status(result.status).json(result);
    } catch (error) {
      console.error(`[ADMIN GET REPORT DETAILS ERROR - ID: ${req.params.id}]`, error);
      res.status(500).json({ message: "Internal Server Error getting report details" });
    }
  }

  public async getStats(req: Request, res: Response) {
    const stats = await AdminService.getStats();
    res.json(stats);
  }

  public async listLogs(req: Request, res: Response) {
    const { page = "1", limit = "20" } = req.query as any;
    const data = await AdminService.getLogs(+page, +limit);
    res.json(data);
  }

  // Added: Handler for listing posts with filters
  public async listPosts(req: Request, res: Response) {
    try {
      // Extract and sanitize query parameters
      const { 
        page = "1", 
        limit = "10", 
        type, 
        status, 
        search, 
        includeDeleted = "false" 
      } = req.query;

      const params = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        type: type as PostType | undefined, // Cast to PostType or undefined
        status: status as PostStatus | undefined, // Cast to PostStatus or undefined
        search: search as string | undefined,
        includeDeleted: includeDeleted === "true"
      };
      
       // Add validation for params if necessary (e.g., check if type/status are valid enums)

      const result = await AdminService.listPosts(params);
      res.status(result.status).json(result);
    } catch (error) {
       console.error(`[ADMIN LIST POSTS ERROR]`, error);
       res.status(500).json({ message: "Internal Server Error listing posts" });
    }
  }

  /**
   * Get chat threads between two specific users (Admin only)
   */
  public async getThreadsBetweenUsers(req: Request, res: Response) {
    try {
      const { userId1, userId2 } = req.params;
      if (!userId1 || !userId2) {
        return res.status(400).json({ status: 400, message: "Both user IDs are required." });
      }

      const result = await adminServiceInstance.getThreadsBetweenUsers(userId1, userId2);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Error in AdminController getting threads between users:", error);
      // Avoid sending generic result object on unexpected errors
      return res.status(500).json({ status: 500, message: "Internal server error fetching chat threads." });
    }
  }

  /**
   * Get all messages for a specific thread (Admin only)
   */
  public async getMessagesForThread(req: Request, res: Response) {
    try {
      const { threadId } = req.params;
      if (!threadId) {
        return res.status(400).json({ status: 400, message: "Thread ID is required." });
      }

      // TODO: Add validation to ensure threadId is a valid UUID

      const result = await adminServiceInstance.getMessagesForThread(threadId);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Error in AdminController getting messages for thread:", error);
      return res.status(500).json({ status: 500, message: "Internal server error fetching messages." });
    }
  }

}

export default new AdminController();
