import { Request, Response, NextFunction } from "express";
import z from "zod";

const validateInputs = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({ errors: result.error.format() });
      return;
    }

    next();
  };
};

export default validateInputs;