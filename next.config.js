// @ts-check
const withPWA = require('@ducanh2912/next-pwa').default({
  // ── Куда генерировать sw.js и workbox-*.js ───────────────────────────────
  dest: 'public',

  // ── Кастомный SW-шаблон с нашей бизнес-логикой ──────────────────────────
  // next-pwa скомпилирует src/sw.ts → public/sw.js, инжектирует __WB_MANIFEST
  swSrc: 'src/sw.ts',

  // ── Отключить в дев-режиме: SW + кэш = боль при разработке ─────────────
  disable: process.env.NODE_ENV === 'development',

  // ── SW берёт управление немедленно, без ожидания reload ─────────────────
  skipWaiting: true,
  clientsClaim: true,

  // ── Агрессивный precache: включаем всё из _next/static ──────────────────
  aggressiveFrontEndNavCaching: true,

  // ── Иконки и манифест — не прекэшировать отдельно (они в manifest.json) ─
  // next-pwa сам добавит нужные ассеты
  reloadOnOnline: true,

  // ── Workbox конфиг ───────────────────────────────────────────────────────
  workboxOptions: {
    // Максимальный размер файла для precache (5MB — для крупных JS-чанков)
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,

    // Исключаем из precache: карты, большие медиафайлы
    exclude: [
      /\.map$/,
      /^manifest.*\.js$/,
      /\.mp4$/,
      /\.webm$/,
    ],
  },
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // serverActions: true — deprecated boolean form, always enabled in Next.js 15+
  },

  // ─── Images ─────────────────────────────────────────────────────────────
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

  // ─── Output & build ──────────────────────────────────────────────────────
  output: 'standalone',
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  compress: true,

  // ─── Webpack: алиас @/* для совместимости с next-pwa (webpack mode) ─────
  webpack(config) {
    const path = require('path')
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    }
    return config
  },

  // ─── HTTP Cache Headers ──────────────────────────────────────────────────
  async headers() {
    return [
      {
        // Static assets — cache 1 year (хешированы Next.js → иммутабельны)
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // SW файлы — НЕ кэшировать, браузер должен всегда проверять обновления
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        // Workbox runtime chunks (генерируются рядом с sw.js)
        source: '/workbox-:hash.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
      {
        // Иконки, манифест — cache 1 week
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
        // Видео — Range-запросы для стриминга
        source: '/:path*.(mp4|webm|ogg)',
        headers: [
          { key: 'Content-Type', value: 'video/mp4' },
          { key: 'Accept-Ranges', value: 'bytes' },
          { key: 'Cache-Control', value: 'public, max-age=604800' },
        ],
      },
      {
        // API routes — no cache (SW обрабатывает StaleWhileRevalidate сам)
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache' },
        ],
      },
    ]
  },
}

module.exports = withPWA(nextConfig)
