// src/utils/asyncHandler.ts
//
// Wraps an async Express handler so any thrown/rejected error is forwarded to
// the central errorHandler. Removes the repetitive try/catch { next(err) }
// block from every controller (DRY).

import { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler =
  (fn: AsyncFn): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };