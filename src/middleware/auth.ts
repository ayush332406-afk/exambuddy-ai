import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin';
import { db } from '../db/index';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name: string;
  };
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      name: decodedToken.name || '',
    };
    
    next();
  } catch (error) {
    console.error('Authentication Error:', error);
    res.status(401).json({ error: 'Unauthorized: Token verification failed' });
  }
};

export const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  requireAuth(req, res, async () => {
    try {
      if (!req.user) return;
      const userDb = await db.select().from(users).where(eq(users.uid, req.user.uid)).limit(1);
      if (!userDb.length || userDb[0].role !== 'admin') {
        res.status(403).json({ error: 'Forbidden: Admin access required' });
        return;
      }
      next();
    } catch (error) {
      console.error('Admin Check Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
};
