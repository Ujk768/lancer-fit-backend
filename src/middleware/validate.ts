// src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
   console.log("Schema in validate middleware",req.body)
    const result = schema.safeParse(req.body);
    if (!result.success) {
      // Zod gives you a detailed list of exactly what failed
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return res.status(400).json({ message: 'Validation failed', errors });
    }

    // Replace req.body with the validated + typed data
    req.body = result.data;
    next();
  };
};