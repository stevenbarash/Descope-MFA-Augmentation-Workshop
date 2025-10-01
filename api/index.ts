/**
 * HOMEGROWN AUTH SERVER WITH DESCOPE MFA INTEGRATION
 * ===================================================
 * 
 * This server demonstrates how to add Descope MFA on top of an existing
 * homegrown authentication system. The integration follows this flow:
 * 
 * 1. FIRST FACTOR (Homegrown): User provides email/password credentials
 * 2. SECOND FACTOR (Descope): If credentials valid, redirect to Descope for MFA
 * 3. VALIDATION: Validate Descope session after MFA completion
 * 4. TOKEN ISSUANCE: Issue your own JWT tokens for your application
 * 
 * This pattern allows you to keep your existing auth infrastructure while
 * adding enterprise-grade MFA capabilities via Descope's OAuth/OIDC flow.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { SignJWT, jwtVerify } from 'jose'; // JWT library for creating/verifying tokens
import dotenv from 'dotenv';
import descopeClient from '../src/config/descope'; // Descope SDK client

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// HOMEGROWN USER DATABASE
// ============================================================================
// In a real application, this would be your existing user database (PostgreSQL, 
// MongoDB, etc.). For this demo, we use a simple in-memory user object.
const dummyUser = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com'
};

// ============================================================================
// EXPRESS MIDDLEWARE SETUP
// ============================================================================
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON request bodies

// Serve static frontend files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../public')));

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================
// Extend Express Request type to include authenticated user information
interface AuthenticatedRequest extends Request {
  user?: any; // Will contain JWT payload after token verification
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE (HOMEGROWN)
// ============================================================================
/**
 * This middleware validates JWT tokens issued by YOUR server (not Descope).
 * After a user completes MFA with Descope, you issue your own JWT token
 * which is then used for subsequent API requests.
 * 
 * This keeps your existing authorization logic intact - you're just using
 * Descope for the MFA step, not for session management.
 */
const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Extract Bearer token from Authorization header
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    // Verify the JWT using YOUR secret (not Descope's)
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || '');
    const { payload } = await jwtVerify(token, secret);
    
    // Attach user info to request for use in route handlers
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// ============================================================================
// DESCOPE MFA INTEGRATION: OAUTH FLOW INITIATION
// ============================================================================
/**
 * This function initiates the OAuth/OIDC flow with Descope for MFA.
 * 
 * KEY CONCEPT: After validating the user's primary credentials (email/password)
 * with your homegrown system, this function generates a Descope authorization URL
 * where the user will be redirected to complete MFA.
 * 
 * FLOW:
 * 1. Call Descope's oauth.start() to get an authorization URL
 * 2. Include login_hint parameter with user's email (pre-fills the email field)
 * 3. Return this URL to the frontend, which redirects the user to Descope
 * 4. Descope handles all MFA UI/UX (OTP, authenticator apps, etc.)
 * 5. After MFA completion, Descope redirects back to YOUR callback URL
 * 
 * @param userEmail - The user's email from your homegrown auth system
 * @returns Authorization URL where user should be redirected for MFA
 */
const getOidcRedirectUrl = async (userEmail: string) => {
  try {
    // Get configuration from environment variables
    const redirectUrl = process.env.DESCOPE_REDIRECT_URL || ''; // Where Descope redirects after MFA
    const projectId = process.env.DESCOPE_PROJECT_ID;

    console.log('OAuth Configuration:', {
      projectId,
      redirectUrl,
    });

    if (!projectId) {
      throw new Error('Missing Descope configuration. Please check your environment variables.');
    }

    console.log('Calling oauth.start with:', {
      provider: 'descope',
      redirectUrl
    });

    // CRITICAL: Start the OAuth flow with Descope
    // This creates an authorization session and returns a URL for the user
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

    // Add login_hint to pre-fill the user's email in Descope's UI
    // This creates a seamless UX where the user doesn't re-enter their email
    return response.data.url + `&login_hint=${userEmail}`;
  } catch (error) {
    console.error('Error getting redirect URL:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to get redirect URL: ${error.message}`);
    }
    throw error;
  }
};

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * LOGIN ENDPOINT - FIRST FACTOR AUTHENTICATION (HOMEGROWN)
 * ==========================================================
 * 
 * This is the CRITICAL INTEGRATION POINT where homegrown auth meets Descope MFA.
 * 
 * TRADITIONAL FLOW (without MFA):
 * 1. Validate email/password against your database
 * 2. Generate JWT token
 * 3. Return token to client
 * 
 * ENHANCED FLOW (with Descope MFA):
 * 1. Validate email/password against your database (FIRST FACTOR)
 * 2. Instead of returning a token, initiate Descope OAuth flow (SECOND FACTOR)
 * 3. Return Descope authorization URL to client
 * 4. Client redirects user to Descope for MFA
 * 5. After MFA, user returns via callback endpoint (see below)
 * 6. THEN generate and return JWT token
 * 
 * This pattern ensures MFA is REQUIRED - users can't access resources with
 * just password authentication.
 */
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  // STEP 1: Validate credentials against YOUR database
  // In production, this would be: const user = await db.findUser(email, password)
  if (password === 'password') {
    try {
      // STEP 2: Instead of issuing a token, get Descope MFA redirect URL
      // This is where you "hand off" to Descope for the second factor
      const redirectUrl = await getOidcRedirectUrl(email);
      console.log('Sending redirect URL:', redirectUrl);
      
      // STEP 3: Return the Descope URL to the frontend
      // The frontend will redirect the user to this URL for MFA
      res.json({ redirectUrl });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Error getting redirect URL' });
    }
  } else {
    // First factor authentication failed
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

/**
 * GET USER INFO ENDPOINT
 * =======================
 * Protected route that returns user information.
 * Requires valid JWT token from YOUR server (issued after MFA completion).
 */
app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: dummyUser });
});

/**
 * EXAMPLE PROTECTED ROUTE
 * ========================
 * Any route using the authenticateToken middleware requires:
 * 1. User to have passed first factor (email/password) auth
 * 2. User to have completed MFA with Descope
 * 3. Valid JWT token from YOUR server
 */
app.get('/api/protected', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

/**
 * HEALTH CHECK ENDPOINT
 * ======================
 * Unprotected endpoint for monitoring/health checks
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

/**
 * OAUTH CALLBACK ENDPOINT - COMPLETING THE MFA FLOW
 * ===================================================
 * 
 * This is where Descope redirects the user after MFA completion.
 * This endpoint is the "bridge" that brings the user back to your system
 * after they've successfully completed MFA with Descope.
 * 
 * COMPLETE AUTHENTICATION FLOW:
 * 
 * 1. User submits email/password to /api/auth/login (FIRST FACTOR)
 * 2. Server validates credentials and returns Descope URL
 * 3. User redirects to Descope for MFA (SECOND FACTOR)
 * 4. User completes MFA (OTP, authenticator app, etc.)
 * 5. Descope redirects to THIS endpoint with authorization code
 * 6. Server exchanges code for Descope tokens
 * 7. Server validates Descope session
 * 8. Server issues YOUR JWT token (completing the handoff)
 * 9. User can now access protected resources with your JWT
 * 
 * KEY INSIGHT: You're using Descope for MFA verification only, not for
 * session management. Once MFA is verified, you issue your own tokens
 * and use your existing authorization infrastructure.
 */
app.get('/api/auth/callback', async (req: Request, res: Response) => {
  try {
    // STEP 1: Extract OAuth callback parameters from Descope
    const { code, state, error } = req.query;
    
    console.log('Callback received:', { code, state, error });

    // Handle OAuth errors (user denied access, timeout, etc.)
    if (error) {
      console.error('OAuth error:', error);
      return res.status(400).json({ message: `Authentication failed: ${error}` });
    }

    // Validate authorization code is present
    if (!code || typeof code !== 'string') {
      console.error('No code provided in callback');
      return res.status(400).json({ message: 'No authorization code provided' });
    }

    // STEP 2: Exchange authorization code for Descope tokens
    // This is standard OAuth2 flow - trade the one-time code for tokens
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

    // STEP 3: Extract Descope session token from response
    // The refreshJwt is Descope's token that proves MFA was completed
    const sessionToken = tokenResponse.data?.refreshJwt;
    if (!sessionToken) {
      console.error('No session token in response:', tokenResponse.data);
      return res.status(401).json({ message: 'No session token received' });
    }

    // STEP 4: Validate the Descope session token
    // This confirms the token is valid and MFA was truly completed
    const sessionValidation = await descopeClient.validateSession(sessionToken);

    console.log('Session validation response:', sessionValidation);

    if (!sessionValidation) {
      console.error('Invalid session');
      return res.status(401).json({ message: 'Invalid session' });
    }

    // STEP 5: Extract user information from validated session
    // Descope returns user info (email, userId) from the validated token
    const userInfo = sessionValidation as any;
    const userId = userInfo.userId || userInfo.sub || '';
    const email = userInfo.email || '';

    // STEP 6: Issue YOUR OWN JWT token
    // CRITICAL: At this point, MFA is verified. Now you generate YOUR token
    // with YOUR secret, YOUR claims, and YOUR expiration logic.
    // This is what separates "using Descope for MFA" from "using Descope for auth"
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const userToken = await new SignJWT({
      sub: userId,
      email: email
      // Add any additional claims your app needs (roles, permissions, etc.)
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h") // Your session duration policy
      .sign(secret);

    // STEP 7: Return user to your application with YOUR JWT token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/protected.html?token=${encodeURIComponent(userToken)}`;
    
    console.log('Redirecting to protected page:', redirectUrl);
    
    // Send HTML that stores token and redirects
    // In production, you might use httpOnly cookies instead of localStorage
    res.send(`
      <html>
        <body>
          <script>
            // Store YOUR token (not Descope's) in localStorage
            localStorage.setItem('token', '${userToken}');
            // Redirect to your protected area
            window.location.href = '${frontendUrl}/protected.html';
          </script>
        </body>
      </html>
    `);
    
    // AUTHENTICATION COMPLETE!
    // User has now:
    // ✓ Passed first factor (email/password) with your system
    // ✓ Passed second factor (MFA) with Descope
    // ✓ Received YOUR JWT token for accessing protected resources
    
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    res.status(500).json({ message: 'Error processing authentication' });
  }
});

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

/**
 * LOCAL DEVELOPMENT SERVER
 * =========================
 * Start Express server for local testing.
 * In production (Vercel), this block is skipped.
 */
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
  });
}

/**
 * SERVERLESS EXPORT
 * ==================
 * Export app for serverless deployment (Vercel, AWS Lambda, etc.)
 */
export default app;

// ============================================================================
// SUMMARY: ADDING DESCOPE MFA TO HOMEGROWN AUTH
// ============================================================================
/**
 * KEY TAKEAWAYS FOR INTEGRATION:
 * 
 * 1. KEEP YOUR EXISTING AUTH: Your username/password validation stays unchanged
 * 
 * 2. ADD MFA AS SECOND FACTOR: Instead of immediately issuing tokens after
 *    password validation, redirect to Descope for MFA
 * 
 * 3. USE OAUTH/OIDC PATTERN: Descope acts as an OAuth provider specifically
 *    for MFA verification, not full authentication
 * 
 * 4. MAINTAIN YOUR TOKENS: After Descope confirms MFA, issue YOUR OWN JWT
 *    tokens using YOUR secret and YOUR claims
 * 
 * 5. KEEP YOUR AUTHORIZATION: All role checks, permissions, and session
 *    management remain in your control using your tokens
 * 
 * REQUIRED ENVIRONMENT VARIABLES (per user preference [[memory:6984998]]):
 * - DESCOPE_PROJECT_ID: Your Descope project identifier
 * - DESCOPE_MANAGEMENT_KEY: For SDK authentication with Descope
 * - DESCOPE_REDIRECT_URL: Where Descope sends users after MFA (callback endpoint)
 * - JWT_SECRET: Your secret for signing your own JWT tokens
 * - FRONTEND_URL: Your frontend application URL
 * 
 * WHAT DESCOPE PROVIDES:
 * - MFA UI/UX (OTP, authenticator apps, WebAuthn, etc.)
 * - MFA enrollment flows
 * - MFA verification and validation
 * - Security infrastructure for MFA
 * 
 * WHAT YOU KEEP:
 * - User database and management
 * - Primary authentication (username/password)
 * - Session management and tokens
 * - Authorization and permissions
 * - All business logic
 */