/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: '.next',
  trailingSlash: false,
  
  images: {
    domains: ['localhost'],
  },
  env: {
    API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  }
}

module.exports = nextConfig