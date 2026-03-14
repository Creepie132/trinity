/** @type {import('next').NextConfig} */
module.exports = {
  experimental: {
    serverActions: true
  },
  images: {
    domains: ['qcnpuycnzthgkhggpvpa.supabase.co']
  },
  // Ускорение билда на Vercel
  output: 'standalone',
  // Отключаем source maps в продакшене — экономит время и память
  productionBrowserSourceMaps: false,
  // Минимизируем что пересобирается
  poweredByHeader: false,
}
