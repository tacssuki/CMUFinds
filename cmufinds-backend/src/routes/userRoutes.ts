import express from "express";
import TokenVerifier from "../middleware/validateTokens";
import validateInputs from "../middleware/validateInputs";
import ValidationService from "../services/validationService";
import UserController from "../controllers/userController";

const router = express.Router();

router.get(
  "/me",
  TokenVerifier.verifyAuth,
  async (req, res, next) => {
    try { await UserController.getProfile(req, res); }
    catch (e) { next(e); }
  }
);

// PUT profile updates
router.put(
  "/me",
  TokenVerifier.verifyAuth,
  validateInputs(ValidationService.updateUserSchema),
  async (req, res, next) => {
    try { await UserController.updateProfile(req, res); }
    catch (e) { next(e); }
  }
);

// Search for users
router.get(
  "/search",
  TokenVerifier.verifyAuth,
  validateInputs(ValidationService.userSearchSchema),
  async (req, res, next) => {
    try { await UserController.searchUsers(req, res); }
    catch (e) { next(e); }
  }
);

export default router;
