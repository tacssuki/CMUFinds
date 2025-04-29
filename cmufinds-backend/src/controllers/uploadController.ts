import { Request, Response } from "express";
import UploadService from "../services/uploadService";
import path from "path";
import fs from "fs";
import PrismaService from "../services/prismaService";

class UploadController {
  private prisma = PrismaService.getClient();

  /**
   * Upload profile picture
   */
  public async uploadProfilePicture(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No image provided" });
      }

      // --- Get current profile picture filename ---
      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { profilePicture: true }
      });
      const oldProfilePicture = currentUser?.profilePicture;
      // --- End Get current profile picture filename ---

      // Process the new image file
      const filenames = await UploadService.processImages(files, "profiles");
      
      if (filenames.length === 0) {
        return res.status(500).json({ message: "Failed to process image" });
      }

      const newFilename = filenames[0];
      const newFilepath = path.join(UploadService.basePaths["profiles"], newFilename);
      const newFileExists = fs.existsSync(newFilepath);
      console.log(`New profile picture saved to: ${newFilepath} (exists: ${newFileExists})`);

      // --- Update database BEFORE deleting old file (safer in case DB update fails) ---
      await this.prisma.user.update({
        where: { id: userId },
        data: { profilePicture: newFilename }
      });

      // --- Delete old profile picture file (if it existed and is different) ---
      if (oldProfilePicture && oldProfilePicture !== newFilename) {
        try {
          const oldFilepath = path.join(UploadService.basePaths["profiles"], oldProfilePicture);
          if (fs.existsSync(oldFilepath)) {
            fs.unlinkSync(oldFilepath);
            console.log(`Deleted old profile picture: ${oldFilepath}`);
          } else {
             console.warn(`Old profile picture file not found, skipping deletion: ${oldFilepath}`);
          }
        } catch (deleteError) {
          console.error(`Error deleting old profile picture ${oldProfilePicture}:`, deleteError);
          // Don't fail the whole request if deletion fails, just log it.
        }
      }
      // --- End Delete old profile picture file ---

      // Log actual paths for debugging
      console.log("Profile picture upload debugging:");
      console.log(`- New Filename: ${newFilename}`);
      console.log(`- Base Dir: ${UploadService.basePaths["profiles"]}`);
      console.log(`- Full path: ${newFilepath}`);
      console.log(`- API URL: /api/v1/uploads/profiles/${newFilename}`);
      console.log(`- File exists: ${newFileExists}`);

      // Return success with the filename
      return res.status(200).json({ 
        message: "Profile picture uploaded successfully",
        filename: newFilename,
        url: `/api/v1/uploads/profiles/${newFilename}`
      });
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      return res.status(500).json({ message: "Failed to upload profile picture" });
    }
  }

  /**
   * Upload post images
   */
  public async uploadPostImages(req: Request, res: Response) {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No images provided" });
      }

      // Process the images
      const filenames = await UploadService.processImages(files, "posts");
      
      if (filenames.length === 0) {
        return res.status(500).json({ message: "Failed to process images" });
      }

      // Return success with the filenames
      return res.status(200).json({ 
        message: "Images uploaded successfully",
        filenames,
        urls: filenames.map(filename => `/api/v1/uploads/posts/${filename}`)
      });
    } catch (error) {
      console.error("Error uploading post images:", error);
      return res.status(500).json({ message: "Failed to upload images" });
    }
  }

  /**
   * Delete a file
   */
  public async deleteFile(req: Request, res: Response) {
    try {
      const { context, filename } = req.params;
      const userId = req.user!.userId;
      
      // Validate context
      if (context !== "posts" && context !== "profiles") {
        return res.status(400).json({ message: "Invalid context" });
      }
      
      // Prevent path traversal attacks
      const sanitizedFilename = path.basename(filename);
      const filepath = path.join(UploadService.basePaths[context], sanitizedFilename);
      
      // For profile pictures, verify ownership
      if (context === "profiles") {
        const user = await this.prisma.user.findUnique({
          where: { id: userId }
        });
        
        if (!user || (user as any).profilePicture !== sanitizedFilename) {
          return res.status(403).json({ message: "You don't have permission to delete this file" });
        }
        
        // Update user record
        await this.prisma.user.update({
          where: { id: userId },
          data: { profilePicture: null } as any
        });
      }
      
      // For post images, verify ownership (implementation may vary based on your schema)
      if (context === "posts") {
        // Check if file belongs to any of user's posts
        const posts = await this.prisma.post.findMany({
          where: { 
            userId,
            images: { has: sanitizedFilename } 
          }
        });
        
        if (posts.length === 0) {
          return res.status(403).json({ message: "You don't have permission to delete this file" });
        }
        
        // Update all posts that use this image
        for (const post of posts) {
          await this.prisma.post.update({
            where: { id: post.id },
            data: { 
              images: post.images.filter(img => img !== sanitizedFilename) 
            }
          });
        }
      }
      
      // Check if file exists
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Delete the file
      fs.unlinkSync(filepath);
      
      return res.status(200).json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting file:", error);
      return res.status(500).json({ message: "Failed to delete file" });
    }
  }

  /**
   * Get a file (for testing purposes)
   */
  public async getFile(req: Request, res: Response) {
    try {
      const { context, filename } = req.params;
      
      // Validate context
      if (context !== "posts" && context !== "profiles") {
        return res.status(400).json({ message: "Invalid context" });
      }
      
      // Prevent path traversal attacks
      const sanitizedFilename = path.basename(filename);
      const filepath = path.join(UploadService.basePaths[context], sanitizedFilename);
      
      // Check if file exists
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Determine content type
      const ext = path.extname(filepath).toLowerCase();
      let contentType = "application/octet-stream"; // Default
      
      if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
      else if (ext === ".png") contentType = "image/png";
      else if (ext === ".gif") contentType = "image/gif";
      else if (ext === ".webp") contentType = "image/webp";
      
      // Set content type and send file
      res.setHeader("Content-Type", contentType);
      
      // Create read stream
      const fileStream = fs.createReadStream(filepath);
      
      // Pipe to response
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error retrieving file:", error);
      return res.status(500).json({ message: "Failed to retrieve file" });
    }
  }
}

export default new UploadController(); 