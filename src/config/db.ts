import mongoose from 'mongoose';
import { env } from './env';

mongoose.set('strictQuery', true);

export async function connectDatabase(uri: string = env.mongoUri): Promise<void> {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10_000,
    });
    console.log(`[db] connected to ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[db] connection failed: ${message}`);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
  console.log('[db] connection closed');
}
