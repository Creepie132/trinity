'use client';

import { useState, useEffect } from 'react';
import ModalWrapper from './ModalWrapper';
import { Switch } from '@/components/ui/switch';
import { Plus, X } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface Service {
  name: string;
  price: string;
  hasDuration: boolean;
  duration: string;
}

interface NewUserOnboardingModalProps {
  isOpen: boolean;
  orgId: string;
}

type Language = 'ru' | 'he';

const translations = {
  ru: {
    welcome: {
      title: 'Добро пожаловать в систему Trinity производства Amber Solutions. Далее вам нужно заполнить тип вашего бизнеса и услуги которые вы предоставляете. После чего вы можете приступать к работе!',
      next: 'Дальше →',
    },
    services: {
      title: 'Добавление услуг',
      serviceName: 'Название услуги',
      price: 'Цена ₪',
      hasDuration: 'Есть длительность',
      duration: 'Длительность (мин)',
      addService: '+ Добавить ещё услугу',
      skip: 'Пропустить',
      complete: 'Завершить',
      serviceNameRequired: 'Введите название услуги',
    },
    langToggle: {
      ru: 'РУС',
      he: 'ЕН',
    },
  },
  he: {
    welcome: {
      title: 'ברוכים הבאים למערכת Trinity מתוצרת Amber Solutions. עליכם למלא את סוג העסק שלכם ואת השירותים שאתם מספקים. לאחר מכן תוכלו להתחיל לעבוד!',
      next: '← המשך',
    },
    services: {
      title: 'הוספת שירותים',
      serviceName: 'שם השירות',
      price: '₪ מחיר',
      hasDuration: 'יש משך זמן',
      duration: 'משך זמן (דקות)',
      addService: '+ הוסף שירות נוסף',
      skip: 'דלג',
      complete: 'סיים',
      serviceNameRequired: 'הזן שם שירות',
    },
    langToggle: {
      ru: 'РУС',
      he: 'עב',
    },
  },
};

export default function NewUserOnboardingModal({ isOpen, orgId }: NewUserOnboardingModalProps) {
  const [screen, setScreen] = useState<1 | 2>(1);
  const [language, setLanguage] = useState<Language>('ru');
  const [services, setServices] = useState<Service[]>([
    { name: '', price: '', hasDuration: true, duration: '60' },
  ]);
  const [loading, setLoading] = useState(false);
  const supabase = createSupabaseBrowserClient();

  const t = translations[language];
  const isRTL = language === 'he';

  // Confetti on mount (screen 1)
  useEffect(() => {
    if (isOpen && screen === 1) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 999999 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: any = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isOpen, screen]);

  const addService = () => {
    setServices([...services, { name: '', price: '', hasDuration: true, duration: '60' }]);
  };

  const removeService = (index: number) => {
    if (services.length > 1) {
      setServices(services.filter((_, i) => i !== index));
    }
  };

  const updateService = (index: number, field: keyof Service, value: string | boolean) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  };

  const handleNext = () => {
    setScreen(2);
  };

  const handleSkip = async () => {
    await completeOnboarding([]);
  };

  const handleComplete = async () => {
    // Validate services
    const validServices = services.filter((s) => s.name.trim() !== '');
    if (validServices.length === 0) {
      toast.error(t.services.serviceNameRequired);
      return;
    }

    await completeOnboarding(validServices);
  };

  const completeOnboarding = async (servicesToSave: Service[]) => {
    setLoading(true);
    try {
      // Save services if any
      if (servicesToSave.length > 0) {
        const serviceRecords = servicesToSave.map((s) => ({
          org_id: orgId,
          name: s.name.trim(),
          price: parseFloat(s.price) || 0,
          duration_minutes: s.hasDuration ? parseInt(s.duration) || 60 : null,
          is_active: true,
        }));

        const { error: servicesError } = await supabase.from('services').insert(serviceRecords);

        if (servicesError) {
          console.error('[Onboarding] Services error:', servicesError);
          throw servicesError;
        }
      }

      // Update onboarding_completed flag
      const { data: org } = await supabase
        .from('organizations')
        .select('features')
        .eq('id', orgId)
        .single();

      const updatedFeatures = {
        ...(org?.features || {}),
        onboarding_completed: true,
      };

      const { error: orgError } = await supabase
        .from('organizations')
        .update({ features: updatedFeatures })
        .eq('id', orgId);

      if (orgError) {
        console.error('[Onboarding] Org update error:', orgError);
        throw orgError;
      }

      toast.success('✅');
      
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    } catch (error: any) {
      console.error('[Onboarding] Error:', error);
      toast.error(error?.message || 'Ошибка сохранения');
      setLoading(false);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={() => {}}>
      <div
        className="w-[600px] max-w-[95vw] h-[500px] max-h-[90vh] p-8 overflow-auto"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header with language toggle */}
        <div className={`flex gap-2 mb-8 ${isRTL ? 'justify-start' : 'justify-end'}`}>
          <button
            onClick={() => setLanguage('ru')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              language === 'ru'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {t.langToggle.ru}
          </button>
          <button
            onClick={() => setLanguage('he')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              language === 'he'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {t.langToggle.he}
          </button>
        </div>

        {/* Screen 1: Welcome */}
        {screen === 1 && (
          <div className="flex flex-col h-[calc(100%-80px)] justify-between">
            <div>
              <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-300">
                {t.welcome.title}
              </p>
            </div>

            <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all"
              >
                {t.welcome.next}
              </button>
            </div>
          </div>
        )}

        {/* Screen 2: Add Services */}
        {screen === 2 && (
          <div className="flex flex-col h-[calc(100%-80px)]">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
              {t.services.title}
            </h2>

            <div className="flex-1 overflow-auto space-y-4 mb-6">
              {services.map((service, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-300 dark:border-gray-700 rounded-lg space-y-3 relative"
                >
                  {services.length > 1 && (
                    <button
                      onClick={() => removeService(index)}
                      className={`absolute top-2 ${
                        isRTL ? 'left-2' : 'right-2'
                      } text-red-500 hover:text-red-600`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}

                  {/* Service Name */}
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      {t.services.serviceName}
                    </label>
                    <input
                      type="text"
                      value={service.name}
                      onChange={(e) => updateService(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder={t.services.serviceName}
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      {t.services.price}
                    </label>
                    <input
                      type="number"
                      value={service.price}
                      onChange={(e) => updateService(index, 'price', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  {/* Has Duration Toggle */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t.services.hasDuration}
                    </label>
                    <Switch
                      checked={service.hasDuration}
                      onCheckedChange={(checked) => updateService(index, 'hasDuration', checked)}
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${
                        service.hasDuration
                          ? 'text-gray-700 dark:text-gray-300'
                          : 'text-gray-400 dark:text-gray-600'
                      }`}
                    >
                      {t.services.duration}
                    </label>
                    <input
                      type="number"
                      value={service.duration}
                      onChange={(e) => updateService(index, 'duration', e.target.value)}
                      disabled={!service.hasDuration}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        service.hasDuration
                          ? 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                          : 'border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      }`}
                      placeholder="60"
                    />
                  </div>
                </div>
              ))}

              <button
                onClick={addService}
                className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-purple-600 dark:text-purple-400 font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                {t.services.addService}
              </button>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-between">
              <button
                onClick={handleSkip}
                disabled={loading}
                className="px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
              >
                {t.services.skip}
              </button>
              <button
                onClick={handleComplete}
                disabled={loading}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
              >
                {loading ? '...' : t.services.complete}
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalWrapper>
  );
}
