import express, { Request, Response, NextFunction } from "express";
import TokenVerifier from "../middleware/validateTokens";
import ChatController from "../controllers/chatController";
import RateLimiter from "../middleware/rateLimit";
import { validate } from "../middleware/validationMiddleware";
import ValidationService from "../services/validationService";

const router = express.Router();

router.post(
  "/thread",
  TokenVerifier.verifyAuth,
  validate(ValidationService.createThreadSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try { await ChatController.thread(req, res); }
    catch (e) { next(e); }
  }
);

router.get(
  "/threads",
  TokenVerifier.verifyAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try { await ChatController.getThreads(req, res); }
    catch (e) { next(e); }
  }
);

router.get(
  "/:threadId/messages",
  TokenVerifier.verifyAuth,
  validate(ValidationService.getMessagesSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try { await ChatController.messages(req, res); }
    catch (e) { next(e); }
  }
);

router.post(
  "/:threadId/messages",
  TokenVerifier.verifyAuth,
  RateLimiter.chatLimiter,
  validate(ValidationService.sendMessageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try { await ChatController.send(req, res); }
    catch (e) { next(e); }
  }
);

router.get(
  "/:threadId/export",
  TokenVerifier.verifyAuth,
  validate(ValidationService.threadIdParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try { await ChatController.exportPDF(req, res); }
    catch (e) { next(e); }
  }
);

export default router;
