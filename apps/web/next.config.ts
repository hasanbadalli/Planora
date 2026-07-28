import type { NextConfig } from "next";

/*
 * When API_PROXY_TARGET is set (production), /api/v1/* is proxied to the
 * separately deployed API project. The browser then only ever talks to this
 * app's own domain, so the HttpOnly auth cookie stays first-party and
 * SameSite=Lax keeps working. Locally the variable is unset and the client
 * calls the API directly via NEXT_PUBLIC_API_URL.
 */
const apiProxyTarget = process.env.API_PROXY_TARGET;

const nextConfig: NextConfig = {
  async rewrites() {
    if (!apiProxyTarget) return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiProxyTarget.replace(/\/$/, "")}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
