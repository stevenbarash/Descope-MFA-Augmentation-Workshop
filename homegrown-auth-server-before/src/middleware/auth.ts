import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';

interface User {
  id: string;
  username: string;
}

interface AuthRequest extends Request {
  user?: User;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || '');
    const { payload } = await jwtVerify(token, secret);
    
    // Verify the payload contains the expected data
    if (payload.userId && payload.username) {
      // Attach user info to request
      req.user = {
        id: payload.userId as string,
        username: payload.username as string
      };
      next();
    } else {
      res.status(401).json({ message: 'Invalid token payload' });
    }
  } catch (error) {
    console.error('Error verifying JWT:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};