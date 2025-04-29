import rateLimit from "express-rate-limit";

class RateLimiter {
  private static createRateLimiter(windowMs: number, max: number, message: string) {
    return rateLimit({
      windowMs,
      max,
      message: { error: message },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  public static registerLimiter = RateLimiter.createRateLimiter(
    15 * 60 * 1000, // 15mins
    8, 
    "Too many registration attempts. Try again later."
  );

  public static loginLimiter = RateLimiter.createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, 
    "Too many login attempts. Please try again later."
  );
  
  public static postLimiter = RateLimiter.createRateLimiter(
    10 * 60 * 1000, // 10mins
    8, 
    "Too many posts created, slow down!"
  );

  public static chatLimiter = RateLimiter.createRateLimiter(
    10 * 60 * 1000, // 1mins
    15, 
    "Too many posts created, slow down!"
  );

  public static reportLimiter  = RateLimiter.createRateLimiter(
    5 * 1000, 
    5,               
    "You can only file 5 reports per 5 minutes."
  );

  public static forgotPasswordLimiter = RateLimiter.createRateLimiter(
    60 * 60 * 1000, // 1 hour
    3,  // 3 attempts per hour
    "Too many password reset requests. Try again later."
  );

  public static resetPasswordLimiter = RateLimiter.createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // 5 attempts per 15 minutes
    "Too many password reset attempts. Try again later."
  );
}

export default RateLimiter;
