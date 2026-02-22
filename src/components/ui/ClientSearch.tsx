'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
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

  // Search clients
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['client-search', orgId, debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return [];

      const supabase = createSupabaseBrowserClient();
      
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, phone')
        .eq('org_id', orgId)
        .or(`first_name.ilike.%${debouncedQuery}%,last_name.ilike.%${debouncedQuery}%,phone.ilike.%${debouncedQuery}%`)
        .limit(5);

      if (error) {
        console.error('Client search error:', error);
        return [];
      }

      return data || [];
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
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {isLoading ? (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {locale === 'he' ? 'טוען...' : locale === 'ru' ? 'Загрузка...' : 'Loading...'}
                </div>
              ) : clients.length > 0 ? (
                clients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => handleSelect(client)}
                    className="w-full px-4 py-3 text-right hover:bg-gray-50 dark:hover:bg-gray-600 transition flex items-center justify-between"
                    type="button"
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {getClientDisplay(client)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {client.phone}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                  {getNoResults()}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
