/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['novel'],
  swcMinify: true,
  images: {
    domains: ['i.ibb.co', 'github.com', 'raw.githubusercontent.com'],
  },
  experimental: {
    appDir: true,
    serverActions: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;