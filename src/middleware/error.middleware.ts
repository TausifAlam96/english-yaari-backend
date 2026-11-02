import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { isProduction } from '../config/env';
import { AppError } from '../utils/AppError';

interface ErrorBody {
  success: false;
  message: string;
  details?: unknown;
  stack?: string;
}

function buildDuplicateKeyMessage(error: { keyValue?: Record<string, unknown> }): string {
  const field = error.keyValue ? Object.keys(error.keyValue)[0] : undefined;
  return field ? `${field} must be unique` : 'Duplicate value violates a unique constraint';
}

/** Catches unmatched routes and forwards a 404 to the central handler. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
}

/**
 * Centralized error handler. Every error - validation, cast, duplicate key,
 * application error, or unexpected failure - ends up here.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: unknown;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    details = error.details;
  } else if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(error.errors).map((validationError) => validationError.message);
  } else if (error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value for ${error.path}`;
  } else if (error instanceof mongoose.Error.DocumentNotFoundError) {
    statusCode = 404;
    message = 'Document not found';
  } else if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  ) {
    statusCode = 409;
    message = buildDuplicateKeyMessage(error as { keyValue?: Record<string, unknown> });
  } else if (error instanceof SyntaxError && 'body' in error) {
    statusCode = 400;
    message = 'Request body contains invalid JSON';
  } else if (error instanceof Error) {
    message = isProduction ? 'Internal server error' : error.message;
  }

  if (statusCode >= 500) {
    console.error('[error]', error);
  }

  const body: ErrorBody = { success: false, message };
  if (details !== undefined) body.details = details;
  if (!isProduction && error instanceof Error && statusCode >= 500) {
    body.stack = error.stack;
  }

  res.status(statusCode).json(body);
}
