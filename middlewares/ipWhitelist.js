/**
 * IP Whitelist Middleware
 *
 * Reads ALLOWED_IPS from .env (comma-separated).
 * If the env var is empty / not set  → restriction is OFF (all IPs allowed).
 * If it has values                   → only those IPs can hit the route.
 *
 * Works behind proxies (Render, Railway, Nginx) via x-forwarded-for header.
 *
 * Usage in routes:
 *   import { ipWhitelist } from "../middlewares/ipWhitelist.js";
 *   routes.post("/loginWithPassword", ipWhitelist, loginWithPassword);
 */

/**
 * Extract the real client IP from the request.
 * Priority: x-forwarded-for → x-real-ip → req.socket.remoteAddress
 */
const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    // x-forwarded-for can be "clientIP, proxy1, proxy2"
    return forwarded.split(",")[0].trim();
  }
  return (
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    ""
  );
};

export const ipWhitelist = (req, res, next) => {
  const rawEnv = process.env.ALLOWED_IPS || "";

  // If env var is empty → restriction disabled, let everyone through
  if (!rawEnv.trim()) {
    return next();
  }

  const allowedIps = rawEnv
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);

  const clientIp = getClientIp(req);

  // Strip IPv6-mapped IPv4 prefix (e.g. "::ffff:103.x.x.x" → "103.x.x.x")
  const normalizedIp = clientIp.replace(/^::ffff:/, "");

  if (allowedIps.includes(normalizedIp)) {
    return next();
  }

  // Blocked — return a clear error with the client's IP so admin can whitelist it
  return res.status(403).json({
    success: false,
    statusCode: 403,
    message: `Access denied. Your IP address (${normalizedIp}) is not allowed to login. Please connect to the office WiFi.`,
    yourIp: normalizedIp,
  });
};
