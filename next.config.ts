import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the native SQLite driver out of the serverless trace when unused.
  serverExternalPackages: ["better-sqlite3"],
  // Next.js 16 blocks cross-origin /_next assets in dev. Opening the app via
  // http://127.0.0.1:<port> (instead of localhost) otherwise 403s CSS/JS/HMR,
  // so client pages like /admin never hydrate past the loading skeleton.
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
