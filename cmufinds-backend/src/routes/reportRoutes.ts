// src/routes/reportRoutes.ts
import express from "express";
import TokenVerifier from "../middleware/validateTokens";
import ReportController from "../controllers/reportController";
import { validate } from "../middleware/validationMiddleware";
import ValidationService from "../services/validationService";

const router = express.Router();

// Create a new report (requires authentication)
router.post(
  "/", 
  TokenVerifier.verifyAuth, 
  validate(ValidationService.createReportSchema),
  async (req, res, next) => {
    try {
      await ReportController.createReport(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Get user's own reports
router.get(
  "/my-reports", 
  TokenVerifier.verifyAuth, 
  validate(ValidationService.listMyReportsSchema),
  async (req, res, next) => {
    try {
      await ReportController.getMyReports(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Admin routes (require admin privileges)
router.get(
  "/all", 
  TokenVerifier.verifyAuth,
  TokenVerifier.verifyAdmin,
  validate(ValidationService.listAllReportsSchema),
  async (req, res, next) => {
    try {
      await ReportController.getReports(req, res);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:id", 
  TokenVerifier.verifyAuth,
  TokenVerifier.verifyAdmin, 
  validate(ValidationService.reportIdParamSchema),
  async (req, res, next) => {
    try {
      await ReportController.getReportById(req, res);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id/status", 
  TokenVerifier.verifyAuth,
  TokenVerifier.verifyAdmin, 
  validate(ValidationService.updateReportStatusSchema),
  async (req, res, next) => {
    try {
      await ReportController.updateReportStatus(req, res);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
