import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Required for Cloudflare Pages Static HTML Exports
  images: {
    unoptimized: true, // Required for static exports
  },
  // If the build environment knows it is targeting a subpath, apply it; otherwise, default to root '/'
  basePath: process.env.NODE_ENV === "production" ? "/rubbergem" : "",
};

export default nextConfig;
