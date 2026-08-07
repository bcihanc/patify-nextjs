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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // geolocation=self: Maps radius/"yakınımda" özelliği için gerekli.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), payment=(), geolocation=(self)' },
        ],
      },
    ];
  },
};

export default nextConfig;
