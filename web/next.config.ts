import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Upload checks and the planner's previews run Remotion's bundled ffmpeg/ffprobe (Vercel has none);
  // ship the binaries with those routes (see src/lib/ffmpeg-bin.ts).
  outputFileTracingIncludes: Object.fromEntries(
    ["/api/uploads", "/api/uploads/complete", "/api/generations", "/api/ideas"]
      .map((r) => [r, ["./node_modules/@remotion/compositor-linux-x64-gnu/**/*"]]),
  ),
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
