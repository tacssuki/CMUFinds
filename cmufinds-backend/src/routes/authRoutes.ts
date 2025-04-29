import express from "express";
import validateInputs from "../middleware/validateInputs";
import RateLimitService from "../middleware/rateLimit";
import AuthController from "../controllers/authController";
import ValidationService from "../services/validationService";

const router = express.Router();

router.post(
  "/register",
  RateLimitService.registerLimiter,
  validateInputs(ValidationService.registerSchema), 
  async (req, res, next) => {
    try {
      await AuthController.register(req, res);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/login",
  RateLimitService.loginLimiter,
  validateInputs(ValidationService.loginSchema), 
  async (req, res, next) => {
    try {
      await AuthController.login(req, res);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/admin",
  RateLimitService.loginLimiter,
  validateInputs(ValidationService.loginSchema),
  async (req, res, next) => {
    try {
      await AuthController.adminLogin(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Forgot Password
router.post(
  "/forgot-password",
  RateLimitService.forgotPasswordLimiter,
  validateInputs(ValidationService.forgotPasswordSchema),
  async (req, res, next) => {
    try {
      await AuthController.forgotPassword(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Reset Password
router.post(
  "/reset-password",
  RateLimitService.resetPasswordLimiter,
  validateInputs(ValidationService.resetPasswordSchema),
  async (req, res, next) => {
    try {
      await AuthController.resetPassword(req, res);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
