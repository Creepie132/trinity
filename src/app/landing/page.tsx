'use client'

import { useState, useEffect, useRef } from 'react'
import { Menu, X, ChevronRight } from 'lucide-react'

// Translations type
interface Translations {
  nav: {
    about: string
    services: string
    portfolio: string
    contact: string
  }
  hero: {
    title: string
    subtitle: string
    cta: string
  }
  // Добавим остальные секции по мере поступления информации
}

const translations: Record<'he' | 'ru', Translations> = {
  he: {
    nav: {
      about: 'אודות',
      services: 'שירותים',
      portfolio: 'תיק עבודות',
      contact: 'צור קשר',
    },
    hero: {
      title: 'Amber Solutions Systems',
      subtitle: 'פתרונות טכנולוגיים מתקדמים לעסק שלך',
      cta: 'צור קשר',
    },
  },
  ru: {
    nav: {
      about: 'О нас',
      services: 'Услуги',
      portfolio: 'Портфолио',
      contact: 'Контакты',
    },
    hero: {
      title: 'Amber Solutions Systems',
      subtitle: 'Передовые технологические решения для вашего бизнеса',
      cta: 'Связаться с нами',
    },
  },
}

export default function LandingPage() {
  const [language, setLanguage] = useState<'he' | 'ru'>('he')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const t = translations[language]
  const dir = language === 'he' ? 'rtl' : 'ltr'

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in')
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px',
      }
    )

    const elements = document.querySelectorAll('.fade-in-section')
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  // Update document direction
  useEffect(() => {
    document.documentElement.setAttribute('dir', dir)
    document.documentElement.setAttribute('lang', language)
  }, [dir, language])

  return (
    <div className={`min-h-screen font-sans ${dir === 'rtl' ? 'rtl' : 'ltr'}`} dir={dir}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <span className="text-2xl font-bold text-blue-900">
                Amber Solutions
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#about" className="text-gray-700 hover:text-blue-900 transition-colors">
                {t.nav.about}
              </a>
              <a href="#services" className="text-gray-700 hover:text-blue-900 transition-colors">
                {t.nav.services}
              </a>
              <a href="#portfolio" className="text-gray-700 hover:text-blue-900 transition-colors">
                {t.nav.portfolio}
              </a>
              <a href="#contact" className="text-gray-700 hover:text-blue-900 transition-colors">
                {t.nav.contact}
              </a>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLanguage(language === 'he' ? 'ru' : 'he')}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-blue-900 border border-gray-300 rounded-md hover:border-blue-900 transition-colors"
              >
                {language === 'he' ? 'Русский' : 'עברית'}
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-700 hover:text-blue-900"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              <div className="flex flex-col gap-4">
                <a
                  href="#about"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 hover:text-blue-900 transition-colors"
                >
                  {t.nav.about}
                </a>
                <a
                  href="#services"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 hover:text-blue-900 transition-colors"
                >
                  {t.nav.services}
                </a>
                <a
                  href="#portfolio"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 hover:text-blue-900 transition-colors"
                >
                  {t.nav.portfolio}
                </a>
                <a
                  href="#contact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-700 hover:text-blue-900 transition-colors"
                >
                  {t.nav.contact}
                </a>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section
        className="relative min-h-screen flex items-center justify-center pt-16"
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 animate-fade-in">
            {t.hero.title}
          </h1>
          <p className="text-xl sm:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto animate-fade-in-delay">
            {t.hero.subtitle}
          </p>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-900 rounded-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 animate-fade-in-delay-2"
          >
            {t.hero.cta}
            <ChevronRight size={20} className={dir === 'rtl' ? 'rotate-180' : ''} />
          </a>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2"></div>
          </div>
        </div>
      </section>

      {/* About Section - Placeholder */}
      <section id="about" className="py-20 bg-white fade-in-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12">
            {t.nav.about}
          </h2>
          <div className="text-center text-gray-600">
            {/* Контент будет добавлен позже */}
            <p className="text-lg">Секция в разработке - ожидаем контент...</p>
          </div>
        </div>
      </section>

      {/* Services Section - Placeholder */}
      <section id="services" className="py-20 bg-gray-50 fade-in-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12">
            {t.nav.services}
          </h2>
          <div className="text-center text-gray-600">
            <p className="text-lg">Секция в разработке - ожидаем контент...</p>
          </div>
        </div>
      </section>

      {/* Portfolio Section - Placeholder */}
      <section id="portfolio" className="py-20 bg-white fade-in-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12">
            {t.nav.portfolio}
          </h2>
          <div className="text-center text-gray-600">
            <p className="text-lg">Секция в разработке - ожидаем контент...</p>
          </div>
        </div>
      </section>

      {/* Contact Section - Placeholder */}
      <section id="contact" className="py-20 bg-gray-50 fade-in-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12">
            {t.nav.contact}
          </h2>
          <div className="text-center text-gray-600">
            <p className="text-lg">Секция в разработке - ожидаем контент...</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2026 Amber Solutions Systems. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Global Styles for Animations */}
      <style jsx global>{`
        .fade-in-section {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }

        .fade-in-section.animate-in {
          opacity: 1;
          transform: translateY(0);
        }

        .animate-fade-in {
          animation: fadeIn 0.8s ease-out;
        }

        .animate-fade-in-delay {
          animation: fadeIn 0.8s ease-out 0.3s both;
        }

        .animate-fade-in-delay-2 {
          animation: fadeIn 0.8s ease-out 0.6s both;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        html[dir='rtl'] {
          direction: rtl;
        }

        html[dir='ltr'] {
          direction: ltr;
        }
      `}</style>
    </div>
  )
}
