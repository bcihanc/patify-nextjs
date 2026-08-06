import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['@radix-ui/react-checkbox', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-label', '@radix-ui/react-slot'],
  },
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  compress: true,
  poweredByHeader: false,
  // Next 16 otherwise appends an "agent rules" block to the project's CLAUDE.md
  // on every dev/build; this repo's CLAUDE.md is hand-maintained, so opt out.
  agentRules: false,
};

export default nextConfig;
