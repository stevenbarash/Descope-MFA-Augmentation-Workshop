import { Router, Request, Response } from 'express';
import { SignJWT, jwtVerify } from 'jose';

const router = Router();

// Dummy user for demonstration
const dummyUser = {
  id: '1',
  username: 'testuser',
};

// Login endpoint
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  
  if (username === 'testuser' && password === 'password') {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || '');
      const token = await new SignJWT({ userId: dummyUser.id, username: dummyUser.username })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(secret);
      
      res.json({
        token,
        user: {
          id: dummyUser.id,
          username: dummyUser.username,
        }
      });
    } catch (error) {
      console.error('Error signing JWT:', error);
      res.status(500).json({ message: 'Error creating token' });
    }
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// User info endpoint
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || '');
    const { payload } = await jwtVerify(token, secret);
    
    // Verify the payload contains the expected data
    if (payload.userId && payload.username) {
      res.json({ user: dummyUser });
    } else {
      res.status(401).json({ message: 'Invalid token payload' });
    }
  } catch (error) {
    console.error('Error verifying JWT:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

export default router; 