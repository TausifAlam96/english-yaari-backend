import { AppError } from './AppError';

/** Asserts a condition, throwing a 400 response error when it fails. */
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw AppError.badRequest(message);
}

export function requireString(value: unknown, field: string): string {
  assert(typeof value === 'string' && value.trim().length > 0, `${field} is required`);
  return value.trim();
}

export function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  assert(typeof value === 'string', `${field} must be a string`);
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function requireEmail(value: unknown, field = 'email'): string {
  const email = requireString(value, field).toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  assert(emailPattern.test(email), `${field} must be a valid email address`);
  return email;
}

export function optionalNumber(value: unknown, field: string, min?: number): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;

  const num = typeof value === 'number' ? value : Number(value);
  assert(Number.isFinite(num), `${field} must be a valid number`);
  if (min !== undefined) assert(num >= min, `${field} must be greater than or equal to ${min}`);
  return num;
}

export function requireDate(value: unknown, field: string): Date {
  assert(value !== undefined && value !== null && value !== '', `${field} is required`);

  const date = value instanceof Date ? value : new Date(value as string | number);
  assert(!Number.isNaN(date.getTime()), `${field} must be a valid date`);
  return date;
}

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

/** Accepts raw strings or Mongo ObjectIds and returns the 24-char hex string. */
export function requireObjectId(value: unknown, field: string): string {
  const raw =
    typeof value === 'string'
      ? value.trim()
      : value !== null && typeof value === 'object' && 'toString' in value
        ? String(value)
        : '';

  assert(OBJECT_ID_PATTERN.test(raw), `${field} must be a valid 24-character ObjectId`);
  return raw;
}
