import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // LAN'daki diğer cihazlar dev sunucusuna IP ile girebilsin (192.168.x.x, 10.x.x.x, makine.local)
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
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
