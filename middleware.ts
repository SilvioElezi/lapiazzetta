import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

const securityHeaders = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-DNS-Prefetch-Control": "on",
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect admin API routes (except /admin/api/auth)
  if (pathname.startsWith("/admin/api") && pathname !== "/admin/api/auth") {
    const token = req.headers.get("x-admin-token");
    const expected = process.env.SUPER_ADMIN_PASSWORD;

    if (!expected || !token || !safeCompare(token, expected)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const response = NextResponse.next();

  // Apply security headers to all responses
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: [
    // Admin API routes
    "/admin/api/:path*",
    // All pages (for security headers) — exclude static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
