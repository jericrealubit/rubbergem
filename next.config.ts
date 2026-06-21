import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Keeps it a static HTML export
  images: {
    unoptimized: true,
  },
  // Ensure basePath and assetPrefix are completely gone or commented out
};

export default nextConfig;
