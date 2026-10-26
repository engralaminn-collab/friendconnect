import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `standalone` is required by the deployment scripts (scripts/deploy.sh).
  output: "standalone",
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
