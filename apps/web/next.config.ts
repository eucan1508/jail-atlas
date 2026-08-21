import type { NextConfig } from "next";

const productionLike =
  process.env.APP_ENV === "production" || process.env.VERCEL_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${productionLike ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests"
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Frame-Options", value: "DENY" }
];

if (productionLike) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload"
  });
}

const nextConfig: NextConfig = {
  devIndicators: false,
  pageExtensions: [
    "tsx",
    "ts",
    "jsx",
    "js",
    ...(process.env.NODE_ENV === "development" ? ["dev.tsx", "prototype.tsx", "prototype.ts"] : [])
  ],
  poweredByHeader: false,
  reactStrictMode: true,
  trailingSlash: true,
  transpilePackages: [
    "@jail-atlas/database",
    "@jail-atlas/domain",
    "@jail-atlas/editorial",
    "@jail-atlas/test-fixtures",
    "@jail-atlas/ui"
  ],
  headers() {
    return Promise.resolve([
      {
        source: "/:path*",
        headers: securityHeaders
      }
    ]);
  }
};

export default nextConfig;
