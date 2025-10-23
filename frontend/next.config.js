/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development practices
  reactStrictMode: true,
  
  // Configure image domains for external images
  images: {
    domains: ['avatars.githubusercontent.com', 'media.licdn.com'],
  },
  
  // Environment variables that should be available in the browser
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  
  // Optimize for production
  swcMinify: true,
  
  // Configure webpack for any custom loaders
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;

