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
};

export default nextConfig;
