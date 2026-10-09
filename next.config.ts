import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.1.203",
    "192.168.1.201",
    "192.168.1.102",
    "192.168.1.163",
    "192.168.1.164",
  ],
  assetPrefix: 'https://moodboard.siwani.com.np',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Removes frame restrictions so Shopify can embed your app
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://*.myshopify.com https://*.shopify.com;" },
        ],
      },
    ];
  },
};

export default nextConfig;
