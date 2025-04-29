import { Request, Response } from "express";
import NotificationService from "../services/notificationService";

class NotificationController {
  /** GET /notifications?unread=true|false */
  public async getNotifications(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const unreadOnly = req.query.unread === "true";
      const result = await NotificationService.getNotifications(userId, unreadOnly);
      return res.status(200).json(result);
    } catch (error) {
      console.error("[GET NOTIFICATIONS ERROR]", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  /** PATCH /notifications/:id/read */
  public async markAsRead(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const updated = await NotificationService.markAsRead(userId, id);
      if (!updated) return res.status(404).json({ message: "Notification not found or not yours" });
      return res.status(200).json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("[MARK NOTIFICATION AS READ ERROR]", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  /** PATCH /notifications/read-all */
  public async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const success = await NotificationService.markAllAsRead(userId);
      if (!success) {
        return res.status(500).json({ message: "Failed to mark notifications as read" });
      }
      return res.status(200).json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("[MARK ALL NOTIFICATIONS AS READ ERROR]", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  /** DELETE /notifications/:id */
  public async deleteNotification(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const deleted = await NotificationService.deleteNotification(userId, id);
      if (!deleted) return res.status(404).json({ message: "Notification not found or not yours" });
      return res.status(200).json({ message: "Notification deleted" });
    } catch (error) {
      console.error("[DELETE NOTIFICATION ERROR]", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
}

export default new NotificationController();
