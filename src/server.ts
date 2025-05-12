import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { SignJWT, jwtVerify } from 'jose';
import dotenv from 'dotenv';
import descopeClient from './config/descope';

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

// Get OIDC redirect URL
const getOidcRedirectUrl = async (userEmail: string) => {
  try {
    const redirectUrl = process.env.DESCOPE_REDIRECT_URL || '';
    const projectId = process.env.DESCOPE_PROJECT_ID;
    const managementKey = process.env.DESCOPE_MANAGEMENT_KEY;

    console.log('OAuth Configuration:', {
      projectId,
      redirectUrl,
      hasManagementKey: !!managementKey
    });

    if (!projectId || !managementKey) {
      throw new Error('Missing Descope configuration. Please check your environment variables.');
    }

    console.log('Calling oauth.start with:', {
      provider: 'descope',
      redirectUrl
    });

    const response = await descopeClient.oauth.start('Descope', redirectUrl);

    console.log('OAuth start response:', {
      ok: response.ok,
      data: response.data,
      error: response.error
    });

    if (!response.ok) {
      throw new Error(`OAuth start failed: ${response.error || 'Unknown error'}`);
    }

    if (!response.data?.url) {
      throw new Error('No redirect URL in response');
    }

    return response.data.url + `&login_hint=${userEmail}`;
  } catch (error) {
    console.error('Error getting redirect URL:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to get redirect URL: ${error.message}`);
    }
    throw error;
  }
};

// Routes
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  if (password === 'password') {
    try {
      const redirectUrl = await getOidcRedirectUrl(email);
      console.log('Sending redirect URL:', redirectUrl);
      res.json({ redirectUrl });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Error getting redirect URL' });
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

// OAuth callback endpoint
app.get('/api/auth/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;
    
    console.log('Callback received:', { code, state, error });

    if (error) {
      console.error('OAuth error:', error);
      return res.status(400).json({ message: `Authentication failed: ${error}` });
    }

    if (!code || typeof code !== 'string') {
      console.error('No code provided in callback');
      return res.status(400).json({ message: 'No authorization code provided' });
    }

    // Exchange the authorization code for tokens
    const tokenResponse = await descopeClient.oauth.exchange(code);

    console.log('Token exchange response:', {
      ok: tokenResponse.ok,
      data: tokenResponse.data,
      error: tokenResponse.error
    });

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenResponse.error);
      return res.status(401).json({ message: 'Failed to exchange authorization code' });
    }

    // Get the session token from the response
    const sessionToken = tokenResponse.data?.refreshJwt;
    if (!sessionToken) {
      console.error('No session token in response:', tokenResponse.data);
      return res.status(401).json({ message: 'No session token received' });
    }

    // Validate the session token
    const sessionValidation = await descopeClient.validateSession(sessionToken);

    console.log('Session validation response:', sessionValidation);

    if (!sessionValidation) {
      console.error('Invalid session');
      return res.status(401).json({ message: 'Invalid session' });
    }

    // Get user info from the session validation
    const userInfo = sessionValidation as any;
    const userId = userInfo.userId || userInfo.sub || '';
    const email = userInfo.email || '';

    // Create a JWT token for the user
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const userToken = await new SignJWT({
      sub: userId,
      email: email
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(secret);

    // Redirect to the protected page with the JWT token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/protected.html?token=${encodeURIComponent(userToken)}`;
    
    console.log('Redirecting to protected page:', redirectUrl);
    
    // Send HTML response that will handle the redirect and token storage
    res.send(`
      <html>
        <body>
          <script>
            // Store the token in localStorage
            localStorage.setItem('token', '${userToken}');
            // Redirect to protected page
            window.location.href = '${frontendUrl}/protected.html';
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    res.status(500).json({ message: 'Error processing authentication' });
  }
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