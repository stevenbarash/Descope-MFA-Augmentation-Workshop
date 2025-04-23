import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { SignJWT, jwtVerify } from 'jose';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Dummy user data
const dummyUser = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com'
};

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Extend Express Request type
interface AuthenticatedRequest extends Request {
  user?: any;
}

// Middleware to authenticate token
const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || '');
    const { payload } = await jwtVerify(token, secret);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Routes
app.post('/api/auth/login', async (req: Request, res: Response) => {
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
        user: dummyUser
      });
    } catch (error) {
      res.status(500).json({ message: 'Error creating token' });
    }
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: dummyUser });
});

app.get('/api/protected', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
  });
}

// Export for Vercel
export default app;