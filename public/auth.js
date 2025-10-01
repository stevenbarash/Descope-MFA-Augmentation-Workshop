/**
 * FRONTEND AUTHENTICATION WITH DESCOPE MFA
 * =========================================
 * 
 * This client-side JavaScript handles the user authentication flow,
 * coordinating between your homegrown auth system and Descope MFA.
 * 
 * FRONTEND AUTHENTICATION FLOW:
 * 
 * 1. LOGIN PAGE (index.html):
 *    - User enters email/password
 *    - Submit to /api/auth/login (first factor validation)
 *    - Receive Descope redirect URL
 *    - Redirect user to Descope for MFA
 * 
 * 2. DESCOPE MFA PAGE (external):
 *    - User completes MFA (OTP, authenticator, etc.)
 *    - Descope redirects to /api/auth/callback
 * 
 * 3. CALLBACK HANDLING (server-side):
 *    - Server validates MFA completion
 *    - Server issues JWT token
 *    - Returns HTML that stores token and redirects
 * 
 * 4. PROTECTED PAGE (protected.html):
 *    - Check for JWT token in localStorage
 *    - Use token to access protected resources
 *    - Display user information
 * 
 * KEY CONCEPT: The frontend never directly interacts with Descope APIs.
 * All Descope communication happens server-side for security.
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * API Base URL
 * Points to your homegrown auth server endpoints
 * TODO: Use environment variable instead of hardcoding for different environments
 */
const API_BASE_URL = "https://homegrown-auth-server.preview.descope.org/api";

// ============================================================================
// DOM ELEMENT REFERENCES
// ============================================================================

const loginForm = document.getElementById('login-form');
const protectedContent = document.getElementById('protected-content');
const errorElement = document.getElementById('error');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const userEmailSpan = document.getElementById('user-email');

// ============================================================================
// PAGE DETECTION
// ============================================================================

// Determine which page we're on to run appropriate logic
const isProtectedPage = window.location.pathname.includes('protected.html');
const isCallbackPage = window.location.pathname.includes('auth/callback');

// ============================================================================
// OAUTH CALLBACK HANDLING (Legacy/Alternative Flow)
// ============================================================================

/**
 * Handle OAuth callback with token in URL
 * 
 * NOTE: In the current implementation, the server handles the callback
 * and uses an HTML response to store the token and redirect.
 * This code handles an alternative flow where the token is passed as a URL parameter.
 * 
 * FLOW:
 * 1. Server redirects to /auth/callback.html?token=...
 * 2. Extract token from URL parameters
 * 3. Store in localStorage
 * 4. Redirect to protected page
 */
if (isCallbackPage) {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (token) {
    // Store YOUR server's JWT token (not Descope's)
    localStorage.setItem('token', token);
    // Redirect to protected area of your application
    window.location.href = '/protected.html';
  } else {
    showError('No token received from authentication');
  }
}

// ============================================================================
// PAGE LOAD INITIALIZATION
// ============================================================================

/**
 * Initialize page on DOM ready
 * 
 * For protected pages:
 * - Check for valid JWT token
 * - Fetch and display user information
 * - Redirect to login if not authenticated
 * 
 * This ensures protected pages are only accessible after:
 * 1. Successful first factor authentication (email/password)
 * 2. Successful MFA completion with Descope
 * 3. Receipt of valid JWT token from your server
 */
document.addEventListener('DOMContentLoaded', async () => {
  if (isProtectedPage) {
    const token = localStorage.getItem('token');
    if (!token) {
      // No token = not authenticated, redirect to login
      window.location.href = '/';
      return;
    }
    // Token exists, validate it and fetch user info
    await fetchUserInfo(token);
  }
});

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

/**
 * LOGIN FUNCTION - Initiates MFA Flow
 * ====================================
 * 
 * This is the FIRST STEP in the authentication process.
 * Called when user submits the login form.
 * 
 * CRITICAL INTEGRATION POINT:
 * Unlike traditional auth where you receive a token immediately,
 * this function receives a Descope redirect URL and sends the user
 * to Descope for MFA verification.
 * 
 * FLOW:
 * 1. Validate form inputs (email/password)
 * 2. POST credentials to your homegrown auth server
 * 3. Server validates credentials (first factor)
 * 4. Server returns Descope authorization URL (not a token!)
 * 5. Redirect user to Descope URL for MFA (second factor)
 * 6. User completes MFA at Descope
 * 7. Descope redirects to callback endpoint
 * 8. Callback endpoint validates MFA and issues token
 * 
 * This ensures every login requires BOTH password AND MFA.
 */
async function login() {
  const email = emailInput.value;
  const password = passwordInput.value;

  // Input validation
  if (!email || !password) {
    showError('Please enter both email and password');
    return;
  }

  try {
    // STEP 1: Send credentials to YOUR auth server for first factor validation
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);

    if (response.ok) {
      // STEP 2: First factor passed! Redirect to Descope for MFA
      // Note: We're not receiving a token yet - that comes after MFA
      console.log('Redirecting to Descope MFA:', data.redirectUrl);
      window.location.href = data.redirectUrl;
    } else {
      // First factor failed (invalid credentials)
      showError(data.message || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    showError('An error occurred during login');
  }
}

/**
 * LOGOUT FUNCTION
 * ================
 * 
 * Logs out the user by:
 * 1. Removing JWT token from localStorage
 * 2. Redirecting to login page
 * 
 * NOTE: This only clears YOUR token. If you need to also invalidate
 * the Descope session, you would call Descope's logout endpoint.
 */
function logout() {
  // Clear YOUR JWT token (not Descope's session)
  localStorage.removeItem('token');
  // Return to login page
  window.location.href = '/';
}

/**
 * FETCH USER INFO
 * ===============
 * 
 * Validates JWT token and retrieves user information
 * from your homegrown auth server.
 * 
 * IMPORTANT: This uses YOUR JWT token (issued after MFA completion)
 * to access YOUR protected API endpoints. Descope is not involved
 * in this request - MFA verification already happened during login.
 * 
 * @param {string} token - JWT token from your server (in localStorage)
 */
async function fetchUserInfo(token) {
  try {
    // Call YOUR protected endpoint with YOUR token
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      // Token is valid, display user info
      showProtectedContent(data.user);
    } else {
      // Token is invalid or expired, redirect to login
      // User will need to re-authenticate (both password and MFA)
      localStorage.removeItem('token');
      window.location.href = '/';
    }
  } catch (error) {
    showError('An error occurred while fetching user info');
  }
}

// ============================================================================
// UI HELPER FUNCTIONS
// ============================================================================

/**
 * Display error message to user
 * @param {string} message - Error message to display
 */
function showError(message) {
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
}

/**
 * Display protected content with user information
 * @param {Object} user - User object with email and other details
 */
function showProtectedContent(user) {
  if (protectedContent) {
    protectedContent.style.display = 'block';
    if (userEmailSpan) {
      userEmailSpan.textContent = user.email;
    }
  }
}