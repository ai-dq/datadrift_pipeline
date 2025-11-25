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
          source: '/api/qocr/:path*',
          destination: `http://121.126.210.2:${process.env.CORE_API_PORT}/v1/:path*`,
        },
        {
          source: '/api/labelstudio/:path*',
          destination: `http://121.126.210.2:${process.env.LABEL_STUDIO_PORT}/api/:path*`,
        },
      ];
    } else {
      return [
        {
          source: '/api/qocr/:path*',
          destination: `http://localhost:${process.env.CORE_API_PORT}/v1/:path*`,
        },
        {
          source: '/api/labelstudio/:path*',
          destination: `http://localhost:${process.env.LABEL_STUDIO_PORT}/api/:path*`,
        },
      ];
    }
  },
};

export default nextConfig;
