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
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Вычисляем fixed-позицию дропдауна через getBoundingClientRect —
  // это позволяет выходить за пределы overflow:hidden родителей (TrinityModalShell, WizardModal)
  useEffect(() => {
    if (!isOpen || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, [isOpen, searchQuery]);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['client-search', orgId, debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return [];
      const res = await fetch(`/api/clients?search=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) return [];
      const data = await res.json();
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

  const getClientDisplay = (client: Client) => `${client.first_name} ${client.last_name}`;

  return (
    <div ref={wrapperRef} className="relative">
      {value ? (
        <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium text-gray-900 dark:text-white">{getClientDisplay(value)}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{value.phone}</span>
          </div>
          <button onClick={handleClear} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition" type="button">
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setIsOpen(true); }}
              onFocus={() => setIsOpen(true)}
              placeholder={getPlaceholder()}
              className="pr-10 bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white"
            />
          </div>

          {/* Dropdown — fixed позиция, выходит за overflow:hidden родителей */}
          {isOpen && searchQuery.length >= 2 && (
            <div
              style={dropdownStyle}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-2xl overflow-hidden"
            >
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
                        onMouseDown={(e) => { e.preventDefault(); handleSelect(client); }}
                        className="w-full px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-gray-700 transition flex items-center justify-between border-b border-gray-50 dark:border-gray-700 last:border-0"
                        type="button"
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {getClientDisplay(client)}
                        </span>
                        <span className="text-xs text-gray-400">{client.phone}</span>
                      </button>
                    ))}
                    {clients.length > 5 && (
                      <div className="px-4 py-2 text-xs text-amber-600 dark:text-amber-400 text-center bg-amber-50 dark:bg-amber-900/20 border-t border-amber-100 dark:border-amber-800">
                        {locale === 'he'
                          ? '✏️ הקלד יותר תווים לתוצאות מדויקות יותר'
                          : locale === 'ru'
                          ? '✏️ Введите больше символов для точного поиска'
                          : '✏️ Type more characters for better results'}
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
