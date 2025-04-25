import { VercelRequest, VercelResponse } from "@vercel/node";
import { SignJWT, jwtVerify } from "jose";
import path from "path";
import fs from "fs";

// Dummy user data
const dummyUser = {
  id: "1",
  username: "testuser",
};

// Middleware to handle CORS
const handleCors = (res: VercelResponse) => {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );
};

// Middleware to authenticate token
const authenticateToken = async (req: VercelRequest) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
};

// TODO: Create a function to get the OIDC redirect URL from the Node SDK and return it
const getOidcRedirectUrl = async (userEmail: string) => {
  // TODO: Use the Node SDK to get the OIDC redirect URL
  // TODO: Append the userEmail to the redirect URL as `&login_hint=${userEmail}`
  // TODO: return the redirect URL
  return redirectUrl;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  handleCors(res);

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const requestPath = req.url?.split("?")[0] || "";

  // API Routes
  // TODO: Replace username with email as well as in the frontend
  if (requestPath.startsWith("/api/")) {
    if (requestPath === "/api/auth/login" && req.method === "POST") {
      const { username, password } = req.body;

      if (username === "testuser" && password === "password") {
        // TODO: Create a function to get the OIDC redirect URL from the Node SDK
        const redirectUrl = await getOidcRedirectUrl(username);

        // TODO: Redirect to the OIDC redirect URL
        res.redirect(redirectUrl);

        try {
          const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
          const token = await new SignJWT({
            userId: dummyUser.id,
            username: dummyUser.username,
          })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("1h")
            .sign(secret);

          res.json({
            token,
            user: dummyUser,
          });
        } catch (error) {
          res.status(500).json({ message: "Error creating token" });
        }
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } else if (requestPath === "/api/auth/me" && req.method === "GET") {
      const user = await authenticateToken(req);
      if (user) {
        res.json({ user: dummyUser });
      } else {
        res.status(401).json({ message: "Invalid token" });
      }
    } else if (requestPath === "/api/protected" && req.method === "GET") {
      const user = await authenticateToken(req);
      if (user) {
        res.json({ message: "This is a protected route", user });
      } else {
        res.status(401).json({ message: "Invalid token" });
      }
    } else if (requestPath === "/api/health" && req.method === "GET") {
      res.json({ status: "ok" });
    } else {
      res.status(404).json({ message: "Not found" });
    }
  }
  // Static file routes
  else {
    const filePath =
      requestPath === "/" ? "index.html" : requestPath.substring(1);
    const fullPath = path.join(process.cwd(), "public", filePath);

    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath);
      const ext = path.extname(filePath).substring(1);
      res.setHeader(
        "Content-Type",
        `text/${ext === "html" ? "html" : ext === "js" ? "javascript" : ext}`
      );
      res.send(content);
    } else {
      res.status(404).send("Not found");
    }
  }
}

// TODO: Create a callback function to handle the OIDC redirect
const handleOidcRedirect = async (req: VercelRequest, res: VercelResponse) => {
  // TODO: Use the Node SDK to exchange the OIDC code for a token
  // TODO: descopeClient.oauth.exchange('code')
  // TODO: Validate the token with the Node SDK using descopeClient.validateSession(token)
  // TODO: Create a JWT token for the user
  // TODO: Redirect to the frontend with the JWT token like before. Probably a separate function.
  // Next Phase: Implement caching of the email on the backend, so we can validate that as well
};
