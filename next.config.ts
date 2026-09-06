import type { NextConfig } from "next";

function apiOrigin() {
  const value = process.env.OMEGA_API_ORIGIN?.trim().replace(/\/$/, "");

  if (!value) return null;

  const url = new URL(value);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("OMEGA_API_ORIGIN must use HTTPS in production");
  }

  return url.origin;
}

const backendOrigin = apiOrigin();

const nextConfig: NextConfig = {
  agentRules: false,
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async rewrites() {
    if (!backendOrigin) return [];

    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
