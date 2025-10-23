/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development practices
  reactStrictMode: true,
  
  // Configure image domains for external images
  images: {
    domains: ['avatars.githubusercontent.com', 'media.licdn.com'],
  },
  
  // Optimize for production
  swcMinify: true,
  
  // Configure webpack for any custom loaders
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;

