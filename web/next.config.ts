import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Upload checks run Remotion's bundled ffprobe (Vercel has no system ffmpeg); ship it with those routes.
  outputFileTracingIncludes: {
    "/api/uploads/complete": ["./node_modules/@remotion/compositor-linux-x64-gnu/**/*"],
    "/api/uploads": ["./node_modules/@remotion/compositor-linux-x64-gnu/**/*"],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
