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
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        bufferutil: "bufferutil",
        "utf-8-validate": "utf-8-validate",
      });
    }
    return config;
  },

  // Suppress the Edge Runtime warning for Supabase in middleware
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
};

module.exports = nextConfig;

