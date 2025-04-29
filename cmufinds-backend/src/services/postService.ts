import { PrismaClient,Prisma, NotificationType, PostStatus, PostType } from "@prisma/client";
import { formatTimestamp } from "../utils/timeUtils";
import NotificationService from "./notificationService";
import ValidationService from "./validationService";
import ChatService from "./chatService";

// Helper function to construct post image URL (copied from chatService)
const buildPostImageUrl = (filename: string | null): string | null => {
  if (!filename) return null;
  const baseUrl = process.env.API_URL || 'http://localhost:5000';
  // Ensure the path matches how files are served in server.ts
  return `${baseUrl}/api/v1/uploads/posts/${filename}`; 
};

class PostService {
  private prisma = new PrismaClient();
  private chatService = ChatService;

  // 🔹 Helper function to log user actions
  private async logAction(userId: string, action: string, ip: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
    const username = user?.username || "Unknown";

    await this.prisma.userLog.create({
      data: { userId, username, action, ipAddress: ip },
    });

    console.log(`[${action}] by ${username} at ${formatTimestamp(new Date())}`);
  }

  // 🟢 Create a Lost/Found Post
  public async createPost(userId: string, type: "LOST" | "FOUND", title: string, description: string, location: string, ip: string, date?: Date, images?: string[],category?: string) {
    // 🛑 Validate Input
    const errors = ValidationService.validate(ValidationService.postSchema, { type, title, description, location, date, images });
    if (errors) return { status: 400, message: errors };

    const post = await this.prisma.post.create({
      data: {
        userId,
        type,
        title,
        description,
        location,
        category,
        dateLost: type === "LOST" ? date : null,
        dateFound: type === "FOUND" ? date : null,
        images: images || [],
      },
    });

    await this.logAction(userId, "CREATE_POST", ip);
    return { status: 201, message: "Post created successfully", post };
  }

    // 🟡 Get All Posts (With Pagination & Sorting)
    public async getAllPosts(userId: string, ip: string, page: number = 1, limit: number = 10, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc', includeDeleted = false) {
        const maxLimit = 20; 
        limit = Math.min(limit, maxLimit);
        const skip = (page - 1) * limit;

        // Validate and sanitize sort parameters
        const validSortFields = ['createdAt', 'title', 'type', 'status', 'category'];
        const validatedSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const validatedSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
        
        const orderBy: Prisma.PostOrderByWithRelationInput = {
          [validatedSortBy]: validatedSortOrder
        };

        // Build where clause, filtering deletedAt
        const where: Prisma.PostWhereInput = {};
        if (!includeDeleted) {
          where.deletedAt = null; // Only fetch non-deleted posts by default
        }
        // TODO: Combine with other potential filters (type, status) if needed for this specific endpoint
    
        const posts = await this.prisma.post.findMany({
          where, // Apply the filter
        skip,
        take: limit,
        orderBy, // Use dynamic sorting
          // Ensure we select necessary fields including user info
        select: {
          id: true,
          title: true,
          description: true,
          location: true,
          type: true,
          status: true,
          createdAt: true,
          images: true,
          category: true,
          dateLost: true, 
          dateFound: true,
            userId: true, 
            user: { 
            select: { 
                id: true, 
              name: true, 
              username: true 
            } 
          } 
        }
        });
    
        const totalPosts = await this.prisma.post.count({ where }); // Count based on the same filter
    
        await this.logAction(userId, "VIEW_ALL_POSTS", ip);
        return { status: 200, data: { 
          posts: this.transformPostImages(posts), 
          totalPosts, 
          page, 
          limit, 
          totalPages: Math.ceil(totalPosts / limit)
        }};
    }  

    // Create sample posts for demonstration
    private async createSamplePosts(userId: string) {
      const categories = ["Electronics", "Clothing", "Accessories", "Documents", "Keys", "Other"];
      const locations = ["Library", "Cafeteria", "Main Building", "CS Department", "Gym", "Parking Lot"];
      
      // Create 5 LOST posts
      for (let i = 1; i <= 5; i++) {
        await this.prisma.post.create({
          data: {
            userId,
            type: "LOST",
            title: `Lost Item #${i}: ${categories[i % categories.length]}`,
            description: `This is a sample lost item #${i}. If you find it, please contact me.`,
            location: locations[i % locations.length],
            category: categories[i % categories.length],
            dateLost: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Past days
            images: [], // REMOVED picsum url
            status: "PENDING"
          }
        });
      }
      
      // Create 5 FOUND posts
      for (let i = 1; i <= 5; i++) {
        await this.prisma.post.create({
          data: {
            userId,
            type: "FOUND",
            title: `Found Item #${i}: ${categories[(i+2) % categories.length]}`,
            description: `I found this item #${i} in the ${locations[(i+1) % locations.length]}. Contact me to claim it.`,
            location: locations[(i+1) % locations.length],
            category: categories[(i+2) % categories.length],
            dateFound: new Date(Date.now() - i * 12 * 60 * 60 * 1000), // Past hours
            images: [], // REMOVED picsum url
            status: "PENDING"
          }
        });
      }
      
      console.log("[PostService] Created 10 sample posts");
    }

  // Helper method to transform post data for responses
  private transformPostImages(posts: any | any[]) {
    const transformSinglePost = (post: any) => {
      let imageUrls: { id: string, url: string }[] = [];
      
      if (post.images && Array.isArray(post.images) && post.images.length > 0) {
        imageUrls = post.images
          .map((image: string) => {
            // Skip external URLs or handle them differently if needed
            if (!image || image.startsWith('http')) {
              return null; // Ignore invalid or external images for now
            }
            // Build URL for valid local image filenames
            const url = buildPostImageUrl(image);
            return url ? { id: image, url: url } : null;
          })
          .filter((imgObj: { id: string; url: string } | null): imgObj is { id: string; url: string } => imgObj !== null); // Filter out nulls and add type annotation
      }

      // If no valid images were found, add a placeholder
      if (imageUrls.length === 0) {
         imageUrls.push({ 
            id: 'placeholder', 
            // Point to the static path served by the frontend
            // Backend doesn't know frontend structure, so use absolute path if needed or rely on frontend handling
            url: '/placeholders/no-image.png' 
         });
      }
      
      // Replace original images array with the transformed one (or placeholder)
      post.images = imageUrls;
      
      // Optionally, add a direct 'imageUrl' property for convenience (e.g., for thumbnail)
      post.imageUrl = imageUrls[0]?.url; // Use the first image URL as the main imageUrl

      return post;
    };

    if (Array.isArray(posts)) {
      return posts.map(transformSinglePost);
    }
    return transformSinglePost(posts);
  }

  // 🔍 Get a Single Post by ID
  public async getPostById(postId: string, userId: string, ip: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { 
        user: { 
          select: { 
            id: true,
            name: true, 
            username: true 
          } 
        } 
      },
    });

    if (!post) return { status: 404, message: "Post not found" };

    // Also include the userId explicitly to make it easier for frontend comparison
    const enhancedPost = { 
      ...post, 
      isOwner: post.userId === userId 
    };

    await this.logAction(userId, "VIEWED_A_POST", ip);
    return { status: 200, post: this.transformPostImages(enhancedPost) };
  }

  // 📝 Update a Post
  public async updatePost(postId: string, userId: string, updateData: any, ip: string) {
    // 🛑 Validate Input
    const errors = ValidationService.validate(ValidationService.updatePostSchema, updateData);
    if (errors) return { status: 400, message: errors };

    // Fetch post and user making the request concurrently
    const [post, requestingUser] = await Promise.all([
       this.prisma.post.findUnique({ where: { id: postId } }),
       this.prisma.user.findUnique({ where: { id: userId }, select: { roles: true } })
    ]);
    
    if (!post) return { status: 404, message: "Post not found" };
    if (!requestingUser) return { status: 401, message: "User not found" }; // Should not happen if auth is working

    // Check authorization: Must be owner OR Admin/Developer
    const isOwner = post.userId === userId;
    const isAdminOrDev = requestingUser.roles.includes('ADMIN') || requestingUser.roles.includes('DEVELOPER');
    
    if (!isOwner && !isAdminOrDev) {
      return { status: 403, message: "Unauthorized to update this post" };
    }

    // Proceed with update
    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: updateData,  
    });

    await this.logAction(userId, "UPDATE_POST", ip);
    return { status: 200, message: "Post updated successfully", updatedPost };
  }

  // ❌ Delete a Post (Soft Delete for Users)
  public async deletePost(postId: string, userId: string, ip: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) return { status: 404, message: "Post not found" };
    if (post.userId !== userId) return { status: 403, message: "Unauthorized" };

    // Perform soft delete instead of hard delete
    await this.prisma.post.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });

    // Update log action name
    await this.logAction(userId, "SOFT_DELETE_POST", ip);
    return { status: 200, message: "Post deleted successfully" }; // Message can remain the same for the user
  }

  // ✅ Update Post Status (User-Initiated)
  public async updateMyPostStatus(postId: string, userId: string, newStatus: string, ip: string) {
    // Validate the target status against the PostStatus enum
    const validStatuses = Object.values(PostStatus);
    if (!validStatuses.includes(newStatus as PostStatus)) {
      return { status: 400, message: `Invalid status provided. Valid statuses are: ${validStatuses.join(', ')}` };
    }

    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) return { status: 404, message: "Post not found" };
    if (post.userId !== userId) return { status: 403, message: "Unauthorized to update status for this post" };

    // Allow updating even if already resolved, as requested
    // if (post.status === PostStatus.RESOLVED) {
    //     return { status: 400, message: "Post is already resolved." };
    // }

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: { status: newStatus as PostStatus },
    });

    // More specific log action
    await this.logAction(userId, `UPDATE_OWN_POST_STATUS_TO_${newStatus}`, ip);
    
    // TODO: Consider adding a PostHistory entry here?
    
    // Notify user (optional)
    // await NotificationService.createNotification(userId, NotificationType.STATUS_CHANGE, `Your post status was updated to ${newStatus}`, { postId });

    return { status: 200, message: "Post status updated successfully", post: updatedPost };
  }

  // 📌 Get Social Feed (Paginated)
    public async getSocialFeed(userId: string, ip: string, page: number = 1, limit: number = 10, type?: "LOST" | "FOUND", sort: string = "recent") {
        const maxLimit = 20; // 🔒 Prevent scraping (max limit per request)
        limit = Math.min(limit, maxLimit);
        const skip = (page - 1) * limit;

        // 🛑 Filters
        const filters: any = { status: { not: "RESOLVED" } }; // Exclude resolved posts
        if (type) filters.type = type;

        // 🔀 Sorting Logic
        let orderBy: any = { createdAt: "desc" }; // Default: Most recent first
        if (sort === "popular") orderBy = { views: "desc" }; // 🔥 Most viewed first
        if (sort === "recommended") {
            orderBy = { createdAt: "desc" }; // Future: ML-based recommendations
        }

        // 📌 Fetch posts
        const posts = await this.prisma.post.findMany({
            where: filters,
            skip,
            take: limit,
            orderBy,
            include: { user: { select: { name: true, username: true } } },
        });

        const totalPosts = await this.prisma.post.count({ where: filters });

        await this.logAction(userId, "VIEW_FEED", ip);
        return { status: 200, data: { 
          posts: this.transformPostImages(posts), 
          totalPosts, 
          page, 
          limit 
        }};
    }

    public searchPosts = async (params: {
      keyword?: string;
      type?: string;
      category?: string;
      createdAfter?: string;
      createdBefore?: string;
      page: number;
      limit: number;
      status?: string;
      location?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }) => {
      const {
        keyword,
        type,
        category,
        createdAfter,
        createdBefore,
        page,
        limit,
        status,
        location,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = params;
    
      // Build query conditionals with correct types
      const where: Prisma.PostWhereInput = {}; // Start with an empty where clause
    
      // Apply status filter ONLY if specified
      if (status && status !== 'ALL' && Object.values(PostStatus).includes(status as PostStatus)) {
        where.status = status as PostStatus;
      } else if (!status || status === 'ALL') {
        // Default: Show all non-resolved posts if no specific status or 'ALL' is requested
        where.status = { not: PostStatus.RESOLVED };
      }
      // else: If status is invalid, don't apply any status filter (could also return error)
    
      // Add type filter if specified and valid
      if (type && Object.values(PostType).includes(type as PostType)) {
        where.type = type as PostType;
      }
      
      // Add category filter if specified
      if (category) where.category = category;
      
      // Add location filter if specified
      if (location) {
        where.location = {
          contains: location,
          mode: 'insensitive'
        };
      }
      
      // Optimize keyword search - use contains (removed non-standard 'search' property)
      if (keyword) {
        where.OR = [
          { title: { contains: keyword, mode: 'insensitive' } },
          { description: { contains: keyword, mode: 'insensitive' } },
        ];
      }
      
      // Optimize date filtering by using a proper date range
      if (createdAfter || createdBefore) {
        where.createdAt = {};
        
        if (createdAfter) {
          try {
            const afterDate = new Date(createdAfter);
            if (!isNaN(afterDate.getTime())) {
              where.createdAt.gte = afterDate;
            }
          } catch (e) {
            console.error("Invalid createdAfter date:", createdAfter);
          }
        }
        
        if (createdBefore) {
          try {
            const beforeDate = new Date(createdBefore);
            if (!isNaN(beforeDate.getTime())) {
              // Add one day to include the entire day specified
              beforeDate.setDate(beforeDate.getDate() + 1);
              where.createdAt.lt = beforeDate;
            }
          } catch (e) {
            console.error("Invalid createdBefore date:", createdBefore);
          }
        }
      }
      
      // Validate and sanitize sort parameters
      const validSortFields = ['createdAt', 'title', 'type', 'status', 'category'];
      const validatedSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const validatedSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
      
      // Build orderBy object
      const orderBy: Prisma.PostOrderByWithRelationInput = {
        [validatedSortBy]: validatedSortOrder
      };
    
      // Execute query with pagination parameters
      const [posts, totalCount] = await Promise.all([
        this.prisma.post.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        }),
        this.prisma.post.count({ where })
      ]);
      
      // Return formatted response
      return {
        status: 200,
        data: {
          posts: this.transformPostImages(posts),
          totalPosts: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        }
      };
    };

    
      public async matchPosts(
        postId: string,
        targetId: string,
        adminId: string,
        ip: string
      ) {
        return this.prisma.$transaction(async (tx): Promise<{ status: number; message: string }> => {
          const postA = await tx.post.findUnique({ where: { id: postId } });
          const postB = await tx.post.findUnique({ where: { id: targetId } });
          if (!postA || !postB) {
             // Throw an error to rollback the transaction
            throw new Error("One or both posts not found"); 
          }

          // Check if posts are already matched or resolved
          if (postA.status !== PostStatus.PENDING || postB.status !== PostStatus.PENDING) {
            throw new Error("One or both posts are not in PENDING status");
          }

          // Check if posts are of opposite types
          if (postA.type === postB.type) {
             throw new Error("Posts must be of opposite types (LOST and FOUND) to be matched");
          }
    
          await tx.post.update({ where: { id: postId }, data: { status: PostStatus.MATCHED } });
          await tx.post.update({ where: { id: targetId }, data: { status: PostStatus.MATCHED } });
    
          await tx.postHistory.createMany({
            data: [
              { postId, changedBy: adminId, action: "MATCHED" },
              { postId: targetId, changedBy: adminId, action: "MATCHED" },
            ],
          });
    
          const adminUser = await tx.user.findUnique({ where: { id: adminId }, select: { username: true } });
          await tx.userLog.create({
            data: {
              userId: adminId,
              username: adminUser?.username || "UnknownAdmin",
              action: "ADMIN_MATCH_POSTS",
              ipAddress: ip,
            },
          });
          
          // --- Create Chat Thread --- 
          try {
            // Determine which post ID to use (e.g., the LOST post)
            const primaryPostIdForChat = postA.type === PostType.LOST ? postA.id : postB.id;
            // Get the user IDs
            const userAId = postA.userId;
            const userBId = postB.userId;
            
            // Call ChatService to create the thread (assuming userA is the 'claimer' for simplicity)
            // Note: getOrCreateThread handles checks like not creating thread with self
            console.log(`Attempting to create chat thread for posts ${postA.id} & ${postB.id} between users ${userAId} & ${userBId}`);
            const chatResult = await this.chatService.getOrCreateThread(primaryPostIdForChat, userBId); 
            // We might need to call it with userAId as claimer if userB is owner of primaryPostIdForChat, 
            // but getOrCreateThread should handle owner/claimer logic internally.
            
            if (chatResult.status >= 400) {
               console.error("Failed to create chat thread during match:", chatResult.message);
               // Decide if failure to create chat should rollback the match - currently it won't rollback
            } else {
               console.log(`Chat thread created/retrieved successfully: ${chatResult.data?.id}`);
            }
          } catch(chatError) {
             console.error("Exception occurred while trying to create chat thread during match:", chatError);
             // Decide if failure to create chat should rollback the match - currently it won't rollback
          }
          // --- End Create Chat Thread ---
    
          // Notifications
          await NotificationService.createNotification(
            postA.userId, 
            NotificationType.MATCH, 
            `Your post \"${postA.title}\" has been matched with another post by an admin.`, 
            { matchedWithPostId: targetId, matchedByAdmin: true } // Added more context
          );
          await NotificationService.createNotification(
            postB.userId, 
            NotificationType.MATCH, 
            `Your post \"${postB.title}\" has been matched with another post by an admin.`, 
            { matchedWithPostId: postId, matchedByAdmin: true } // Added more context
          );
    
          return { status: 200, message: "Posts matched successfully" };
        })
        .catch(error => {
            // Catch errors from the transaction (including thrown errors)
            console.error("Error during post matching transaction:", error);
            // Return a user-friendly error message based on the error type if possible
            const message = error instanceof Error ? error.message : "Failed to match posts due to an internal error.";
            const status = (error as any).status || 500; // Use status from custom error if available
            return { status, message };
        });
      }
    
      public async resolvePost(
        postId: string,
        adminId: string,
        ip: string
      ) {
        return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const post = await tx.post.findUnique({ where: { id: postId } });
          if (!post) throw { status: 404, message: "Post not found" };
    
          await tx.post.update({ where: { id: postId }, data: { status: "RESOLVED" } });
    
          await tx.postHistory.create({ data: { postId, changedBy: adminId, action: "RESOLVED" } });
    
          await tx.userLog.create({
            data: {
              userId: adminId,
              username: (await tx.user.findUnique({ where: { id: adminId } }))!.username,
              action: "ADMIN_RESOLVE_POST",
              ipAddress: ip,
            },
          });
    
          await NotificationService.createNotification(
            post.userId, 
            NotificationType.RESOLVE, 
            `Your post has been resolved by an admin`, 
            { resolvedPost: postId }
          );
    
          return { status: 200, message: "Post resolved successfully" };
        });
      }
    
      public async archivePost(
        postId: string,
        adminId: string,
        ip: string
      ) {
        return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const post = await tx.post.findUnique({ where: { id: postId } });
          if (!post) throw { status: 404, message: "Post not found" };
    
          await tx.archivePost.create({ data: { originalPostId: postId } });
          await tx.post.delete({ where: { id: postId } });
    
          const admin = await tx.user.findUnique({ where: { id: adminId } });
          await tx.userLog.create({
            data: {
              userId: adminId,
              username: admin?.username ?? "Unknown",
              action: "ADMIN_ARCHIVE_POST",
              ipAddress: ip,
            },
          });
    
          return { status: 200, message: "Post archived successfully" };
        });
      }

    // Method to get posts specifically for the logged-in user
    public async getMyPosts(userId: string, ip: string, page: number = 1, limit: number = 10, params?: { 
      search?: string, 
      type?: string, 
      status?: string,
      category?: string,
      location?: string,
      sortBy?: string,
      sortOrder?: 'asc' | 'desc' 
    }) {
      try {
        const skip = (page - 1) * limit;
        
        // Start with the base filter for the user
        const where: Prisma.PostWhereInput = { userId };
        
        // Apply additional filters similar to searchPosts
        const { search, type, status, category, location, sortBy = 'createdAt', sortOrder = 'desc' } = params || {};

        if (type && type !== "ALL") {
          where.type = type as PostType;
        }
        if (status && status !== "ALL") {
          where.status = status as PostStatus;
        }
        if (category) {
          where.category = category;
        }
        if (location) {
          where.location = { contains: location, mode: 'insensitive' };
        }
        if (search) {
          where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ];
        }
        
        // Validate and sanitize sort parameters
        const validSortFields = ['createdAt', 'title', 'type', 'status', 'category'];
        const validatedSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const validatedSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
      
        // Build orderBy object
        const orderBy: Prisma.PostOrderByWithRelationInput = {
          [validatedSortBy]: validatedSortOrder
        };
        
        const [posts, totalPosts] = await Promise.all([
          this.prisma.post.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                }
              }
            }
          }),
          this.prisma.post.count({ where })
        ]);
        
        await this.logAction(userId, "VIEWED_MY_POSTS", ip);
        
        return {
          status: 200,
          data: {
            posts: this.transformPostImages(posts),
            page,
            limit,
            totalPosts,
            totalPages: Math.ceil(totalPosts / limit)
          }
        };
      } catch (error) {
        console.error("Error fetching my posts:", error);
        // Ensure the error is re-thrown or handled consistently
        if (error instanceof Error) {
          return { status: 500, message: error.message || "Error fetching posts" };
        }
        return { status: 500, message: "An unknown error occurred while fetching posts" };
      }
    }

  // 📦 Archive Post (User-Initiated, requires RESOLVED status)
  public async archiveMyPost(postId: string, userId: string, ip: string) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Fetch the post and check ownership and status
      const post = await tx.post.findUnique({
        where: { id: postId },
        select: { userId: true, status: true } // Select only needed fields
      });
      
      if (!post) {
        throw { status: 404, message: "Post not found" };
      }
      if (post.userId !== userId) {
        throw { status: 403, message: "Unauthorized to archive this post" };
      }
      if (post.status !== PostStatus.RESOLVED) {
        throw { status: 400, message: "Only RESOLVED posts can be archived." };
      }

      // Create archive entry and delete original post
      await tx.archivePost.create({ data: { originalPostId: postId } });
      await tx.post.delete({ where: { id: postId } });

      // Log the action
      await this.logAction(userId, "ARCHIVE_OWN_POST", ip);
      // Note: logAction uses a separate prisma client instance, might need adjustment if strict transaction logging is required

      return { status: 200, message: "Post archived successfully" };
    })
    .catch(error => {
      // Handle transaction errors (including thrown validation errors)
      console.error("Error archiving post:", error);
      const message = error.message || "Failed to archive post due to an internal error.";
      const status = error.status || 500;
      return { status, message };
    });
    }
}

export default new PostService();
