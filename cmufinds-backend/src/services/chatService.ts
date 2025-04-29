import PrismaService from "./prismaService";
import { formatTimestamp } from "../utils/timeUtils";
import PDFDocument from "pdfkit";
import { Response } from "express";
import { NotificationType, Prisma } from "@prisma/client";
import notificationServiceInstance from "./notificationService";
import { getIO } from "./socketService";
import axios from 'axios';
import { Buffer } from 'buffer';

// Helper function to construct profile picture URL (can be moved to a util file)
const buildProfilePictureUrl = (filename: string | null): string | null => {
  if (!filename) return null;
  const baseUrl = process.env.API_URL || 'http://localhost:5000'; 
  // Ensure the path matches how files are served in server.ts
  return `${baseUrl}/api/v1/uploads/profiles/${filename}`; 
};

// Helper function to construct post image URL
const buildPostImageUrl = (filename: string | null): string | null => {
  if (!filename) return null;
  const baseUrl = process.env.API_URL || 'http://localhost:5000';
  // Ensure the path matches how files are served in server.ts
  return `${baseUrl}/api/v1/uploads/posts/${filename}`; 
};

// @ts-ignore - Ignoring potential PrismaClient known issues not relevant here
class ChatService {
  private prisma = PrismaService.getClient();
  // Declare property type without initializing here
  private notificationService: typeof notificationServiceInstance;

  constructor() {
    // Initialize the service instance inside the constructor
    this.notificationService = notificationServiceInstance; 
    console.log('[ChatService Constructor] Initial notificationService:', this.notificationService ? 'Defined' : '!!! UNDEFINED !!!');
  }

  public async getOrCreateThread(postId: string, claimerId: string) {
    try {
      // Log removed, constructor log should be sufficient now
      // console.log('[getOrCreateThread] Checking this.notificationService before use:', this.notificationService ? 'Defined' : '!!! UNDEFINED !!!');

      // Get post details including owner
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        select: { 
          id: true, 
          title: true,
          userId: true,
          user: {
            select: { name: true, username: true }
          }
        }
      });

      if (!post) {
        return { status: 404, message: "Post not found" };
      }

      const ownerId = post.userId;

      // Don't allow creating a thread with yourself
      if (ownerId === claimerId) {
        return { status: 400, message: "Cannot start a conversation with yourself" };
      }

      // Use raw SQL for finding thread to bypass TypeScript errors
      // @ts-ignore
      const existingThreads = await this.prisma.$queryRaw`
        SELECT t.id FROM "Thread" t
        JOIN "ThreadParticipant" tp1 ON t."id" = tp1."threadId" AND tp1."userId" = ${ownerId}
        JOIN "ThreadParticipant" tp2 ON t."id" = tp2."threadId" AND tp2."userId" = ${claimerId}
        WHERE t."postId" = ${postId}
        LIMIT 1
      `;

      // Check if thread exists
      if (existingThreads && Array.isArray(existingThreads) && existingThreads.length > 0) {
        // Thread exists, get details
        // @ts-ignore
        const threadDetails = await this.prisma.thread.findUnique({
          where: { id: existingThreads[0].id },
          include: {
            participants: {
              include: {
                user: {
                  select: { id: true, name: true, username: true }
                }
              }
            },
            post: {
              select: { id: true, title: true, type: true }
            }
          }
        });
        
        return { status: 200, data: threadDetails };
      }

      // Thread doesn't exist, create it in a transaction
      // @ts-ignore
      const newThread = await this.prisma.$transaction(async (tx) => {
        // Create thread
        // @ts-ignore
        const thread = await tx.thread.create({
          data: { postId }
        });
        
        // Create participants
        // @ts-ignore
        const ownerParticipant = await tx.threadParticipant.create({
          data: {
            threadId: thread.id,
            userId: ownerId
          },
          include: {
            user: {
              select: { name: true }
            }
          }
        });
        
        // @ts-ignore
        const claimerParticipant = await tx.threadParticipant.create({
          data: {
            threadId: thread.id,
            userId: claimerId
          },
          include: {
            user: {
              select: { name: true }
            }
          }
        });
        
        // Create system message
        // @ts-ignore
        await tx.message.create({
          data: {
            threadId: thread.id,
            text: `Conversation started about ${post.title}`,
            isSystemMessage: true
          }
        });
        
        // Create notification for post owner
        await this.notificationService.createNotification(
          ownerId,
          "NEW_THREAD" as any,  // Force the type to be compatible
          `${claimerParticipant.user.name} started a conversation about your ${post.title} post`,
          {
            threadId: thread.id,
            postId
          }
        );
        
        // Return full thread details
        const fullNewThread = await tx.thread.findUnique({
          where: { id: thread.id },
          include: { // Ensure necessary includes for the client
            participants: {
              include: {
                user: { select: { id: true, name: true, username: true, profilePicture: true } }
              }
            },
            post: {
              select: { id: true, title: true, type: true, images: true } 
            },
            messages: { // Include the initial system message
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { text: true, createdAt: true }
            }
          }
        });

        // --- Emit new_thread event --- 
        if (fullNewThread) {
          const io = getIO();
          // Add profilePictureUrl and post.imageUrl
          const threadWithUrls = {
            ...fullNewThread,
            participants: fullNewThread.participants.map(p => ({
              ...p,
              user: {
                ...p.user,
                profilePictureUrl: buildProfilePictureUrl(p.user.profilePicture)
              }
            })),
            post: {
              ...fullNewThread.post,
              imageUrl: buildPostImageUrl(fullNewThread.post.images?.[0])
            }
          };
          // Emit to both participants
          io.to(ownerId).to(claimerId).emit('new_thread', threadWithUrls);
          console.log(`Emitted 'new_thread' for thread ${thread.id} to users ${ownerId} and ${claimerId}`);
        }
        // --- End Emit new_thread event ---
        
        return fullNewThread; // Return the detailed thread
      });
      
      return { status: 200, data: newThread };
    } catch (error) {
      console.error("Error in getOrCreateThread:", error);
      return { status: 500, message: "Failed to create or retrieve thread" };
    }
  }

  public async getMessages(threadId: string) {
    try {
      // First verify the thread exists
      // @ts-ignore
      const thread = await this.prisma.thread.findUnique({
        where: { id: threadId }
      });

      if (!thread) {
        return { status: 404, message: "Thread not found" };
      }

      // Get all messages with detailed sender information
      // @ts-ignore
      const messagesRaw = await this.prisma.message.findMany({
        where: { threadId },
        orderBy: { createdAt: 'asc' },
        include: {
          sender: {
            include: {
              user: {
                select: { 
                  id: true, 
                  name: true, 
                  username: true,
                  profilePicture: true // Select the filename
                }
              }
            }
          }
        }
      });

      // Manually construct profilePictureUrl for each message sender
      const messages = messagesRaw.map(msg => ({
        ...msg,
        sender: msg.sender ? {
          ...msg.sender,
          user: {
             ...msg.sender.user,
             profilePictureUrl: buildProfilePictureUrl(msg.sender.user.profilePicture)
          }
        } : null
      }));
      
      // Log message count and sample data for debugging
      console.log(`Retrieved ${messages.length} messages for thread ${threadId}`);
      if (messages.length > 0) {
        const sampleMessage = messages[0];
        console.log('Sample message data:', {
          id: sampleMessage.id,
          text: sampleMessage.text,
          senderId: sampleMessage.senderId,
          hasSystemMessage: sampleMessage.isSystemMessage
        });
      }

      return { status: 200, data: messages };
    } catch (error) {
      console.error("Error in getMessages:", error);
      return { status: 500, message: "Failed to retrieve messages" };
    }
  }

  // Renamed senderId parameter to userId for clarity
  public async sendMessage(threadId: string, userId: string, text: string, imageUrl?: string) {
    try {
      // --- Authorization Check ---
      const thread = await this.prisma.thread.findFirst({
        where: {
          id: threadId,
          participants: {
            some: { userId: userId } // Ensure user is a participant
          }
        },
        include: {
          participants: {
            select: { id: true, userId: true, user: { select: { name: true } } } // Include participant ID
          }
        }
      });

      if (!thread) {
        return { status: 404, message: "Thread not found or you are not a participant." };
      }
      // --- End Authorization Check ---

      // --- Find Thread Participant ID ---
      const participant = thread.participants.find(p => p.userId === userId);
      if (!participant) {
        // This should ideally not happen if the above check passed, but safety first.
        console.error(`Consistency error: User ${userId} is participant but record not found in included data for thread ${threadId}`);
        return { status: 500, message: "Internal server error finding sender participant." };
      }
      const threadParticipantId = participant.id; // Get the actual ThreadParticipant ID
      // --- End Find Thread Participant ID ---
      
      // Create message using the correct ThreadParticipant ID
      const newMessage = await this.prisma.message.create({
        data: {
          threadId,
          senderId: threadParticipantId, // Use the ThreadParticipant ID here
          text,
          imageUrl,
          isSystemMessage: false
        },
        include: {
          sender: { // Sender is the ThreadParticipant
            include: {
              user: { select: { id: true, name: true, username: true, profilePicture: true } } // User details nested
            }
          }
        }
      });

      // Build message with sender profile picture URL (logic is fine)
      const messageWithPic = {
        ...newMessage,
        sender: newMessage.sender ? {
          ...newMessage.sender,
          user: {
             ...newMessage.sender.user,
             profilePictureUrl: buildProfilePictureUrl(newMessage.sender.user.profilePicture)
          }
        } : null
      }
      
      // Emit message via Socket.IO (logic is fine)
      const io = getIO();
      io.to(threadId).emit("new_message", messageWithPic);
      
      // Create notifications for other participants (uses userId, which is correct here)
      const otherParticipants = thread.participants.filter(p => p.userId !== userId);
      const senderName = participant.user?.name || "Someone"; // Use name from participant data found earlier

      for (const otherParticipant of otherParticipants) {
        await this.notificationService.createNotification(
          otherParticipant.userId, // Notify the user
          NotificationType.NEW_MESSAGE,
          `${senderName} sent you a message`,
          { 
            threadId: threadId,
            messageId: newMessage.id,
            senderId: userId // Metadata can keep the original userId if needed
          }
        );
      }
      
      return { status: 200, data: messageWithPic };
    } catch (error) {
      console.error("Error sending message:", error);
       // Log the specific Prisma error code if available
      if ((error as any).code) {
        console.error("Prisma Error Code:", (error as any).code);
      }
      return { status: 500, message: "Failed to send message" };
    }
  }

  // Updated to accept userId for authorization check
  public async exportThreadAsPDF(threadId: string, userId: string, res: Response) {
    try {
      // --- Authorization Check ---
      const thread = await this.prisma.thread.findFirst({
        where: {
          id: threadId,
          participants: {
            some: { userId: userId } // Check if requesting user is a participant
          }
        },
        include: {
          participants: {
            include: {
              user: { select: { name: true } }
            }
          }
        }
      });

      if (!thread) {
        res.status(404).send("Thread not found or you do not have access.");
        return;
      }
      // --- End Authorization Check ---

      // Fetch messages separately
      const messages = await this.prisma.message.findMany({
        where: { threadId },
        orderBy: { createdAt: 'asc' },
        include: {
          sender: {
            include: {
              user: {
                select: { 
                  id: true, 
                  name: true, 
                  username: true,
                  profilePicture: true // Select the filename
                }
              }
            }
          }
        }
      });

      // Fetch post details separately using the validated thread
      const post = await this.prisma.post.findUnique({
        where: { id: thread.postId }, // Use thread.postId
        select: { title: true, type: true }
      });

      if (!messages || messages.length === 0) {
        res.status(404).json({ message: "No messages found in the thread" });
        return;
      }
      
      if (!post) {
         // Should not happen if thread exists, but good to check
         res.status(404).json({ message: "Associated post not found" });
         return;
      }

      // Setup PDF
      const defaultMargins = { top: 50, bottom: 50, left: 72, right: 72 };
      const doc = new PDFDocument({ margins: defaultMargins });
      
      // Use fetched post details
      const postTitleSafe = post.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `cmufinds_chat_${postTitleSafe}_${threadId.substring(0, 6)}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      doc.pipe(res);

      // --- PDF Content (Simplified) ---
      doc.fontSize(18).font('Helvetica-Bold').text('Conversation Export', { align: 'center' });
      doc.moveDown(1.5);
      
      // Format Post and Type on one line with consistent bold labels
      doc.fontSize(12).font('Helvetica-Bold').text('Post: ', { continued: true })
        .font('Helvetica').text(`${post.title}  `, { continued: true }) // Use fetched post title
        .font('Helvetica-Bold').text('Type: ', { continued: true })
        .font('Helvetica').text(post.type); // Use fetched post type
      doc.moveDown(0.5);
      
      // Format Participants
      const participantNames = thread.participants
        .map(p => p.user.name) // Select only the name
        .join(", ");
      doc.fontSize(10).font('Helvetica-Bold').text('Participants: ', { continued: true })
        .font('Helvetica').text(participantNames);
      doc.moveDown(1); // Add space before messages

      doc.fontSize(12).font('Helvetica-Bold').text('Messages:');
      doc.moveDown(1);

      const pageMargins = doc.options.margins ?? defaultMargins;
      const pageContentWidth = doc.page.width - pageMargins.left - pageMargins.right;

      for (const msg of messages) {
        const senderName = msg.sender?.user?.name || 'Unknown User';
        const timestamp = formatTimestamp(msg.createdAt);

        doc.font('Helvetica').fontSize(10);

        if (msg.isSystemMessage) {
          doc.fillColor('grey').text(`--- ${msg.text} ---`, { align: 'center' });
          doc.fillColor('black');
          doc.moveDown(0.5);
        } else {
          // Simple layout: Sender Name, then Text, then Image, then Timestamp right-aligned
          doc.font('Helvetica-Bold').text(senderName + ":");
          doc.font('Helvetica').fontSize(10);
          
          if (msg.text && msg.text.trim() !== '') {
             doc.text(msg.text, { width: pageContentWidth }); // Use full width for text
             doc.moveDown(0.3);
          }

          // Message Image (Fetch and Embed)
          if (msg.imageUrl) {
             try {
              const response = await axios.get(msg.imageUrl, { responseType: 'arraybuffer', timeout: 5000 });
              const imageBuffer = Buffer.from(response.data as ArrayBuffer);

              if (imageBuffer && imageBuffer.length > 0) {
                 const imageMaxWidth = pageContentWidth * 0.6; // Max width for image
                 try {
                    doc.image(imageBuffer, { fit: [imageMaxWidth, 150] }); 
                    doc.moveDown(0.5); // Space after image
                 } catch (imgError: any) {
                    console.error(`Error embedding image ${msg.imageUrl} in PDF:`, imgError.message);
                    doc.fontSize(8).fillColor('red').text('[Could not embed image]', { width: pageContentWidth });
                    doc.fillColor('black'); 
                 }
              } else {
                 doc.fontSize(8).fillColor('orange').text('[Image data empty or invalid]', { width: pageContentWidth });
                 doc.fillColor('black');
              }
            } catch (error: any) {
              console.error(`Failed to fetch image ${msg.imageUrl} for PDF:`, error.message);
              doc.fontSize(8).fillColor('red').text('[Image not found or fetch error]', { width: pageContentWidth });
              doc.fillColor('black');
            }
          }
          
          // Timestamp (aligned right, below other content)
          doc.fontSize(8).font('Helvetica-Oblique').text(timestamp, { align: 'right' });
          doc.moveDown(1); // Space between messages
        }
      } 

      // Footer
      doc.fontSize(9).font('Helvetica').fillColor('grey').text(`Exported on ${formatTimestamp(new Date())}`, { align: 'center' });

      doc.end();

    } catch (error) {
      console.error("Error in exportThreadAsPDF:", error);
      if (!res.headersSent) {
         res.status(500).json({ message: "Failed to export conversation due to server error" });
      } else {
         console.error("Headers already sent, could not send JSON error response for PDF export failure.");
         res.end();
      }
    }
  }

  /**
   * Get all chat threads for a user
   * @param userId The ID of the user
   */
  public async getUserThreads(userId: string) {
    try {
      // Find all threads where the user is a participant
      // @ts-ignore
      const threadsRaw = await this.prisma.thread.findMany({
        where: {
          participants: {
            some: { userId }
          }
        },
        include: {
          participants: {
            include: {
              user: {
                select: { id: true, name: true, username: true, profilePicture: true } // Also select profile pic here for participant info if needed later
              }
            }
          },
          post: {
            select: { id: true, title: true, type: true, images: true } // Select images array
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { text: true, createdAt: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Manually construct profilePictureUrl for participants and postImageUrl for post
      const threads = threadsRaw.map(thread => {
        const participantsWithUrls = thread.participants.map(p => ({
          ...p,
          user: {
            ...p.user,
            profilePictureUrl: buildProfilePictureUrl(p.user.profilePicture)
          }
        }));

        const firstPostImage = thread.post.images && thread.post.images.length > 0 ? thread.post.images[0] : null;
        
        return {
          ...thread,
          participants: participantsWithUrls,
          post: {
            ...thread.post,
            imageUrl: buildPostImageUrl(firstPostImage) // Add the first image URL as imageUrl
          }
        };
      });

      return { status: 200, data: threads };
    } catch (error) {
      console.error("Error in getUserThreads:", error);
      return { status: 500, message: "Failed to retrieve threads" };
    }
  }

  /**
   * Get a specific thread by ID and verify user access
   * @param threadId The ID of the thread
   * @param userId The ID of the user requesting access
   */
  public async getThreadById(threadId: string, userId: string) {
    try {
      // --- Authorization Check Integrated ---
      const thread = await this.prisma.thread.findFirst({
        where: {
          id: threadId,
          participants: { some: { userId } } // Check participation
        },
        include: {
          participants: {
            include: {
              user: { select: { id: true, name: true, username: true } }
            }
          },
          post: {
            select: { id: true, title: true, type: true }
          }
        }
      });

      if (!thread) {
        return { status: 404, message: "Thread not found or access denied." };
      }
      // --- End Authorization Check ---

      return { status: 200, data: thread };
    } catch (error) {
      console.error(`Error getting thread ${threadId} for user ${userId}:`, error);
      return { status: 500, message: "Internal server error retrieving thread" };
    }
  }
}

export default new ChatService();
