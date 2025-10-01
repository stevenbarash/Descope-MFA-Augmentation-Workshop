# Homegrown Auth with Descope MFA

A comprehensive demonstration of adding enterprise-grade Multi-Factor Authentication (MFA) to your existing homegrown authentication system using Descope, without replacing your current infrastructure.

## Overview

This project shows how to **enhance** your existing authentication system with MFA, not replace it. You keep your user database, password validation, and authorization logic while adding Descope's MFA capabilities as a second factor.

### Why This Approach?

- ✅ **Keep Your Existing Auth**: No need to migrate users or change your authentication flow
- ✅ **Add MFA Easily**: Enterprise-grade MFA without building it yourself
- ✅ **Maintain Control**: Your tokens, your sessions, your authorization
- ✅ **Flexible Integration**: Use Descope only for what you need (MFA verification)

## Architecture

### Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     COMPLETE AUTHENTICATION FLOW                    │
└─────────────────────────────────────────────────────────────────────┘

1. User Login (First Factor - Homegrown)
   ┌──────┐                    ┌──────────────┐
   │ User │ ─── email/pwd ───> │ Your Server  │
   └──────┘                    └──────────────┘
                                       │
                                  Validate against
                                  YOUR database
                                       │
                                       ✓

2. MFA Redirect (Second Factor - Descope)
   ┌──────┐                    ┌──────────────┐
   │ User │ <── redirect URL ─ │ Your Server  │
   └──────┘                    └──────────────┘
      │                               │
      │                          oauth.start()
      │                               │
      └───────> Descope MFA Page <────┘
                (OTP/Authenticator)

3. MFA Completion
   ┌──────┐                    ┌─────────┐
   │ User │ ── complete MFA ──>│ Descope │
   └──────┘                    └─────────┘
                                     │
                              redirect with code
                                     │
                                     ▼

4. Token Exchange & Validation
                    ┌──────────────┐    oauth.exchange()    ┌─────────┐
   ┌──────┐         │ Your Server  │ <──────────────────────│ Descope │
   │ User │ <────── └──────────────┘                        └─────────┘
   └──────┘                │
              receive      │ validateSession()
              YOUR JWT     │ ✓ MFA verified
                          │
                          │ Issue YOUR JWT
                          └─────────────────>

5. Access Protected Resources
   ┌──────┐   YOUR JWT      ┌──────────────┐
   │ User │ ─────────────> │ Your Server  │
   └──────┘                └──────────────┘
                 All subsequent requests use YOUR tokens
                 Descope only involved during login MFA step
```

### Key Integration Points

#### 1. **Login Endpoint** (`/api/auth/login`)
- Validates credentials against YOUR database (first factor)
- Instead of issuing a token, initiates OAuth flow with Descope
- Returns Descope authorization URL for MFA

#### 2. **OAuth Callback** (`/api/auth/callback`)
- Receives authorization code from Descope after MFA
- Exchanges code for Descope tokens
- Validates Descope session
- Issues YOUR JWT token (completing the handoff)

#### 3. **Protected Routes**
- Use YOUR JWT tokens for authorization
- No Descope involvement after initial login
- Standard Bearer token authentication

### What Descope Handles

- 🔐 MFA UI/UX (OTP, authenticator apps, WebAuthn)
- 🔐 MFA enrollment flows
- 🔐 MFA verification logic
- 🔐 Security infrastructure

### What You Keep

- 👤 User database and management
- 🔑 Primary authentication (username/password)
- 🎫 Session management (JWT tokens)
- 🛡️ Authorization and permissions
- 💼 All business logic

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- pnpm (preferred) or npm
- A [Descope](https://descope.com) account 

### Setup

#### 1. Clone the repository
```bash
git clone https://github.com/descope-sample-apps/homegrown-auth-server.git
cd homegrown-auth-server
```

#### 2. Install dependencies
```bash
pnpm install
# or
npm install
```

#### 3. Configure Descope

1. Create a [Descope account](https://descope.com)
2. In the Descope console:
   - Go to **Project Settings**
   - Copy your **Project ID**
   - Go to **Management Keys** → Create a new key
   - Copy the **Management Key** (you'll only see this once!)
3. Configure OAuth provider:
   - Go to **Authentication Methods** → **OAuth**
   - Enable **Descope** as an OAuth provider
   - Set redirect URI: `http://localhost:3000/api/auth/callback`

#### 4. Create `.env` file

Create a `.env` file in the project root with the following variables:

```env
# ============================================================================
# SERVER CONFIGURATION
# ============================================================================
PORT=3000
NODE_ENV=development

# ============================================================================
# JWT CONFIGURATION (YOUR HOMEGROWN AUTH)
# ============================================================================
# Secret key for signing YOUR JWT tokens (not Descope's)
# Generate a strong random string for production
JWT_SECRET=your-super-secret-key-here-change-in-production

# ============================================================================
# FRONTEND CONFIGURATION
# ============================================================================
# URL where your frontend is hosted
FRONTEND_URL=http://localhost:3000

# ============================================================================
# DESCOPE CONFIGURATION
# ============================================================================
# Your Descope Project ID (from Descope console → Project Settings)
DESCOPE_PROJECT_ID=your-descope-project-id

# Your Descope Management Key (from Descope console → Management Keys)
# IMPORTANT: Keep this secret! Never commit to version control
DESCOPE_MANAGEMENT_KEY=your-descope-management-key

# OAuth callback URL (where Descope redirects after MFA)
# This must match the redirect URI configured in Descope console
DESCOPE_REDIRECT_URL=http://localhost:3000/api/auth/callback
```

#### 5. Run the application
```bash
pnpm run dev
# or
npm run dev
```

#### 6. Open in browser
Navigate to `http://localhost:3000`

### Demo Credentials
- **Email**: any email address
- **Password**: `password`

After entering credentials, you'll be redirected to Descope to complete MFA.

## Project Structure

```
homegrown-auth-server/
├── api/
│   └── index.ts              # Main server with auth endpoints
│                              # - Homegrown password validation
│                              # - Descope OAuth integration
│                              # - JWT token generation
│
├── src/
│   └── config/
│       └── descope.ts        # Descope SDK initialization
│                              # - Project ID configuration
│                              # - Management Key setup
│
├── public/                    # Frontend files
│   ├── index.html            # Login page
│   ├── protected.html        # Protected page (requires auth)
│   ├── auth.js               # Frontend auth logic
│   └── auth/
│       └── callback.html     # OAuth callback page (optional)
│
├── .env                      # Environment variables (create this)
├── package.json              # Dependencies
└── tsconfig.json            # TypeScript configuration
```

## Implementation Guide

### For Your Own Application

To add Descope MFA to your existing authentication system, follow these key steps:

#### 1. **Install Descope SDK**
```bash
pnpm add @descope/node-sdk
# or
npm install @descope/node-sdk
```

#### 2. **Initialize Descope Client**
```typescript
// src/config/descope.ts
import DescopeClient from '@descope/node-sdk';

const descopeClient = DescopeClient({
  projectId: process.env.DESCOPE_PROJECT_ID || '',
  managementKey: process.env.DESCOPE_MANAGEMENT_KEY || '',
});

export default descopeClient;
```

#### 3. **Modify Your Login Endpoint**
Instead of immediately issuing tokens after password validation, redirect to Descope:

```typescript
// Your existing login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  // YOUR EXISTING CODE: Validate against your database
  const user = await validateCredentials(email, password);
  
  if (user) {
    // BEFORE MFA: You would issue a token here
    // const token = generateJWT(user);
    // res.json({ token });
    
    // WITH MFA: Redirect to Descope instead
    const response = await descopeClient.oauth.start(
      'Descope', 
      process.env.DESCOPE_REDIRECT_URL
    );
    
    const redirectUrl = response.data.url + `&login_hint=${email}`;
    res.json({ redirectUrl });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});
```

#### 4. **Add OAuth Callback Endpoint**
Handle the return from Descope and issue your tokens:

```typescript
app.get('/api/auth/callback', async (req, res) => {
  const { code } = req.query;
  
  // Exchange code for Descope tokens
  const tokenResponse = await descopeClient.oauth.exchange(code);
  
  // Validate Descope session (confirms MFA was completed)
  const session = await descopeClient.validateSession(
    tokenResponse.data.refreshJwt
  );
  
  // MFA verified! Now issue YOUR token
  const yourToken = generateYourJWT({
    userId: session.userId,
    email: session.email
  });
  
  // Return to your app with your token
  res.send(`
    <script>
      localStorage.setItem('token', '${yourToken}');
      window.location.href = '/protected';
    </script>
  `);
});
```

#### 5. **Keep Your Existing Protected Routes**
No changes needed! Continue using your JWT tokens:

```typescript
app.get('/api/protected', authenticateYourToken, (req, res) => {
  // Your existing authorization logic remains unchanged
  res.json({ message: 'Protected data', user: req.user });
});
```

### Key Files to Study

1. **`api/index.ts`** - Complete authentication flow with extensive comments
2. **`src/config/descope.ts`** - Descope SDK setup
3. **`public/auth.js`** - Frontend integration patterns

All files are heavily commented to explain the integration points and design decisions.

## Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | `3000` |
| `NODE_ENV` | Environment | No | `development` |
| `JWT_SECRET` | Your JWT signing secret | **Yes** | `your-secret-key` |
| `FRONTEND_URL` | Frontend application URL | **Yes** | `http://localhost:3000` |
| `DESCOPE_PROJECT_ID` | Descope project identifier | **Yes** | `P2abc...` |
| `DESCOPE_MANAGEMENT_KEY` | Descope management key | **Yes** | `K2xyz...` |
| `DESCOPE_REDIRECT_URL` | OAuth callback URL | **Yes** | `http://localhost:3000/api/auth/callback` |

## Troubleshooting

### "OAuth start failed" error
- Verify `DESCOPE_PROJECT_ID` is correct
- Ensure OAuth provider is enabled in Descope console
- Check that 'Descope' provider is configured

### "Token exchange failed" error
- Verify `DESCOPE_MANAGEMENT_KEY` is correct
- Check that redirect URL matches exactly in Descope console
- Ensure callback endpoint is accessible

### User redirected but no token
- Check browser console for JavaScript errors
- Verify `JWT_SECRET` is set
- Check server logs for token generation errors

## Security Notes

- Always use HTTPS in production
- Keep `DESCOPE_MANAGEMENT_KEY` secret (server-side only)
- Use strong `JWT_SECRET` (generate with `openssl rand -base64 32`)
- Consider using httpOnly cookies instead of localStorage for tokens
- Implement token refresh logic for better UX
- Add rate limiting to prevent brute force attacks

## License

MIT License

## Learn More

- 📖 [Descope Documentation](https://docs.descope.com)
- 📝 [Blog Post: Adding MFA to Homegrown Auth](https://www.descope.com/blog/post/mfa-homegrown)
- 💬 [Descope Community](https://www.descope.com/community)

## Support

For issues specific to this sample:
- Open an issue on GitHub

For Descope-related questions:
- [Descope Documentation](https://docs.descope.com)
- [Descope Support](https://www.descope.com/contact) 