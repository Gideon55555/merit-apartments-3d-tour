import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Textures and models change rarely: cache them for 30 days, and keep
  // serving the cached copy while revalidating in the background
  async headers() {
    return [
      {
        source: "/:dir(textures|models)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
