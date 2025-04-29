import express from "express";
import TokenVerifier from "../middleware/validateTokens";
import UploadValidator from "../middleware/validateUploads";
import UploadController from "../controllers/uploadController";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { isAuthenticated } from '../middleware/auth';
import { Request, Response, NextFunction } from 'express';

const router = express.Router();

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/chat-images');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const fileExt = path.extname(file.originalname);
    cb(null, `${uniqueId}${fileExt}`);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
  }
};

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
});

// Upload profile picture
router.post(
  "/profile",
  TokenVerifier.verifyAuth,
  UploadValidator.for("image", 1, "profiles"),
  async (req, res, next) => {
    try {
      await UploadController.uploadProfilePicture(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Upload post images
router.post(
  "/post",
  TokenVerifier.verifyAuth,
  UploadValidator.for("images", 5, "posts"),
  async (req, res, next) => {
    try {
      await UploadController.uploadPostImages(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Delete uploaded file
router.delete(
  "/:context/:filename",
  TokenVerifier.verifyAuth,
  async (req, res, next) => {
    try {
      await UploadController.deleteFile(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Get uploaded file (useful for testing, but should usually be handled by static file middleware)
router.get(
  "/:context/:filename",
  async (req, res, next) => {
    try {
      await UploadController.getFile(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Chat image upload controller method
const handleChatImageUpload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ 
        status: 400,
        message: 'No file uploaded or invalid file type'
      });
      return;
    }
    
    // Construct URL for the file
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const filePath = req.file.path.replace(/\\/g, '/').split('uploads/')[1];
    const fileUrl = `${baseUrl}/uploads/${filePath}`;
    
    res.status(200).json({
      status: 200,
      url: fileUrl,
      fileName: req.file.filename
    });
  } catch (error) {
    next(error);
  }
};

// Chat image upload - workaround for TypeScript error
// @ts-ignore - Express type definition issue
router.post('/chat-images', isAuthenticated, upload.single('image'), handleChatImageUpload);

export default router; 