import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'local-origin.dev',
    '*.local-origin.dev',
    '121.126.210.2',
  ],
  rewrites: async () => {
    return [
      {
        source: '/proxy/:path*/',
        destination: `${process.env.CORE_API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
