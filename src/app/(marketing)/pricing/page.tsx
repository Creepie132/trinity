import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Тарифы — Trinity CRM',
  description: 'Выберите тариф для вашего бизнеса',
}

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    subtitle: 'Solo',
    price: 300,
    yearlyPrice: 240,
    color: '#6B7280',
    recommended: false,
    features: [
      'Календарь записей',
      'База клиентов',
      'SMS-уведомления',
      'Онлайн-запись',
      'Базовая статистика',
      '1 сотрудник',
    ],
    cta: 'Начать',
  },
  {
    id: 'pro',
    name: 'Pro',
    subtitle: 'Studio',
    price: 480,
    yearlyPrice: 384,
    color: '#FFBF00',
    recommended: true,
    features: [
      'Всё из Basic',
      'WhatsApp автоматизация',
      'Аналитика выручки',
      'Управление складом',
      'Программа лояльности',
      'До 5 сотрудников',
    ],
    cta: 'Выбрать Pro',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    subtitle: 'Chain',
    price: null,
    yearlyPrice: null,
    color: '#A78BFA',
    recommended: false,
    features: [
      'Всё из Pro',
      'Неограниченно сотрудников',
      'API интеграции',
      'Telegram-бот',
      'Белый лейбл',
      'Персональный менеджер',
    ],
    cta: 'Связаться с нами',
  },
]

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0F] text-white overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[50%] translate-x-[-50%] w-[800px] h-[500px] bg-[#FFBF00]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FFBF00]/30 bg-[#FFBF00]/5 text-[#FFBF00] text-sm font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFBF00] animate-pulse" />
            Простые и прозрачные тарифы
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            Выберите тариф для{' '}
            <span className="block text-[#FFBF00]">вашего бизнеса</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Без скрытых платежей. Отмена в любой момент.
          </p>
        </div>

        {/* Toggle Monthly/Yearly — Client Component */}
        <PricingToggle />

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-8 flex flex-col transition-transform hover:-translate-y-1 ${
                plan.recommended
                  ? 'bg-[#111118] border-2 border-[#FFBF00]/60 shadow-[0_0_40px_rgba(255,191,0,0.15)]'
                  : 'bg-[#0F0F16] border border-gray-800'
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-[#FFBF00] text-black text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
                    Рекомендуем
                  </span>
                </div>
              )}

              {/* Plan header */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl font-bold">{plan.name}</span>
                  <span className="text-sm text-gray-500 font-normal">/ {plan.subtitle}</span>
                </div>
                {plan.price ? (
                  <div className="mt-4">
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-bold" style={{ color: plan.color }}>
                        ₪{plan.price}
                      </span>
                      <span className="text-gray-500 mb-1">/мес</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      ₪{plan.yearlyPrice}/мес при оплате за год
                    </p>
                  </div>
                ) : (
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-gray-300">Индивидуально</span>
                    <p className="text-sm text-gray-600 mt-1">Свяжитесь для расчёта</p>
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-gray-300">
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: plan.color }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href="/auth/signup"
                className={`w-full py-3 rounded-xl text-center text-sm font-semibold transition-all ${
                  plan.recommended
                    ? 'bg-[#FFBF00] text-black hover:bg-[#E6AC00]'
                    : 'bg-white/5 text-white border border-gray-700 hover:border-gray-500 hover:bg-white/10'
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Setup Fee block */}
        <div className="mt-12 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#FFBF00]/10 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-[#FFBF00]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-1">
              Единоразовая плата за настройку — <span className="text-[#FFBF00]">₪500</span>
            </h3>
            <p className="text-sm text-gray-400">
              Включает полную настройку системы, импорт ваших данных, обучение персонала и поддержку в течение первого месяца.
            </p>
          </div>
          <div className="text-2xl font-bold text-[#FFBF00] flex-shrink-0">₪500</div>
        </div>

        {/* Trust footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 text-sm mb-4">Безопасные платежи через</p>
          <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-800 bg-white/5">
              <svg viewBox="0 0 48 48" className="w-10 h-6" fill="none">
                <rect width="48" height="48" rx="6" fill="#1A1F71"/>
                <path d="M20 32l4-16h4l-4 16h-4zM14 16l-6 10.5L6 16H2l5 16h4l9-16h-6zM36 16c-1.5 0-4 .5-5 4l-3 12h4l.7-3h4.8l.5 3H42l-3-16h-3zm-.8 10l1.8-7 1.3 7h-3.1z" fill="white"/>
              </svg>
              <span className="text-gray-400 text-xs">Visa</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-800 bg-white/5">
              <div className="flex">
                <div className="w-5 h-5 rounded-full bg-red-500 opacity-90" />
                <div className="w-5 h-5 rounded-full bg-yellow-400 opacity-90 -ml-2" />
              </div>
              <span className="text-gray-400 text-xs">Mastercard</span>
            </div>
            <div className="px-4 py-2 rounded-lg border border-gray-800 bg-white/5">
              <span className="text-gray-400 text-xs font-medium">Tranzila</span>
            </div>
          </div>
          <p className="text-gray-700 text-xs mt-4">
            256-bit SSL шифрование · PCI DSS compliant · Данные карты не хранятся на наших серверах
          </p>
        </div>
      </div>
    </main>
  )
}

// Заглушка для Toggle — заменим на Client Component в следующем шаге
function PricingToggle() {
  return (
    <div className="flex items-center justify-center gap-3">
      <span className="text-white text-sm font-medium">Ежемесячно</span>
      <div className="w-12 h-6 rounded-full bg-gray-800 border border-gray-700 relative cursor-pointer">
        <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-gray-500" />
      </div>
      <span className="text-gray-500 text-sm">Ежегодно</span>
      <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">-20%</span>
    </div>
  )
}
