import { Server, Socket } from "socket.io";
import http from "http";
import jwt from 'jsonwebtoken';
import { ExtendedError } from "socket.io/dist/namespace";
// import { getIO } from "./socketService";
// import { AuthPayload } from "../middleware/validateTokens"; // Removed as AuthPayload might not be exported

// Define a type for expected client events if needed
// interface ClientToServerEvents {
//   join_thread: (threadId: string) => void;
// }

// Define a type for server-to-client events
interface ServerToClientEvents {
  new_message: (message: any) => void; // Type 'any' for now, refine later with actual message type
  new_notification: (notification: any) => void; // Add new_notification event
  new_thread: (thread: any) => void; // Add new_thread event type
  // Add other events like 'user_status' etc. if needed
}

// Define client-to-server events
interface ClientToServerEvents {
  join_thread: (threadId: string) => void;
  join_user_room: (userId: string) => void; // Add join_user_room event type
  // leave_thread?: (threadId: string) => void;
}

// Define inter-server events if needed (for multi-instance scaling)
// interface InterServerEvents {}

// Define expected structure of the decoded JWT payload
interface AuthPayload {
  userId: string;
  roles?: string[];
  // Add other fields from your JWT payload if necessary
}

// Define the shape of Socket data after authentication
interface SocketData {
  userId: string;
  roles: string[];
}

let io: Server<ClientToServerEvents, ServerToClientEvents, any, SocketData>; // Add SocketData here

const initializeSocketIO = (httpServer: http.Server) => {
  io = new Server<ClientToServerEvents, ServerToClientEvents, any, SocketData>(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Optional: Add ping timeout/interval for connection stability
    // pingTimeout: 60000, 
    // pingInterval: 25000,
  });

  console.log("🔌 Socket.IO initialized");

  // --- Socket.IO Authentication Middleware ---
  io.use(async (socket: Socket<ClientToServerEvents, ServerToClientEvents, any, SocketData>, next: (err?: ExtendedError | undefined) => void) => {
    // Extract token from handshake query (adjust if passed differently, e.g., auth header)
    const token = socket.handshake.query.token as string;
    const jwtSecret = process.env.JWT_SECRET;

    if (!token) {
      console.log(`Socket (${socket.id}): Authentication failed - No token provided`);
      return next(new Error("Authentication error: No token provided"));
    }
    if (!jwtSecret) {
      console.error(`Socket (${socket.id}): Authentication failed - JWT_SECRET not configured on server`);
      return next(new Error("Authentication configuration error"));
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, jwtSecret) as AuthPayload;

      // Attach user info to the socket object for later use in event handlers
      socket.data.userId = decoded.userId;
      socket.data.roles = decoded.roles || []; 
      
      console.log(`Socket (${socket.id}): Authenticated successfully for user ${decoded.userId}`);
      next(); // Proceed with connection
    } catch (error) {
      console.log(`Socket (${socket.id}): Authentication failed - Invalid token`, error);
      next(new Error("Authentication error: Invalid token")); // Reject connection
    }
  });
  // --- End Authentication Middleware ---

  io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents, any, SocketData>) => {
    // Access authenticated user data via socket.data
    const authenticatedUserId = socket.data.userId;
    console.log(`⚡: User connected - Socket ID: ${socket.id}, User ID: ${authenticatedUserId}`);

    // Handle joining specific chat threads
    socket.on("join_thread", (threadId: string) => {
      if (!threadId) {
         console.warn(`Socket ${socket.id} (User ${authenticatedUserId}) tried to join invalid thread room.`);
         return; 
      }
      
      console.log(`Socket ${socket.id} (User ${authenticatedUserId}) joined thread room: ${threadId}`);
      socket.join(threadId); 
    });
    
    // --- Handle joining user-specific room for notifications ---
    socket.on("join_user_room", (userIdFromClient: string) => {
      // --- Authorization Check ---
      if (!userIdFromClient || userIdFromClient !== authenticatedUserId) {
        console.warn(`Socket ${socket.id} (User ${authenticatedUserId}) attempted to join unauthorized user room: ${userIdFromClient}`);
        // Optionally emit an error back to the client
        // socket.emit('error', { message: 'Cannot join notification room for another user.' });
        return; 
      }
      // --- End Authorization Check ---

      // If checks pass, proceed to join the validated room
      console.log(`Socket ${socket.id} (User ${authenticatedUserId}) joined self user room: ${authenticatedUserId}`);
      socket.join(authenticatedUserId); // Use the authenticated ID for the room name
    });
    // --- End Handle joining user-specific room ---

    // Handle leaving threads (optional, if component explicitly leaves)
    // socket.on("leave_thread", (threadId: string) => {
    //   console.log(`Socket ${socket.id} left thread room: ${threadId}`);
    //   socket.leave(threadId);
    // });

    socket.on("disconnect", (reason) => {
      console.log(`🔌: User disconnected - Socket ID: ${socket.id}, Reason: ${reason}`);
      // Clean up any specific user state if necessary
    });
    
    // Handle potential errors
     socket.on("error", (err) => {
        console.error(`Socket Error (${socket.id}):`, err);
     });
  });

  return io;
};

const getIO = (): Server<ClientToServerEvents, ServerToClientEvents, any, SocketData> => {
  if (!io) {
    throw new Error("Socket.IO not initialized!");
  }
  return io;
};

export { initializeSocketIO, getIO }; 