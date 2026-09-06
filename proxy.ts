import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function unauthorized(message = "Authentication required") {
  return new NextResponse(message, {
    status: 401,
    headers: {
      "Cache-Control": "no-store",
      "WWW-Authenticate": 'Basic realm="Omega", charset="UTF-8"',
    },
  });
}

function validCredentials(req: NextRequest, username: string, password: string) {
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) return false;

  try {
    const decoded = atob(authorization.slice(6));
    const separator = decoded.indexOf(":");
    if (separator < 0) return false;

    return (
      decoded.slice(0, separator) === username &&
      decoded.slice(separator + 1) === password
    );
  } catch {
    return false;
  }
}

export function proxy(req: NextRequest) {
  const username = process.env.OMEGA_AUTH_USERNAME;
  const password = process.env.OMEGA_AUTH_PASSWORD;

  if (!username || !password) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Server authentication is not configured", {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }

    return NextResponse.next();
  }

  if (!validCredentials(req, username, password)) return unauthorized();

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|site.webmanifest|sw.js|.*\\.(?:png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
