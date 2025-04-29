import { Request, Response } from "express";
import PostService from "../services/postService";
import UploadService from '../services/uploadService';
import PrismaService from "../services/prismaService";
import { Role } from "@prisma/client";

class PostController {
  public async createPost(req: Request, res: Response) {
    try {
      const { type, title, description, location, date, category } = req.body;
      const userId = req.user?.userId;
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

      if (!userId) return res.status(401).json({ message: "Unauthorized - No user ID found" });

      // Parse the date properly
      let parsedDate: Date | undefined;
      if (date) {
        try {
          parsedDate = new Date(date);
          // Validate if the date is valid
          if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ 
              message: "Invalid date format", 
              errors: {
                date: {
                  _errors: ["Invalid datetime"]
                }
              }
            });
          }
        } catch (error) {
          console.error("Date parsing error:", error);
          return res.status(400).json({ 
            message: "Invalid date format", 
            errors: {
              date: {
                _errors: ["Invalid datetime"]
              }
            }
          });
        }
      }

      const images = req.files ? await UploadService.processImages(req.files as Express.Multer.File[], 'posts') : [];

      const result = await PostService.createPost(
        userId, type, title, description, location, ip as string, parsedDate, images, category
      );

      return res.status(result.status).json(result);
    } catch (error) {
      console.error("[CREATE POST ERROR]", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

    public async getAllPosts(req: Request, res: Response) {
        try {
        const userId = req.user?.userId;
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
        if (!userId) return res.status(401).json({ message: "Unauthorized - No user ID found" });
    
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        // Extract sort parameters from query
        const sortBy = req.query.sortBy as string || 'createdAt';
        const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'desc';
    
        // Pass sort parameters to the service
        const result = await PostService.getAllPosts(userId, ip as string, page, limit, sortBy, sortOrder);
        return res.status(result.status).json(result);
        } catch (error) {
        console.error("[GET POSTS ERROR]", error);
        return res.status(500).json({ message: "Internal Server Error" });
        }
    }

  public async getPostById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      if (!userId) return res.status(401).json({ message: "Unauthorized - No user ID found" });

      const result = await PostService.getPostById(id, userId, ip as string);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("[GET POST BY ID ERROR]", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  public async updatePost(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const userRoles = req.user?.roles || [];
      const updateData = { ...req.body };
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      if (!userId) return res.status(401).json({ message: "Unauthorized - No user ID found" });

      const post = await PrismaService.getClient().post.findUnique({ where: { id } });
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      if (post.userId !== userId && !userRoles.includes(Role.ADMIN)) {
        return res.status(403).json({ message: "Forbidden: You do not have permission to update this post." });
      }

      const result = await PostService.updatePost(id, userId, updateData, ip as string);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("[UPDATE POST ERROR]", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  public async deletePost(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const userRoles = req.user?.roles || [];
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      if (!userId) return res.status(401).json({ message: "Unauthorized - No user ID found" });

      const post = await PrismaService.getClient().post.findUnique({ where: { id } });
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      if (post.userId !== userId && !userRoles.includes(Role.ADMIN)) {
        return res.status(403).json({ message: "Forbidden: You do not have permission to delete this post." });
      }

      const result = await PostService.deletePost(id, userId, ip as string);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("[DELETE POST ERROR]", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
    public async getSocialFeed(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
            if (!userId) return res.status(401).json({ message: "Unauthorized - No user ID found" });

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const type = req.query.type as "LOST" | "FOUND" | undefined;
            const sort = (req.query.sort as string) || "recent";

            const result = await PostService.getSocialFeed(userId, ip as string, page, limit, type, sort);
            return res.status(result.status).json(result);
        } catch (error) {
            console.error("[GET SOCIAL FEED ERROR]", error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }
    public async searchPosts (req: Request, res: Response) {
      try {
        const {
          keyword,
          type,
          category,
          createdAfter,
          createdBefore,
          page = '1',
          limit = '30',
        } = req.query;
    
        const result = await PostService.searchPosts({
          keyword: keyword as string,
          type: type as string,
          category: category as string,
          createdAfter: createdAfter as string,
          createdBefore: createdBefore as string,
          page: parseInt(page as string, 10),
          limit: parseInt(limit as string, 10),
        });
    
        res.status(200).json(result);
      } catch (err) {
        console.error('searchPosts error:', err);
        res.status(500).json({ error: 'internal_server_error' });
      }
    };
    public async matchPost(req: Request, res: Response) {
      const adminId = req.user!.userId;
      const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress) as string;
      const { id, targetId } = req.params;
  
      const result = await PostService.matchPosts(id, targetId, adminId, ip);
      return res.status(result.status).json(result);
    }
  
    public async resolvePost(req: Request, res: Response) {
      const adminId = req.user!.userId;
      const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress) as string;
      const { id } = req.params;
  
      const result = await PostService.resolvePost(id, adminId, ip);
      return res.status(result.status).json(result);
    }

    public async archivePost(req: Request, res: Response) {
      const adminId = req.user!.userId;
      const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress) as string;
      const { id } = req.params;
  
      const result = await PostService.archivePost(id, adminId, ip);
      return res.status(result.status).json({ message: result.message });
    }

    public async getMyPosts(req: Request, res: Response) {
      try {
        const userId = req.user?.userId;
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
        if (!userId) return res.status(401).json({ message: "Unauthorized - No user ID found" });

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        
        // Extract all potential filter parameters from query
        const search = req.query.search as string;
        const type = req.query.type as string;
        const status = req.query.status as string;
        const category = req.query.category as string;
        const location = req.query.location as string;
        const sortBy = req.query.sortBy as string || 'createdAt';
        const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'desc';

        // Construct the params object for the service
        const params = {
          search,
          type,
          status,
          category,
          location,
          sortBy,
          sortOrder
        };

        const result = await PostService.getMyPosts(userId, ip as string, page, limit, params);
        return res.status(result.status).json(result);
      } catch (error) {
        console.error("[GET MY POSTS ERROR]", error);
        return res.status(500).json({ message: "Internal Server Error" });
      }
    }

  // Controller method for user to update their own post status
  public async updateMyPostStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body; // Expecting { status: "RESOLVED" }
      const userId = req.user?.userId;
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

      if (!userId) return res.status(401).json({ message: "Unauthorized - No user ID found" });
      if (!status) return res.status(400).json({ message: "Missing 'status' in request body" });

      // --- Authorization Check (Owner Only) ---
      const post = await PrismaService.getClient().post.findUnique({ where: { id } });
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      if (post.userId !== userId) {
        return res.status(403).json({ message: "Forbidden: You can only update the status of your own posts." });
      }
      // --- End Authorization Check ---

      const result = await PostService.updateMyPostStatus(id, userId, status, ip as string);
      return res.status(result.status).json(result);
    } catch (error) {
      console.error("[UPDATE MY POST STATUS ERROR]", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  // Controller method for user to archive their own resolved post
  public async archiveMyPost(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

      if (!userId) return res.status(401).json({ message: "Unauthorized - No user ID found" });

      // --- Authorization Check (Owner Only) ---
      const post = await PrismaService.getClient().post.findUnique({ where: { id } });
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      if (post.userId !== userId) {
        return res.status(403).json({ message: "Forbidden: You can only archive your own posts." });
      }
      // --- End Authorization Check ---

      const result = await PostService.archiveMyPost(id, userId, ip as string);
      return res.status(result.status).json(result);
    } catch (error) {
      // Catch potential transaction errors from the service
      console.error("[ARCHIVE MY POST ERROR]", error);
      const message = (error as any).message || "Internal Server Error";
      const status = (error as any).status || 500;
      return res.status(status).json({ message });
    }
  }
}

export default new PostController();
  