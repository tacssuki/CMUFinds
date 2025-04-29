import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client"; 


const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET environment variable is not set for token verification.");
    // Optionally throw an error to prevent startup without the secret
    // throw new Error("FATAL ERROR: JWT_SECRET environment variable is not set.");
}


declare module "express-serve-static-core" {
  interface Request {
    user?: AuthPayload;
  }
}

interface AuthPayload {
  userId: string;
  roles: Role[]; 
  ip?: string;
}

class TokenVerifier {
  public static verifyAuth(req: Request, res: Response, next: NextFunction): void {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      res.status(401).json({ message: "Unauthorized - No Token Provided" });
      return;
    }

    try {
      // Check if JWT_SECRET is loaded, otherwise verification will fail predictably
      if (!JWT_SECRET) {
           console.error("Token verification skipped: JWT_SECRET not loaded.");
           res.status(500).json({ message: "Server configuration error" });
           return;
      }
      const decodedjwt = jwt.verify(token, JWT_SECRET);

      if (typeof decodedjwt !== "object" || !decodedjwt) {
        console.error("JWT decoding failed or resulted in non-object:", decodedjwt);
        res.status(403).json({ message: "Invalid Token Structure" });
        return;
      }

      // Explicitly type the expected payload structure
      const payload = decodedjwt as { userId: string; roles: string[]; ip?: string; iat: number; exp: number }; // Added iat/exp

      if (!payload.userId || !Array.isArray(payload.roles)) {
         console.error("Invalid JWT payload structure:", payload);
         res.status(403).json({ message: "Invalid Token Payload" });
         return;
      }

      // Ensure roles are correctly cast to Prisma Role Enum and filter out invalid ones
      const validRoles = payload.roles
            .map(r => r as Role)
            .filter(r => Object.values(Role).includes(r));

      req.user = {
        userId: payload.userId,
        roles: validRoles, // Use the validated roles array
        ip: payload.ip,
      };

      next();
    } catch (error: any) {
        if (error instanceof jwt.TokenExpiredError) {
             res.status(401).json({ message: "Unauthorized - Token Expired" }); // Use 401 for expired
        } else if (error instanceof jwt.JsonWebTokenError) {
            console.error("JWT Verification Error:", error.message);
            res.status(403).json({ message: "Forbidden - Invalid Token Signature" }); // Use 403 for invalid signature/format
        } else {
            console.error("Unexpected error during token verification:", error);
            res.status(500).json({ message: "Internal Server Error during authentication" });
        }
      return; // Ensure we don't proceed after an error
    }
  }

  public static verifyAdmin(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
        // This case should ideally be caught by verifyAuth first, but added for robustness
        res.status(401).json({ message: "Unauthorized - Authentication Required" });
        return;
    }

    const { roles } = req.user;
    // Check if roles array exists and includes either ADMIN or DEVELOPER
    if (!roles || (!roles.includes(Role.ADMIN) && !roles.includes(Role.DEVELOPER))) {
      res.status(403).json({ message: "Forbidden - Administrator Privileges Required" });
      return;
    }

    next();
  }
}

export default TokenVerifier;