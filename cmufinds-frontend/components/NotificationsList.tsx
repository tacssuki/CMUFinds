"use client";

import { useState, useEffect } from "react";
import { notificationAPI } from "@/lib/api";
import { Bell, Check, Trash, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Notification {
  id: string;
  type: string;
  text: string;
  read: boolean;
  createdAt: string;
  metadata?: any;
}

export default function NotificationsList() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await notificationAPI.getNotifications();
      setNotifications(response.data.data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast({
        title: "Error",
        description: "Could not load notifications. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    setActionInProgress(id);
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === id ? { ...notification, read: true } : notification
        )
      );
      toast({
        title: "Notification marked as read",
        description: "The notification has been marked as read.",
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast({
        title: "Error",
        description: "Could not update notification status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const markAllAsRead = async () => {
    setActionInProgress("all");
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({
          ...notification,
          read: true
        }))
      );
      toast({
        title: "All notifications marked as read",
        description: "All notifications have been marked as read.",
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast({
        title: "Error",
        description: "Could not update notifications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const deleteNotification = async (id: string) => {
    setActionInProgress(id + "-delete");
    try {
      await notificationAPI.deleteNotification(id);
      setNotifications(prevNotifications =>
        prevNotifications.filter(notification => notification.id !== id)
      );
      toast({
        title: "Notification deleted",
        description: "The notification has been deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast({
        title: "Error",
        description: "Could not delete notification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading notifications...</span>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-10 border rounded-lg bg-background shadow-sm">
        <Bell className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <h3 className="mt-2 text-lg font-medium text-primary">No notifications</h3>
        <p className="text-muted-foreground">You don't have any notifications yet.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-background shadow-sm">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold text-primary">Notifications</h2>
        <button
          onClick={markAllAsRead}
          disabled={actionInProgress === "all" || notifications.every(n => n.read)}
          className={`text-sm text-primary hover:text-primary/80 transition-colors ${
            (actionInProgress === "all" || notifications.every(n => n.read)) ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {actionInProgress === "all" ? (
            <span className="flex items-center">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Processing...
            </span>
          ) : (
            "Mark all as read"
          )}
        </button>
      </div>

      <ul className="divide-y">
        {notifications.map((notification) => (
          <li
            key={notification.id}
            className={`p-4 flex items-start gap-3 ${!notification.read ? "bg-primary/5" : ""}`}
          >
            <div className="flex-shrink-0">
              <Bell className={`h-5 w-5 ${!notification.read ? "text-primary" : "text-muted-foreground/50"}`} />
            </div>
            <div className="flex-grow min-w-0">
              <p className="text-sm">{notification.text}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(notification.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex space-x-2 flex-shrink-0">
              {!notification.read && (
                <button
                  onClick={() => markAsRead(notification.id)}
                  disabled={actionInProgress === notification.id}
                  className="text-primary hover:text-primary/80 p-1 transition-colors"
                  title="Mark as read"
                >
                  {actionInProgress === notification.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </button>
              )}
              <button
                onClick={() => deleteNotification(notification.id)}
                disabled={actionInProgress === notification.id + "-delete"}
                className="text-destructive hover:text-destructive/80 p-1 transition-colors"
                title="Delete notification"
              >
                {actionInProgress === notification.id + "-delete" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash className="h-4 w-4" />
                )}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
} 