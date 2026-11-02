import dotenv from 'dotenv';

dotenv.config();

function readNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw.trim() === '') return fallback;

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Environment variable ${key} must be a valid number, received "${raw}"`);
  }
  return value;
}

function readString(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value !== undefined && value.trim() !== '') return value.trim();
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${key}`);
}

export const env = {
  nodeEnv: readString('NODE_ENV', 'development'),
  port: readNumber('PORT', 5000),
  mongoUri: readString('MONGODB_URI', 'mongodb://127.0.0.1:27017/english_yaari'),
} as const;

export const isProduction = env.nodeEnv === 'production';
