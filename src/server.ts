import mongoose from 'mongoose';
import app from './app';
import { connectDatabase, disconnectDatabase } from './config/db';
import { env } from './config/env';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const server = app.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal: string) => {
    console.log(`[server] ${signal} received, shutting down gracefully`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandled rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[server] uncaught exception:', error);
  process.exit(1);
});

bootstrap().catch(async (error) => {
  console.error('[server] failed to start:', error);
  await mongoose.connection.close().catch(() => undefined);
  process.exit(1);
});
