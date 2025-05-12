import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SignJWT, jwtVerify } from 'jose';
import dotenv from 'dotenv';
import descopeClient from '../src/config/descope';

dotenv.config();

const dummyUser = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com'
};

const authenticateToken = async (authHeader?: string) => {
  const token = authHeader?.split(' ')[1];
  if (!token) throw new Error('No token');

  const secret = new TextEncoder().encode(process.env.JWT_SECRET || '');
  const { payload } = await jwtVerify(token, secret);
  return payload;
};

const getOidcRedirectUrl = async (userEmail: string) => {
  const redirectUrl = process.env.DESCOPE_REDIRECT_URL || 'https://homegrown-auth-server.preview.descope.org/api/auth/callback';
  const projectId = process.env.DESCOPE_PROJECT_ID;
  const managementKey = process.env.DESCOPE_MANAGEMENT_KEY;

  if (!projectId || !managementKey) {
    throw new Error('Missing Descope configuration');
  }

  const response = await descopeClient.oauth.start('Descope', redirectUrl);
  if (!response.ok || !response.data?.url) {
    throw new Error(response.error?.errorMessage || 'OAuth start failed');
  }

  return response.data.url + `&login_hint=${userEmail}`;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url, method } = req;

  try {
    // Health check
    if (url === '/api/health' && method === 'GET') {
      return res.status(200).json({ status: 'ok' });
    }

    // Login route
    if (url === '/auth/login' && method === 'POST') {
      const { email, password } = req.body;
      if (password !== 'password') {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const redirectUrl = await getOidcRedirectUrl(email);
      return res.json({ redirectUrl });
    }

    // Callback route
    if (url === '/auth/callback' && method === 'GET') {
      const { code, error } = req.query;
      if (error) return res.status(400).json({ message: `OAuth error: ${error}` });
      if (!code || typeof code !== 'string') return res.status(400).json({ message: 'No code provided' });

      const tokenResponse = await descopeClient.oauth.exchange(code);
      if (!tokenResponse.ok || !tokenResponse.data?.refreshJwt) {
        return res.status(401).json({ message: 'Token exchange failed' });
      }

      const session = await descopeClient.validateSession(tokenResponse.data.refreshJwt);
      if (!session) return res.status(401).json({ message: 'Invalid session' });

      const { userId, email } = session as any;
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
      const userToken = await new SignJWT({ sub: userId, email })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .sign(secret);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      res.setHeader('Content-Type', 'text/html');
      return res.send(`
        <html>
          <body>
            <script>
              localStorage.setItem('token', '${userToken}');
              window.location.href = '${frontendUrl}/protected.html';
            </script>
          </body>
        </html>
      `);
    }

    // Get current user
    if (url === '/auth/me' && method === 'GET') {
      const user = await authenticateToken(req.headers.authorization);
      return res.json({ user: dummyUser });
    }

    // Protected route
    if (url === '/protected' && method === 'GET') {
      const user = await authenticateToken(req.headers.authorization);
      return res.json({ message: 'Protected route', user });
    }

    return res.status(404).json({ message: 'Route not found' });
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}