import type { NextConfig } from "next";

const productionLike =
  process.env.APP_ENV === "production" || process.env.VERCEL_ENV === "production";

// Google AdSense loads its script, ad frames, images, and measurement calls from these hosts.
const adHosts = [
  "https://pagead2.googlesyndication.com",
  "https://*.googlesyndication.com",
  "https://*.doubleclick.net",
  "https://*.googleadservices.com",
  "https://*.google.com",
  "https://*.gstatic.com",
  "https://*.adtrafficquality.google"
].join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${productionLike ? "" : " 'unsafe-eval'"} ${adHosts}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  `connect-src 'self' ${adHosts}`,
  `frame-src ${adHosts}`,
  "media-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests"
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Ad clicks open the advertiser in a new window, which "same-origin" would cut off.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
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
    ...(process.env.NODE_ENV === "development" ? ["dev.tsx", "prototype.tsx"] : [])
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
