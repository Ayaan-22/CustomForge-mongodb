import { URL } from "node:url";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Opt-in production preview can coexist with a running dev server.
  distDir: process.env.FORGE_PREVIEW === '1' ? '.forge-preview' : '.next',
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)),
  poweredByHeader: false,
  async rewrites() {
    const origin = (process.env.API_BACKEND_URL || 'http://localhost:5000').replace(/\/+$/, '').replace(/\/api\/v1$/, '');
    return [{ source: '/api/v1/:path*', destination: `${origin}/api/v1/:path*` }];
  },
  images: {
    qualities: [60, 75],
    // Local art and approved upload hosts get responsive WebP optimization.
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
    formats: ['image/webp'],
  },
}

export default nextConfig
