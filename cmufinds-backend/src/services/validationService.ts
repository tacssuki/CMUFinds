import { z } from "zod";
import sanitizeHtml from "sanitize-html";

const clean = (value: string) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });

const cmuEmailDomain = "@cityofmalabonuniversity.edu.ph";
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
const passwordSchema = z.string()

    .min(8, "Password must be at least 8 characters")
    .regex(passwordRegex, "Password must contain at least one letter and one number");
    
const cmuIDRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const idParamSchema = z.object({
  params: z.object({
    id: z.string().regex(cmuIDRegex, "Invalid ID format"),
  })
});

const twoIdParamsSchema = z.object({
  params: z.object({
    id: z.string().regex(cmuIDRegex, "Invalid ID format"),
    targetId: z.string().regex(cmuIDRegex, "Invalid target ID format"),
  })
});

const postStatusSchema = z.enum(["PENDING", "MATCHED", "RESOLVED"]);
const reportStatusSchema = z.enum(["PENDING", "REVIEWING", "ACTION_TAKEN", "DISMISSED"]);
const reportEntityTypeSchema = z.enum(["POST", "USER"]);
const reportReasonSchema = z.enum([
  "SPAM",
  "INAPPROPRIATE_CONTENT",
  "HARASSMENT",
  "MISLEADING_INFORMATION",
  "SCAM",
  "OFF_TOPIC",
  "OTHER"
]);

const updatePostStatusSchema = z.object({
  body: z.object({
    status: postStatusSchema,
  })
});

class ValidationService {
  static registerSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters").transform(clean),
    email: z.string().email("Invalid email address").refine((e) => e.toLowerCase().endsWith(cmuEmailDomain), {
      message: `Email must end with '${cmuEmailDomain}'`,
    }),
    password: z.string().min(6, "Password must be at least 6 characters"),
  });

  static loginSchema = z.object({
    username: z.string().min(3, "Email or Username is required").transform(clean),
    password: z.string().min(6, "Password must be at least 6 characters"),
  });

  static userSearchSchema = z.object({
    query: z.string().min(1, "Search query is required").transform(clean),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  });

  static postSchema = z.object({
    type: z.enum(["LOST", "FOUND"]),
    title: z.string().min(5, "Title must be at least 5 characters").transform(clean),
    description: z.string().min(10, "Description must be at least 10 characters").transform(clean),
    location: z.string().min(3, "Location must be at least 3 characters").transform(clean),
    category:   z.string().min(1).max(100).optional(),
    date: z.union([
      z.string().datetime({ offset: true }), 
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform(str => new Date(str)),
      z.date()
    ]).optional(),
    images: z.array(z.string()).optional(),
  });

  static updatePostSchema = z.object({
    type: z.enum(["LOST", "FOUND"]).optional(),
    title: z.string().min(5, "Title must be at least 5 characters").transform(clean).optional(),
    description: z.string().min(10, "Description must be at least 10 characters").transform(clean).optional(),
    location: z.string().min(3, "Location must be at least 3 characters").transform(clean).optional(),
    category:   z.string().min(1).max(100).optional(),
    date: z.union([z.string().datetime(), z.date()]).optional(),
    images: z.array(z.string()).optional(),
  });

  static searchQuerySchema = z.object({
    keyword: z.string().min(1).optional(),
    type:    z.enum(["LOST","FOUND"]).optional(),
    category:z.string().optional(),
    page:    z.coerce.number().int().min(1).default(1),
    limit:   z.coerce.number().int().min(1).max(100).default(20),
  });

  static listPostsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    type: z.enum(["LOST", "FOUND"]).optional(),
    status: postStatusSchema.optional(),
    category: z.string().min(1).max(100).optional(),
    startDate: z.string().datetime({ offset: true }).optional(),
    endDate: z.string().datetime({ offset: true }).optional(),
  });
  
  static listMyPostsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  });
  
  static idParamSchema = idParamSchema;
  static twoIdParamsSchema = twoIdParamsSchema;
  static updatePostStatusSchema = updatePostStatusSchema;

  // --- Chat Schemas ---
  static createThreadSchema = z.object({
    participantId: z.string().regex(cmuIDRegex, "Invalid participant ID format"),
  });

  static getMessagesSchema = z.object({
    params: z.object({ threadId: z.string().regex(cmuIDRegex, "Invalid thread ID format") }),
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(30),
    }),
  });
  
  static sendMessageSchema = z.object({
    params: z.object({ threadId: z.string().regex(cmuIDRegex, "Invalid thread ID format") }),
    body: z.object({
      text: z.string().min(1, "Message content cannot be empty").max(500, "Message content too long").transform(clean),
      imageUrl: z.string().url("Invalid image URL").optional(),
    }),
  });
  
  static threadIdParamSchema = z.object({
    params: z.object({ threadId: z.string().regex(cmuIDRegex, "Invalid thread ID format") }),
  });
  // --- End Chat Schemas ---

  // --- Report Schemas ---
  static createReportSchema = z.object({
    body: z.object({
      type: reportEntityTypeSchema,
      reportedPostId: z.string().uuid("Invalid Post ID format").optional(),
      reportedUserId: z.string().uuid("Invalid User ID format").optional(),
      reason: reportReasonSchema,
      description: z.string().max(500).optional().transform((val) => val ? clean(val) : val),
    }).refine(data => !!data.reportedPostId || !!data.reportedUserId, {
      message: "Either reportedPostId or reportedUserId must be provided",
      path: ["reportedPostId"],
    }).refine(data => !(data.reportedPostId && data.reportedUserId), {
      message: "Cannot provide both reportedPostId and reportedUserId",
      path: ["reportedPostId"],
    }),
  });
  
  static listMyReportsSchema = z.object({
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(10),
    }),
  });

  static listAllReportsSchema = z.object({
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(10),
      status: reportStatusSchema.optional(),
      type: reportEntityTypeSchema.optional(),
    }),
  });
  
  static reportIdParamSchema = z.object({
    params: z.object({ id: z.string().uuid("Invalid report ID format") }),
  });
  
  static updateReportStatusSchema = z.object({
    params: z.object({ id: z.string().uuid("Invalid report ID format") }),
    body: z.object({ 
      status: reportStatusSchema,
      adminNotes: z.string().max(1000).optional().transform((val) => val ? clean(val) : undefined)
    }),
  });
  // --- End Report Schemas ---

  // --- Notification Schemas ---
  static listNotificationsSchema = z.object({
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(10),
    }),
  });

  static notificationIdParamSchema = z.object({
    params: z.object({ id: z.string().regex(cmuIDRegex, "Invalid notification ID format") }),
  });
  // --- End Notification Schemas ---

  // --- Admin Schemas ---
  static listUsersAdminSchema = z.object({
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(10),
      role: z.enum(["STUDENT", "ADMIN", "DEVELOPER"]).optional(),
      query: z.string().min(1).optional(), // Search query
    }),
  });

  static updateUserRolesSchema = z.object({
    params: z.object({ id: z.string().regex(cmuIDRegex, "Invalid ID format") }), // Use direct object shape
    body: z.object({
      roles: z.array(z.enum(["STUDENT", "ADMIN", "DEVELOPER"])).min(1, "At least one role is required"),
    }),
  });
  
  static updateUserSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters").transform(clean).optional(),
    email: z.string().email("Invalid email address").optional(),
    currentPassword: z.string().min(6).optional(),
    password: passwordSchema.optional(), 
  }).refine(data => {
      if (data.password && !data.currentPassword) {
          return false;
      }
      return true;
  }, {
      message: "Current password is required to set a new password",
      path: ["currentPassword"], 
  });

  static adminUpdateUserProfileSchema = z.object({
    params: z.object({ id: z.string().regex(cmuIDRegex, "Invalid ID format") }),
    body: z.object({
      name: z.string().min(3).transform(clean).optional(),
      email: z.string().email().optional(),
    }).partial(),
  });
  
  static adminUpdatePostSchema = z.object({
    params: z.object({ id: z.string().regex(cmuIDRegex, "Invalid ID format") }),
    body: this.updatePostSchema.partial(), // Apply partial directly to make inner fields optional
  });
  
  static adminResolveReportSchema = z.object({
    params: z.object({ id: z.string().regex(cmuIDRegex, "Invalid report ID format") }),
    body: z.object({
      status: reportStatusSchema, 
      adminNotes: z.string().max(1000).optional().transform((val) => val ? clean(val) : val),
    }),
  });

  static listLogsSchema = z.object({
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      action: z.string().optional(),
      userId: z.string().regex(cmuIDRegex, "Invalid user ID format").optional(),
      startDate: z.string().datetime({ offset: true }).optional(),
      endDate: z.string().datetime({ offset: true }).optional(),
    }),
  });
  
  // Reuse existing schemas where possible
  static adminListPostsSchema = this.listPostsQuerySchema;
  static adminListArchivedPostsSchema = this.listMyPostsQuerySchema; // Assuming same pagination
  static adminListPostHistorySchema = this.listMyPostsQuerySchema; // Assuming same pagination
  static adminUpdatePostStatusSchema = z.object({
    params: z.object({ id: z.string().regex(cmuIDRegex, "Invalid ID format") }),
    body: z.object({ status: postStatusSchema }),
  });
  static adminListReportsSchema = this.listAllReportsSchema;
  // --- End Admin Schemas ---

  static forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address").refine((e) => e.toLowerCase().endsWith(cmuEmailDomain), {
      message: `Email must end with '${cmuEmailDomain}'`,
    }),
  });

  static resetPasswordSchema = z.object({
    token: z.string().min(32, "Invalid reset token"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
  });

  static validate(schema: z.ZodSchema, data: any) {
    const validation = schema.safeParse(data);
    if (!validation.success) {
         // Flatten errors for easier consumption on the frontend
         return validation.error.flatten();
    }
    return null; // Return null on success
  }
}

export default ValidationService;
