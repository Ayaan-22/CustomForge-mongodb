import { URL } from "node:url";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep an opt-in local QA build separate from an active development server.
  distDir: process.env.FORGE_ADMIN_PREVIEW === '1' ? '.forge-preview' : '.next',
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)),
  poweredByHeader: false,
  webpack(config) {
    // Local validation can avoid regenerating large disposable caches on a full drive.
    if (process.env.FORGE_ADMIN_PREVIEW === '1' && process.env.FORGE_ADMIN_NO_BUILD_CACHE === '1') {
      config.cache = false;
    }
    return config;
  },
  async rewrites() {
    const origin = (process.env.API_BACKEND_URL || 'http://localhost:5000').replace(/\/+$/, '').replace(/\/api\/v1$/, '');
    return [{ source: '/api/v1/:path*', destination: `${origin}/api/v1/:path*` }];
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
