'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '@/hooks/useScrollLock';

interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function ModalWrapper({ isOpen, onClose, children }: ModalWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // iOS-safe блокировка скролла фона
  useScrollLock(isOpen);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-gray-900 rounded-[32px] max-h-[90vh] w-full max-w-4xl overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
