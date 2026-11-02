import cors from 'cors';
import express, { type Request, type Response } from 'express';
import morgan from 'morgan';
import { isProduction } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import sessionRoutes from './routes/session.routes';
import teacherRoutes from './routes/teacher.routes';
import userRoutes from './routes/user.routes';

const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '100kb' }));

if (!isProduction) {
  app.use(morgan('dev'));
}

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'Service is healthy' });
});

app.use('/users', userRoutes);
app.use('/teachers', teacherRoutes);
app.use('/sessions', sessionRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
