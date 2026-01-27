'use client';

import { ReactNode } from 'react';
import { Input } from '@/components/ui';

interface HeaderProps {
  title?: string;
  searchPlaceholder?: string;
  actions?: ReactNode;
}

export function Header({
  title,
  searchPlaceholder = 'Search transactions...',
  actions,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-16 bg-[#FFFFFF] border-b border-brand-navy/10">
      <div className="flex items-center justify-between h-full px-6 gap-4">
        {/* Title */}
        {title && (
          <h1 className="text-xl font-semibold text-brand-navy">{title}</h1>
        )}

        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-navy/40 pointer-events-none">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="
                w-full
                pl-10 pr-4 py-2
                text-sm
                bg-brand-bg
                border border-brand-navy/10
                rounded-[var(--radius-input)]
                placeholder:text-brand-navy/40
                focus:outline-none focus:border-brand-emerald focus:ring-2 focus:ring-brand-accent
              "
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {actions}

          {/* Notifications */}
          <button className="relative p-2 text-brand-navy/60 hover:text-brand-navy rounded-[var(--radius-input)] hover:bg-brand-bg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-[var(--radius-pill)]" />
          </button>

          {/* User Avatar */}
          <button className="w-8 h-8 rounded-[var(--radius-pill)] bg-brand-emerald flex items-center justify-center text-[#FFFFFF] text-sm font-medium">
            S
          </button>
        </div>
      </div>
    </header>
  );
}

