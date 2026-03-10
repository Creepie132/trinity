/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['qcnpuycnzthgkhggpvpa.supabase.co'],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://qcnpuycnzthgkhggpvpa.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjbnB1eWNuenRoZ2toZ2dwdnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk0NjIzNDEsImV4cCI6MjAyNTAzODM0MX0.YOSQEhhIEF3vA3mXT-pvR1M20vIEE8VQgwPrM9UAn0s',
    NEXT_PUBLIC_APP_URL: 'https://trinity-preview.vercel.app'
  }
}

module.exports = nextConfig