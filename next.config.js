// @ts-check
const withPWA = require('@ducanh2912/next-pwa').default({
  // ── Куда генерировать sw.js и workbox-*.js ───────────────────────────────
  dest: 'public',

  // ── Кастомный worker (push-обработчики) ─────────────────────────────────
  // @ducanh2912/next-pwa НЕ поддерживает swSrc (это API старого next-pwa).
  // customWorkerSrc указывает папку, содержимое которой плагин собирает
  // в отдельный worker-файл и инжектирует в основной /sw.js через
  // importScripts. Путь резолвится относительно КОРНЯ проекта, не от src/.
  // Плагин ищет {src/,}index.{ts,js} внутри этой папки (dist/index.cjs:869).
  customWorkerSrc: 'src/worker',

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

      // Исключаем из precache: карты, большие медиафайлы, и все HTML-документы.
    // HTML страницы НЕ должны кэшироваться SW — иначе пользователь видит
    // устаревший дизайн даже в инкогнито и после деплоя.
    exclude: [
      /\.map$/,
      /^manifest.*\.js$/,
      /\.mp4$/,
      /\.webm$/,
      // Исключаем HTML-файлы из precache (функция получает { asset } — webpack asset)
      ({ asset }) => asset.name && asset.name.endsWith('.html'),
    ],

    // Явные runtime caching правила.
    // Document-запросы (HTML) — НЕ включаем, они уходят напрямую в сеть.
    runtimeCaching: [
      {
        // _next/static — иммутабельны (хешированы), кэшируем навсегда
        urlPattern: /^\/_next\/static\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-assets',
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          },
        },
      },
      {
        // Изображения из /public
        urlPattern: /\.(?:png|jpg|jpeg|svg|webp|avif|ico|gif)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 7,
          },
        },
      },
      {
        // Google Fonts
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts',
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          },
        },
      },
      // HTML/навигация — НЕ добавляем. Все document-запросы идут в сеть напрямую.
    ],
  },
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // serverActions: true — deprecated boolean form, always enabled in Next.js 15+
    // instrumentationHook: включает instrumentation.ts для глобального перехвата ошибок
    instrumentationHook: true,
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

  // ─── Asset prefix: чанки запрашиваются напрямую с trinity-sage.vercel.app
  // Нужно когда лендинг открывается через rewrite ambersol.co.il/trinity →
  // trinity-sage.vercel.app/landing. Без этого браузер запрашивает
  // /_next/static/* с ambersol.co.il где их нет → 503 → React не гидрируется.
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://app.ambersol.co.il' : '',

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
        // CORS для ассетов — нужно когда ambersol.co.il грузит чанки напрямую
        // с trinity-sage.vercel.app через assetPrefix
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
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
      {
        // HTML страницы — НЕ кэшировать на Vercel Edge.
        // Без этого заголовка Vercel может отдавать устаревший HTML
        // анонимным пользователям (инкогнито, новый браузер).
        // Исключаем: _next/*, api/*, файлы со статическим расширением.
        source: '/((?!_next|api|.*\\..*$).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
    ]
  },
}

module.exports = withPWA(nextConfig)
