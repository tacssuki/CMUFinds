import { Request, Response } from "express";
import reportServiceInstance from "../services/reportService";

class ReportController {
  /**
   * Create a new report
   */
  public async createReport(req: Request, res: Response) {
    try {
      const reporterId = req.user!.userId;
      const { type, reason, description, reportedPostId, reportedUserId } = req.body;
      
      const result = await reportServiceInstance.createReport(
        reporterId,
        type,
        reason,
        description,
        reportedPostId,
        reportedUserId
      );
      
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Error creating report:", error);
      return res.status(500).json({ status: 500, message: "Failed to create report" });
    }
  }
  
  /**
   * Get reports (admin only)
   */
  public async getReports(req: Request, res: Response) {
    try {
      const { type, status, page, limit } = req.query as any;
      
      const result = await reportServiceInstance.getReports(
        type, 
        status, 
        page, 
        limit
      );
      
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Error getting reports:", error);
      return res.status(500).json({ status: 500, message: "Failed to get reports" });
    }
  }
  
  /**
   * Get user's own reports
   */
  public async getMyReports(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { page, limit } = req.query as any;
      
      const result = await reportServiceInstance.getMyReports(userId, page, limit);
      
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Error getting user reports:", error);
      return res.status(500).json({ status: 500, message: "Failed to get your reports" });
    }
  }
  
  /**
   * Get a report by ID (admin only)
   */
  public async getReportById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const result = await reportServiceInstance.getReportById(id);
      
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Error getting report:", error);
      return res.status(500).json({ status: 500, message: "Failed to get report" });
    }
  }
  
  /**
   * Update report status (admin only)
   */
  public async updateReportStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, adminNotes } = req.body;
      const adminUserId = req.user!.userId;
      
      const result = await reportServiceInstance.updateReportStatus(id, status, adminNotes, adminUserId);
      
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("Error updating report status:", error);
      return res.status(500).json({ status: 500, message: "Failed to update report status" });
    }
  }
}

export default new ReportController();
