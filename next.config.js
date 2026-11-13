/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {},
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
