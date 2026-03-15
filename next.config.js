/** @type {import('next').NextConfig} */
module.exports = {
  experimental: {
    // serverActions: true — deprecated boolean form, now always enabled in Next.js 15+
  },

  // ─── Images ───────────────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qcnpuycnzthgkhggpvpa.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'tjryzcqvsavtllahjyrj.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  // ─── Output & build ───────────────────────────────────────────────────────
  output: 'standalone',
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  compress: true,

  // ─── HTTP Cache Headers ───────────────────────────────────────────────────
  async headers() {
    return [
      {
        // Static assets — cache 1 year (они хешированы Next.js)
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Иконки, манифест, скриншоты PWA — cache 1 week
        source: '/:file(manifest.json|favicon.*|icon.*|screenshot.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
      {
        // Статичные картинки из /public — cache 1 week
        source: '/:path*.(png|jpg|jpeg|svg|webp|avif|ico)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
      {
        // API routes — no cache by default
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache' },
        ],
      },
    ]
  },
}
