import type { NextConfig } from 'next';

/**
 * Security headers are applied globally. HSTS is only meaningful behind HTTPS,
 * which the deployment platform terminates (Vercel/ALB/nginx).
 */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['bcryptjs'],
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      // Never let authenticated app or API responses sit in a shared cache.
      {
        source: '/(app|api)/(.*)',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
    ];
  },
};

export default nextConfig;
