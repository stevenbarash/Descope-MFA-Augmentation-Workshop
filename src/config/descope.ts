/**
 * DESCOPE SDK CONFIGURATION
 * ==========================
 * 
 * This file initializes the Descope Node.js SDK client, which provides
 * the interface to communicate with Descope's authentication services.
 * 
 * DESCOPE SDK CAPABILITIES:
 * - OAuth/OIDC flows (oauth.start, oauth.exchange)
 * - Session validation (validateSession)
 * - User management
 * - MFA enrollment and verification
 * - Token validation and refresh
 * 
 * CONFIGURATION REQUIREMENTS:
 * Two environment variables are required for the SDK to function:
 * 
 * 1. DESCOPE_PROJECT_ID:
 *    - Your unique Descope project identifier
 *    - Found in Descope console under Project Settings
 *    - Used to identify which Descope project to authenticate against
 * 
 * 2. DESCOPE_MANAGEMENT_KEY:
 *    - Secret key for server-side SDK operations
 *    - Found in Descope console under Project Settings > Management Keys
 *    - CRITICAL: Keep this secret! Never expose in client-side code
 *    - Used for secure server-to-server API calls with Descope
 * 
 * SECURITY NOTE:
 * Following user preference [[memory:6984998]], all security settings
 * are configured via environment variables, not hardcoded.
 */

import DescopeClient from '@descope/node-sdk';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Debug logging to verify configuration at startup
// Helpful for troubleshooting deployment issues
console.log('DESCOPE_PROJECT_ID:', process.env.DESCOPE_PROJECT_ID);
console.log('DESCOPE_MANAGEMENT_KEY:', process.env.DESCOPE_MANAGEMENT_KEY ? 'Set' : 'Not Set');

/**
 * Initialize the Descope SDK client
 * 
 * This client instance is used throughout the application to:
 * - Start OAuth flows (oauth.start)
 * - Exchange authorization codes for tokens (oauth.exchange)
 * - Validate Descope sessions (validateSession)
 * 
 * The client handles all HTTP communication with Descope's APIs,
 * including proper authentication headers and request formatting.
 */
const descopeClient = DescopeClient({
  projectId: process.env.DESCOPE_PROJECT_ID || '',
  managementKey: process.env.DESCOPE_MANAGEMENT_KEY || '',
});

/**
 * Export the configured client for use in authentication flows
 * 
 * Import this client wherever you need to interact with Descope:
 * - api/index.ts: OAuth flow and session validation
 * - Other auth-related modules as your application grows
 */
export default descopeClient; 