import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // the Docker image (for Unraid) builds a standalone server; a plain `npm run build && npm start` does not need it
  output: process.env.SOLOFLOW_STANDALONE ? 'standalone' : undefined,
  serverExternalPackages: ['pdfjs-dist', '@prisma/client', 'bcryptjs'],
  experimental: { serverActions: { bodySizeLimit: '30mb' } },
  // the service worker must always be fetched fresh so app updates reach installed copies
  async headers() {
    return [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }, { key: 'Content-Type', value: 'application/javascript; charset=utf-8' }] }];
  }
};

export default nextConfig;
