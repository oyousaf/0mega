import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable source-maps in dev + prod (stops invalid-source-map warnings)
  productionBrowserSourceMaps: false,

  webpack(config) {
    // Disable sourcemaps entirely at build + dev runtime
    config.devtool = false;
    return config;
  },
};

export default nextConfig;
