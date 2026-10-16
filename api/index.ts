import express, { Express, Request, Response } from 'express';
import { healthRouter } from './routes/health';
import { eduDayRouter } from './routes/eduDay';
import { errorHandler } from './middleware/errorMiddleware';

const app: Express = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic CORS headers
app.use((req: Request, res: Response, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Mount Routes
app.use('/api/health', healthRouter);
app.use('/api/edu-day', eduDayRouter);

// Centralized error handler
app.use(errorHandler);

// Standalone execution for local development
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL && !process.env.IS_TEST) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`[AHSAS API] Server running locally on http://localhost:${PORT}`);
  });
}

// Export for Vercel Serverless Function handler
export default app;
