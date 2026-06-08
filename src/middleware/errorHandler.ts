// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
    console.error("Unhandled Error:", err); // log the error for debugging
  res.status(500).json({
    message: 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
    // only expose error details in development, never in production

  });
};