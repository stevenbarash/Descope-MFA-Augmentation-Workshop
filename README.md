# Homegrown Auth with MFA

A demonstration of implementing Multi-Factor Authentication (MFA) using Descope to your home-grown auth system.

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- A [Descope](https://descope.com) account 

### Setup

1. Clone the repository
```bash
git clone https://github.com/descope-sample-apps/homegrown-auth-server.git
```

2. Install dependencies
```bash
npm install
```

3. Create `.env` file
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-key-here

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Descope Configuration
DESCOPE_PROJECT_ID=your-project-id
DESCOPE_REDIRECT_URL=http://localhost:3000/api/auth/callback
```

5. Run the application
```bash
npm run dev
```

### Demo Login
- Email: any email address
- Password: "password"

## License

MIT License

## Learn More
Check out our [blog post](https://www.descope.com/blog/post/mfa-homegrown) for a detailed walkthrough of adding MFA to your homegrown auth system. 