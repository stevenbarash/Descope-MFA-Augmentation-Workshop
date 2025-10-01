# Homegrown Auth (Before MFA)

A demonstration of a basic homegrown authentication system using JWT tokens. This is the "before" version - without Multi-Factor Authentication.

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup

1. Install dependencies
```bash
npm install
```

2. Create `.env` file
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-key-here

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

3. Run the application
```bash
npm run dev
```

### Demo Login
- Email: any email address
- Password: "password"

## How It Works

This basic authentication system:
1. User enters email and password
2. Server validates credentials (demo: any email with password "password")
3. Server generates a JWT token
4. Client stores token in localStorage
5. Client includes token in Authorization header for protected routes
6. Server validates token on protected routes

## License

MIT License
