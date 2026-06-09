// src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      // Zod gives you a detailed list of exactly what failed
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      return res.status(400).json({ message: 'Validation failed', errors });
    }

    // Replace req.body with the validated + typed data
    req.body = result.data;
    next();
  };
};