# Homegrown Auth Server

A Node.js server with JWT authentication that can be deployed to Vercel serverless functions.

## Features

- JWT-based authentication
- Protected routes
- CORS enabled
- TypeScript support
- Vercel serverless deployment ready

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

To run the server locally:

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Available Endpoints

- `POST /api/auth/login` - Login and get JWT token
  - Body: `{ "username": "testuser", "password": "password" }`
- `GET /api/auth/me` - Get current user info
  - Requires Authorization header with JWT token
- `GET /api/protected` - Example protected route
  - Requires Authorization header with JWT token
- `GET /api/health` - Health check endpoint

### Deployment to Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

## Environment Variables

Create a `.env` file with the following variables:

```
JWT_SECRET=your_secret_key
PORT=3000
NODE_ENV=development
```

## Security Note

This is a basic implementation for demonstration purposes. In a production environment, you should:

- Use a secure JWT secret
- Implement proper password hashing
- Add rate limiting
- Use HTTPS
- Implement proper user management
- Add input validation
- Use environment variables for sensitive data 