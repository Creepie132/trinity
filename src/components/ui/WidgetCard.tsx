import { ReactNode } from 'react';

interface WidgetCardProps {
  children: ReactNode;
  className?: string;
}

export function WidgetCard({ children, className = '' }: WidgetCardProps) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-2xl shadow-sm p-5 dark:bg-slate-900 dark:border-slate-800 ${className}`}
    >
      {children}
    </div>
  );
}
