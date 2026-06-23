import { verifyAccessToken } from "../auth/tokens.js";

// Authentication & RBAC middleware. The verified JWT is the single source of
// truth for identity and role — never a client-supplied header or body field.

export function getBearerToken(req) {
  const header = (req.headers && req.headers.authorization) || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : "";
}

// Returns { id, role, name } from a valid access token, or null.
export function authenticate(req) {
  const payload = verifyAccessToken(getBearerToken(req));
  if (!payload || !payload.sub) {
    return null;
  }
  return { id: payload.sub, role: payload.role, name: payload.name };
}

// Hard gate: 401 unless a valid access token is present.
export function requireAuth(req, res, next) {
  const user = authenticate(req);
  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  req.user = user;
  next();
}

// Soft gate: attach req.user when authenticated, otherwise continue as a guest.
export function optionalAuth(req, res, next) {
  req.user = authenticate(req) || null;
  next();
}

// Role gate. Admin is a superuser; any other role must be explicitly allowed.
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (req.user.role === "admin" || roles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ error: "Insufficient permissions" });
  };
}
