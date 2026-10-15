import { Request, Response, NextFunction } from 'express';
import { supabaseServer, createAuthenticatedClient } from '../lib/supabaseServer';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
  supabaseUserClient?: any;
}

const MASTER_ADMINS = ['ahsaslab@gmail.com', 'mmmed8833@gmail.com'];

/**
 * Middleware to authenticate requests via Supabase JWT Bearer token
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized. Authentication token is missing.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabaseServer.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Unauthorized. Invalid or expired token.' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    // Attach user-scoped client that preserves RLS
    req.supabaseUserClient = createAuthenticatedClient(token);

    next();
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
}

/**
 * Middleware to verify that the caller is an authorized Admin
 */
export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.user || !req.user.email) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  const userEmail = req.user.email.toLowerCase();

  // 1. Fast-path: Master admins
  if (MASTER_ADMINS.includes(userEmail)) {
    next();
    return;
  }

  // 2. Check admin_users table using server client
  try {
    const { data: adminRecord, error } = await supabaseServer
      .from('admin_users')
      .select('email')
      .eq('email', userEmail)
      .maybeSingle();

    if (error || !adminRecord) {
      res.status(403).json({ error: 'Forbidden. Administrator privileges required.' });
      return;
    }

    next();
  } catch (err: any) {
    res.status(500).json({ error: 'Authorization check failed.' });
  }
}
