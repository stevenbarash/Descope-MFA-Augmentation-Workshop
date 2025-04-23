// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// DOM Elements
const loginForm = document.getElementById('login-form');
const protectedContent = document.getElementById('protected-content');
const errorElement = document.getElementById('error');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const userUsernameSpan = document.getElementById('user-username');

// Check if we're on the protected page
const isProtectedPage = window.location.pathname.includes('protected.html');

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
    const username = usernameInput.value;
    const password = passwordInput.value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
            // Save token to localStorage
            localStorage.setItem('token', data.token);
            // Redirect to protected page
            window.location.href = '/protected.html';
        } else {
            showError(data.message);
        }
    } catch (error) {
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

// UI Helper Functions
function showProtectedContent(user) {
    if (userUsernameSpan) {
        userUsernameSpan.textContent = user.username;
    }
}

function showError(message) {
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}