/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {},
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      { source: '/models.html', destination: '/virtual-office/models.html' },
      { source: '/providers.html', destination: '/virtual-office/providers.html' },
      { source: '/cron.html', destination: '/virtual-office/cron.html' },
      { source: '/setup', destination: '/virtual-office/setup.html' },
    ];
  },
};

module.exports = nextConfig;
