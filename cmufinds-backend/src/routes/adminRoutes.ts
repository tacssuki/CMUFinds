import express, { Request, Response, NextFunction } from 'express';
import TokenVerifier from '../middleware/validateTokens';
import adminControllerInstance from '../controllers/adminController';
import { validate } from "../middleware/validationMiddleware";
import ValidationService from "../services/validationService";
import { Role } from '@prisma/client';
import { z } from 'zod';
// Placeholder for potentially needed controllers
// import PostController from '../controllers/postController'; 

// Helper to wrap async route handlers and catch errors
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next); 
  };

// Define a specific validation schema for threadId param
const threadIdParamSchema = ValidationService.idParamSchema.extend({
  params: z.object({
    threadId: z.string().uuid("Invalid Thread ID format"),
  })
});

const adminRouter = express.Router();

// Use correct middleware static methods from the imported class
adminRouter.use(TokenVerifier.verifyAuth, TokenVerifier.verifyAdmin);

// === User Management ===
adminRouter.get('/users', validate(ValidationService.listUsersAdminSchema), asyncHandler(adminControllerInstance.listUsers));
adminRouter.put('/users/:id/roles', validate(ValidationService.updateUserRolesSchema), asyncHandler(adminControllerInstance.updateUserRoles));
adminRouter.put('/users/:id/profile', validate(ValidationService.adminUpdateUserProfileSchema), asyncHandler(adminControllerInstance.updateUserProfile));
adminRouter.delete('/users/:id', validate(ValidationService.idParamSchema), asyncHandler(adminControllerInstance.deactivateUser));
adminRouter.post('/users/:id/restore', validate(ValidationService.idParamSchema), asyncHandler(adminControllerInstance.restoreUser));
adminRouter.post('/users/:id/reset-password', validate(ValidationService.idParamSchema), asyncHandler(adminControllerInstance.resetUserPassword));

// === Posts Management ===
adminRouter.get('/posts', validate(ValidationService.adminListPostsSchema), asyncHandler(adminControllerInstance.listPosts));
adminRouter.get('/posts/history', validate(ValidationService.adminListPostHistorySchema), asyncHandler(adminControllerInstance.listPostHistory));
adminRouter.get('/posts/archived', validate(ValidationService.adminListArchivedPostsSchema), asyncHandler(adminControllerInstance.listArchivedPosts));
adminRouter.put('/posts/:id', validate(ValidationService.adminUpdatePostSchema), asyncHandler(adminControllerInstance.updatePost));
adminRouter.patch('/posts/:id/status', validate(ValidationService.adminUpdatePostStatusSchema), asyncHandler(adminControllerInstance.updatePostStatus));
adminRouter.delete('/posts/:id', validate(ValidationService.idParamSchema), asyncHandler(adminControllerInstance.deletePost));
adminRouter.post('/posts/:id/restore', validate(ValidationService.idParamSchema), asyncHandler(adminControllerInstance.restorePost));
adminRouter.get('/posts/:id/potential-matches', validate(ValidationService.idParamSchema), asyncHandler(adminControllerInstance.getPotentialMatches));

// === Reports Management ===
adminRouter.get('/reports', validate(ValidationService.listAllReportsSchema), asyncHandler(adminControllerInstance.listReports));
adminRouter.get('/reports/:id', validate(ValidationService.reportIdParamSchema), asyncHandler(adminControllerInstance.getReportDetails));
adminRouter.patch('/reports/:id/resolve', validate(ValidationService.updateReportStatusSchema), asyncHandler(adminControllerInstance.resolveReport));

// === System Analytics ===
adminRouter.get('/stats', asyncHandler(adminControllerInstance.getStats));

// === Audit Logs ===
adminRouter.get('/logs', validate(ValidationService.listLogsSchema), asyncHandler(adminControllerInstance.listLogs));

// === Chat Management (Admin) ===
adminRouter.get(
  '/chats/users/:userId1/:userId2', 
  // TODO: Add validation for UUIDs in params if needed
  asyncHandler(adminControllerInstance.getThreadsBetweenUsers)
);

// Added: Route to get all messages for a specific thread
adminRouter.get(
  '/chats/threads/:threadId/messages',
  validate(threadIdParamSchema), // Validate threadId param
  asyncHandler(adminControllerInstance.getMessagesForThread)
);

export default adminRouter;