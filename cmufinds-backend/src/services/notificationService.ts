import { NotificationType } from "@prisma/client";
import PrismaService from "./prismaService";
import { getIO } from "./socketService";

class NotificationService {
  private prisma = PrismaService.getClient();

  /**
   * Get notifications for a user
   * @param userId User ID
   * @param unreadOnly Only get unread notifications
   */
  public async getNotifications(userId: string, unreadOnly: boolean = false) {
    try {
      // Build where conditions
      const whereConditions: any = { userId };
      if (unreadOnly) {
        whereConditions.isRead = false;
      }

      // Get notifications
      const notifications = await this.prisma.notification.findMany({
        where: whereConditions,
        orderBy: { createdAt: "desc" },
      });

      return notifications;
    } catch (error) {
      console.error("Error getting notifications:", error);
      return [];
    }
  }

  /**
   * Mark a notification as read
   * @param userId User ID
   * @param notificationId Notification ID
   */
  public async markAsRead(userId: string, notificationId: string) {
    try {
      // Make sure the notification belongs to the user
      const notification = await this.prisma.notification.findFirst({
        where: { id: notificationId, userId },
      });

      if (!notification) {
        return false;
      }

      // Update notification
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });

      return true;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }
  }

  /**
   * Mark all notifications as read
   * @param userId User ID
   */
  public async markAllAsRead(userId: string) {
    try {
      await this.prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });

      return true;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return false;
    }
  }

  /**
   * Create a notification
   * @param userId User ID
   * @param type Notification type
   * @param content Notification content text
   * @param metadata Additional metadata as JSON object (optional)
   */
  public async createNotification(
    userId: string,
    type: NotificationType,
    content: string,
    metadata?: Record<string, any>
  ) {
    try {
      // 1. Create notification in DB
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type,
          content,
          metadata: metadata || undefined
        },
      });

      // 2. Emit event via Socket.IO
      try {
         const io = getIO();
         // Emit to a room named after the user ID
         io.to(userId).emit('new_notification', notification);
         console.log(`Emitted 'new_notification' to user room: ${userId}`);
      } catch (socketError) {
          console.error(`Socket emit error in createNotification for user ${userId}:`, socketError);
          // Decide if failure to emit should affect the overall success
          // For now, just log the error and return the created notification
      }

      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      return null;
    }
  }

  /**
   * Delete a notification
   * @param userId User ID
   * @param notificationId Notification ID
   */
  public async deleteNotification(userId: string, notificationId: string) {
    try {
      // Make sure the notification belongs to the user
      const notification = await this.prisma.notification.findFirst({
        where: { id: notificationId, userId },
      });

      if (!notification) {
        return false;
      }

      await this.prisma.notification.delete({
        where: { id: notificationId },
      });

      return true;
    } catch (error) {
      console.error("Error deleting notification:", error);
      return false;
    }
  }
}

export default new NotificationService();
