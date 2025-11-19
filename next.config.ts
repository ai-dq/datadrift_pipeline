import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'local-origin.dev',
    '*.local-origin.dev',
    '121.126.210.2',
  ],
  rewrites: async () => {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: `http://121.126.210.2:${process.env.CORE_API_PORT}/:path*`,
        },
      ];
    } else {
      return [
        {
          source: '/api/:path*',
          destination: `http://localhost:${process.env.CORE_API_PORT}/:path*`,
        },
      ];
    }
  },
};

export default nextConfig;
