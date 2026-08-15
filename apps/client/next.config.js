/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: no Node.js runtime in container, purely static files for Nginx
  output: 'export',

  // Disable static optimization for interactive routes
  reactStrictMode: true,
  swcMinify: true,

  // Image optimization disabled for static export
  images: {
    unoptimized: true,
  },

  // Trailing slash for cleaner routing with static files
  trailingSlash: true,
};

module.exports = nextConfig;
