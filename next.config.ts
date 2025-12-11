import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable source-maps in dev + prod (stops invalid-source-map warnings)
  productionBrowserSourceMaps: false,

};

export default nextConfig;
