import express from "express";
import TokenVerifier from "../middleware/validateTokens";
import NotificationController from "../controllers/notificationController";
import { validate } from "../middleware/validationMiddleware";
import ValidationService from "../services/validationService";

const router = express.Router();

router.get(
  "/",
  TokenVerifier.verifyAuth,
  validate(ValidationService.listNotificationsSchema),
  async (req, res, next) => {
    try { await NotificationController.getNotifications(req, res); }
    catch (e) { next(e); }
  }
);

router.patch(
  "/:id/read",
  TokenVerifier.verifyAuth,
  validate(ValidationService.notificationIdParamSchema),
  async (req, res, next) => {
    try { await NotificationController.markAsRead(req, res); }
    catch (e) { next(e); }
  }
);

router.patch(
  "/read-all",
  TokenVerifier.verifyAuth,
  async (req, res, next) => {
    try { await NotificationController.markAllAsRead(req, res); }
    catch (e) { next(e); }
  }
);

router.delete(
  "/:id",
  TokenVerifier.verifyAuth,
  validate(ValidationService.notificationIdParamSchema),
  async (req, res, next) => {
    try { await NotificationController.deleteNotification(req, res); }
    catch (e) { next(e); }
  }
);

export default router;
