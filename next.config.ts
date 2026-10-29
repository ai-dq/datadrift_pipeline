import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  experimental: { proxyTimeout: 180000 },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:18092/api/:path*",
      },
    ];
  },
};
export default config;
