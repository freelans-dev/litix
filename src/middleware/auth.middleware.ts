import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const validToken = env.API_ACCESS_KEY || env.API_AUTH_TOKEN;

  // Skip auth if no token is configured
  if (!validToken) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } });
    return;
  }

  const token = authHeader.slice(7);
  if (token !== validToken) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
    return;
  }

  next();
}
