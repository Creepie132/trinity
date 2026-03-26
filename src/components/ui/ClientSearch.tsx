'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface ClientSearchProps {
  orgId: string;
  onSelect: (client: Client | null) => void;
  placeholder?: string;
  locale?: 'he' | 'ru' | 'en';
  value?: Client | null;
}

export function ClientSearch({
  orgId,
  onSelect,
  placeholder,
  locale = 'he',
  value,
}: ClientSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search clients — через API (server-side, service role, учитывает activeOrgId)
  // Прямой Supabase browser-запрос нельзя использовать: RLS блокирует доступ
  // к чужим org во время impersonation, даже если orgId передан правильно.
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['client-search', orgId, debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return [];
      const res = await fetch(`/api/clients?search=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) return [];
      const data = await res.json();
      // Возвращаем до 8 — покажем 5, остальные скроллим
      return (Array.isArray(data) ? data : []).slice(0, 8);
    },
    enabled: debouncedQuery.length >= 2,
  });

  const handleSelect = (client: Client) => {
    onSelect(client);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setSearchQuery('');
  };

  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    if (locale === 'he') return 'חפש לקוח...';
    if (locale === 'ru') return 'Поиск клиента...';
    return 'Search client...';
  };

  const getNoResults = () => {
    if (locale === 'he') return 'לא נמצאו לקוחות';
    if (locale === 'ru') return 'Клиенты не найдены';
    return 'No clients found';
  };

  const getClientDisplay = (client: Client) => {
    return `${client.first_name} ${client.last_name}`;
  };

  return (
    <div ref={wrapperRef} className="relative">
      {value ? (
        // Selected client display
        <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {getClientDisplay(value)}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {value.phone}
            </span>
          </div>
          <button
            onClick={handleClear}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition"
            type="button"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      ) : (
        // Search input
        <>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={getPlaceholder()}
              className="pr-10 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
            />
          </div>

          {/* Dropdown */}
          {isOpen && searchQuery.length >= 2 && (
            <div className="absolute z-[200] w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden top-full mt-1">
              {/* Скроллируемая зона — 5 пунктов максимум видно */}
              <div className="max-h-[220px] overflow-y-auto">
                {isLoading ? (
                  <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {locale === 'he' ? 'טוען...' : locale === 'ru' ? 'Загрузка...' : 'Loading...'}
                  </div>
                ) : clients.length > 0 ? (
                  <>
                    {clients.slice(0, 5).map((client) => (
                      <button
                        key={client.id}
                        onClick={() => handleSelect(client)}
                        className="w-full px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center justify-between border-b border-gray-50 dark:border-gray-700 last:border-0"
                        type="button"
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {getClientDisplay(client)}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-400">
                          {client.phone}
                        </span>
                      </button>
                    ))}
                    {/* Если больше 5 результатов — подсказка */}
                    {clients.length > 5 && (
                      <div className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500 text-center bg-gray-50 dark:bg-gray-700/50">
                        {locale === 'he'
                          ? 'הקלד יותר תווים לתוצאות מדויקות יותר'
                          : locale === 'ru'
                          ? 'Введите больше символов для точного поиска'
                          : 'Type more characters for better results'}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                    {getNoResults()}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
