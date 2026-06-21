import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Required for Cloudflare Pages static hosting
  images: {
    unoptimized: true,
  },
  // Remove assetPrefix entirely, leave only basePath
  basePath: "/rubbergem",
};

export default nextConfig;
