import express from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import authRoutes from "./routes/authRoutes";
import postRoutes from "./routes/postRoutes";
import userRoutes from "./routes/userRoutes";
import chatRoutes from "./routes/chatRoutes";
import adminRoutes from "./routes/adminRoutes";
import reportRoutes from "./routes/reportRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import UploadService from "./services/uploadService";
import fs from "fs";
import morgan from 'morgan';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import { initializeSocketIO } from "./services/socketService";
import http from "http";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Rate Limiting ---
// General limiter for all requests to API
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Stricter limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // Limit each IP to 5 login attempts per `window`
  message: 'Too many login attempts from this IP, please try again after 10 minutes',
  skipSuccessfulRequests: true, // Don't count successful logins towards the limit
});
// --- End Rate Limiting ---

// Create HTTP server from Express app
const httpServer = http.createServer(app);

// Initialize Socket.IO and pass the HTTP server
initializeSocketIO(httpServer);

// Configure static file serving with CORS
const staticOptions = {
  setHeaders: (res: express.Response, path: string) => {
    // Allow access from any origin for images
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Disable caching completely
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    
    // Ensure proper content types for images
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.set('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.png')) {
      res.set('Content-Type', 'image/png');
    } else if (path.endsWith('.webp')) {
      res.set('Content-Type', 'image/webp');
    } else if (path.endsWith('.gif')) {
      res.set('Content-Type', 'image/gif');
    } else {
      res.set('Content-Type', 'application/octet-stream');
    }
  },
  // Don't use ETAG to avoid cache issues
  etag: false,
  // Set maximum age to 0 to prevent caching
  maxAge: 0
};

// Ensure upload directories exist
UploadService.ensureDirs();

// Middleware
app.set("trust proxy", 1);
app.use(helmet({
  crossOriginResourcePolicy: { 
    policy: "cross-origin" 
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        process.env.FRONTEND_URL || "http://localhost:3000",
        process.env.API_URL || "http://localhost:5000",
        (process.env.API_URL || "http://localhost:5000").replace(/^http/, 'ws')
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        process.env.FRONTEND_URL || "http://localhost:3000"
      ],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    }
  },
  // Disable X-Content-Type-Options for images
  xContentTypeOptions: false
}));
// http://localhost:3000
app.use(cors({
  origin: process.env.FRONTEND_URL  || 'http://localhost:3000',  
  methods: ["GET","POST","PUT","PATCH","DELETE"],
  credentials: true
}));

// Add CORS headers to all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(compression());
// REMOVED: Global API rate limiter - too restrictive for general use
// app.use('/api', limiter); 
app.use(morgan('dev'));

// Directly serve static files from the uploads directory without API prefix
app.use('/uploads/posts', express.static(path.join(__dirname, '../uploads/posts'), staticOptions));
app.use('/uploads/profiles', express.static(path.join(__dirname, '../uploads/profiles'), staticOptions));
app.use('/uploads/chat-images', express.static(path.join(__dirname, '../uploads/chat-images'), staticOptions));

// Also serve from the API paths
app.use('/api/v1/uploads/posts', express.static(path.join(__dirname, '../uploads/posts'), staticOptions));
app.use('/api/v1/uploads/profiles', express.static(path.join(__dirname, '../uploads/profiles'), staticOptions));
app.use('/api/v1/uploads/chat-images', express.static(path.join(__dirname, '../uploads/chat-images'), staticOptions));

// Add a test route to check uploads directory status
app.get('/api/v1/test-uploads', (req: express.Request, res: express.Response) => {
  const profilesDir = path.join(__dirname, '../uploads/profiles');
  const postsDir = path.join(__dirname, '../uploads/posts');
  
  const result = {
    profilesDir: {
      exists: fs.existsSync(profilesDir),
      isDirectory: fs.existsSync(profilesDir) ? fs.statSync(profilesDir).isDirectory() : false,
      path: profilesDir,
      contents: fs.existsSync(profilesDir) ? fs.readdirSync(profilesDir) : []
    },
    postsDir: {
      exists: fs.existsSync(postsDir),
      isDirectory: fs.existsSync(postsDir) ? fs.statSync(postsDir).isDirectory() : false,
      path: postsDir,
      contents: fs.existsSync(postsDir) ? fs.readdirSync(postsDir) : []
    }
  };
  
  res.status(200).json(result);
});

// Apply stricter limiter specifically to auth routes BEFORE the general routes
app.use('/api/v1/auth', authLimiter);

// API Routes 
app.use("/api/v1/admin", adminRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/posts', postRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/chats", chatRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/uploads", uploadRoutes);

// Error handling middleware
app.use((req, res) => {
  res.status(404).json({ error: 'Oppsie, Where are you goingn?' });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const status = err.status || 500;
  const message = (process.env.NODE_ENV === 'production' && status === 500)
    ? "Internal Server Error"
    : (err.message || "An unexpected error occurred");

  res.status(status).json({ message });
});

// Root route
app.get("/", (req, res) => {  
  res.send("CMUFinds API is running! 🚀");
});

// Start the HTTP server instead of the Express app
httpServer.listen(PORT, () => {
  console.log(`🚀 CMUFinds API & Socket.IO Server running on PORT : ${PORT}`);
});

// Export the httpServer if needed elsewhere, otherwise default export might not be needed
// export default httpServer; // Or adjust export based on usage
