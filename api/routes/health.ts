import { Router, Request, Response } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'AHSAS Express API',
    uptime: process.uptime(),
  });
});
