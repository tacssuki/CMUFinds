import express from "express";
import PostController from "../controllers/postController";
import TokenVerifier from "../middleware/validateTokens";
import RateLimiter from "../middleware/rateLimit";
import { validate } from "../middleware/validationMiddleware";
import ValidationService from "../services/validationService";
import UploadValidator from "../middleware/validateUploads";

const router = express.Router();

router.post(
  "/create",
  RateLimiter.postLimiter,
  UploadValidator.for('images', 3, 'posts'),
  TokenVerifier.verifyAuth,
  validate(ValidationService.postSchema),
  async (req, res, next) => {
    try {
      await PostController.createPost(req, res);
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  "/:id",
  TokenVerifier.verifyAuth,
  validate(ValidationService.updatePostSchema),
  async (req, res, next) => {
    try {
      await PostController.updatePost(req, res);
    } catch (error) {
      next(error);
    }
  }
);

router.get("/", 
  TokenVerifier.verifyAuth, 
  validate(ValidationService.listPostsQuerySchema),
  async (req, res, next) => {
  try {
    await PostController.getAllPosts(req, res);
  } catch (error) {
    next(error);
  }
});

// Get posts created by the current user
router.get("/my-posts", 
  TokenVerifier.verifyAuth, 
  validate(ValidationService.listMyPostsQuerySchema),
  async (req, res, next) => {
  try {
    await PostController.getMyPosts(req, res);
  } catch (error) {
    next(error);
  }
});

router.get('/search', 
  TokenVerifier.verifyAuth,
  validate(ValidationService.searchQuerySchema),
  async (req, res, next) => {
  try {
    await PostController.searchPosts(req, res);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", 
  TokenVerifier.verifyAuth, 
  validate(ValidationService.idParamSchema),
  async (req, res, next) => {
  try {
    await PostController.getPostById(req, res);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", 
  TokenVerifier.verifyAuth, 
  validate(ValidationService.idParamSchema),
  async (req, res, next) => {
  try {
    await PostController.deletePost(req, res);
  } catch (error) {
    next(error);
  }
});

// User updates status of their own post (e.g., to RESOLVED)
router.patch("/:id/status", 
  TokenVerifier.verifyAuth, 
  validate(ValidationService.idParamSchema),
  validate(ValidationService.updatePostStatusSchema),
  async (req, res, next) => {
  try {
    await PostController.updateMyPostStatus(req, res);
  } catch (error) {
    next(error);
  }
});

// User archives their own post (must be RESOLVED)
router.post("/:id/my-archive", 
  TokenVerifier.verifyAuth, 
  validate(ValidationService.idParamSchema),
  async (req, res, next) => {
  try {
    await PostController.archiveMyPost(req, res);
  } catch (error) {
    next(error);
  }
});

//\ Match two posts (admin only)
router.post(
  "/:id/match/:targetId",
  TokenVerifier.verifyAuth,
  TokenVerifier.verifyAdmin,
  validate(ValidationService.twoIdParamsSchema),
  async (req, res, next) => {
    try {
      await PostController.matchPost(req, res);
    } catch (err) {
      next(err);
    }
  }
);

// Resolve a post (admin only)
router.post(
  "/:id/resolve",
  TokenVerifier.verifyAuth,
  TokenVerifier.verifyAdmin,
  validate(ValidationService.idParamSchema),
  async (req, res, next) => {
    try {
      await PostController.resolvePost(req, res);
    } catch (err) {
      next(err);
    }
  }
);

// Archive a post (admin only)
router.post(
  "/:id/archive",
  TokenVerifier.verifyAuth,
  TokenVerifier.verifyAdmin,
  validate(ValidationService.idParamSchema),
  async (req, res, next) => {
    try {
      await PostController.archivePost(req, res);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
