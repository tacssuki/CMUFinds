import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError, z } from 'zod';

// Helper function to safely parse a part of the request
const safeParsePart = async (schema: z.ZodTypeAny, data: any) => {
  try {
    return { success: true, data: await schema.parseAsync(data) };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, errors: error.flatten() }; // Use flatten() for better error structure
    }
    throw error; // Re-throw unexpected errors
  }
};

export const validate = 
  (schema: AnyZodObject) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let validationErrors: Record<string, any> = {};
      let hasErrors = false;

      // Check and validate req.body if schema defines it
      if (schema.shape.body) {
        const result = await safeParsePart(schema.shape.body, req.body);
        if (!result.success) {
          validationErrors.body = result.errors?.fieldErrors;
          hasErrors = true;
        }
        // Note: Zod parsing might replace req.body with coerced/transformed values
        // It's generally safer NOT to reassign req.body here unless explicitly needed
        // req.body = result.data; 
      }

      // Check and validate req.query if schema defines it
      if (schema.shape.query) {
        const result = await safeParsePart(schema.shape.query, req.query);
        if (!result.success) {
          validationErrors.query = result.errors?.fieldErrors;
          hasErrors = true;
        }
        // req.query = result.data;
      }

      // Check and validate req.params if schema defines it
      if (schema.shape.params) {
        const result = await safeParsePart(schema.shape.params, req.params);
        if (!result.success) {
          validationErrors.params = result.errors?.fieldErrors;
          hasErrors = true;
        }
        // req.params = result.data;
      }

      // If any part failed validation, return the combined errors
      if (hasErrors) {
        console.warn('Validation Error: ', JSON.stringify(validationErrors));
        res.status(400).json({ errors: validationErrors });
        return;
      }

      // All relevant parts validated successfully
      return next();
      
    } catch (error) {
      // Catch unexpected errors from safeParsePart or elsewhere
      console.error("Unexpected validation error:", error);
      res.status(500).json({ error: 'Internal Server Error during validation' });
      return;
    }
  }; 