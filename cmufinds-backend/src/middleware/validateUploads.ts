import multer, { FileFilterCallback } from 'multer';
import { RequestHandler } from 'express';
import UploadService from '../services/uploadService';

class UploadValidator {
  static for(fieldName: string, maxCount: number, context: 'posts' | 'profiles'): RequestHandler {
    UploadService.ensureDirs();

    const storage = multer.memoryStorage();

    const upload = multer({
      storage,
      limits: { fileSize: UploadService.maxSize },
      fileFilter(req, file, cb: FileFilterCallback) {
        const isValid = UploadService.allowedMimeTypes.includes(file.mimetype);
        if (!isValid) return cb(new Error('Invalid file type') as any, false);
        cb(null, true);
      }
    });

    return upload.array(fieldName, maxCount);
  }
}

export default UploadValidator;
