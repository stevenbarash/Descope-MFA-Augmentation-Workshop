// API Configuration
const API_BASE_URL = 'https://homegrown-auth-server.preview.descope.org/api';

// DOM Elements
const loginForm = document.getElementById('login-form');
const protectedContent = document.getElementById('protected-content');
const errorElement = document.getElementById('error');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const userEmailSpan = document.getElementById('user-email');

// Check if we're on the protected page
const isProtectedPage = window.location.pathname.includes('protected.html');

// Check if we're on the callback page
const isCallbackPage = window.location.pathname.includes('auth/callback');

// Handle OIDC callback
if (isCallbackPage) {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (token) {
    // Store the token
    localStorage.setItem('token', token);
    // Redirect to protected page
    window.location.href = '/protected.html';
  } else {
    showError('No token received from authentication');
  }
}

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', async () => {
  if (isProtectedPage) {
    const token = localStorage.getItem('token');
    if (!token) {
      // Redirect to login if no token
      window.location.href = '/';
      return;
    }
    await fetchUserInfo(token);
  }
});

// Login function
async function login() {
  const email = emailInput.value;
  const password = passwordInput.value;

  if (!email || !password) {
    showError('Please enter both email and password');
    return;
  }

  try {
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
      // Redirect to Descope using the provided URL
      console.log('Redirecting to:', data.redirectUrl);
      window.location.href = data.redirectUrl;
    } else {
      showError(data.message || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    showError('An error occurred during login');
  }
}

// Logout function
function logout() {
  // Remove token from localStorage
  localStorage.removeItem('token');
  // Redirect to login page
  window.location.href = '/';
}

// Fetch user info using token
async function fetchUserInfo(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      showProtectedContent(data.user);
    } else {
      // If token is invalid, redirect to login
      localStorage.removeItem('token');
      window.location.href = '/';
    }
  } catch (error) {
    showError('An error occurred while fetching user info');
  }
}

// Show error message
function showError(message) {
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
}

// Show protected content
function showProtectedContent(user) {
  if (protectedContent) {
    protectedContent.style.display = 'block';
    if (userEmailSpan) {
      userEmailSpan.textContent = user.email;
    }
  }
}