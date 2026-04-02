import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://ambersol.co.il'

  return {
    rules: [
      {
        // Все боты — закрываем внутренние разделы
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/office/',
          '/api/',
          '/dashboard/',
          '/onboarding/',
          '/callback/',
          '/blocked/',
          '/access-pending/',
          '/subscription-expired/',
          '/subscription-success/',
          '/payment/',
          '/payment-failed/',
          '/payment-success/',
          '/unauthorized/',
          '/invite/',
          '/actions/',
          '/book/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
