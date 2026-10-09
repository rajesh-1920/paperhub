// Security response headers enforced by Express itself (not only by static
// hosts that read public/_headers). Mirrors public/_headers so local,
// Docker and Render deployments all send the same baseline.
//
// NOTE: script-src keeps 'unsafe-inline' because pages still use inline
// handlers (index.html, settings.html). Externalise those to tighten to
// 'self' — tracked in SECURITY.md.

export function securityHeaders() {
  return (req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob:",
        "connect-src 'self' https://www.googleapis.com https://accounts.google.com",
        "frame-src 'self' blob:",
        "frame-ancestors 'none'",
        "object-src 'none'",
        "base-uri 'self'",
      ].join("; "),
    );
    next();
  };
}
