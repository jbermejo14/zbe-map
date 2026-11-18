import React from 'react';
import Link from 'next/link';
import { MapPin, Car, Shield } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-neutral-800 bg-white/95 dark:bg-black/90 backdrop-blur transition-colors">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-white font-black text-sm shadow-sm">
            ZBE
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-black tracking-tight text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-500 transition-colors">
              RADAR ZBE
            </span>
            <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-500 uppercase tracking-widest hidden sm:inline">
              ESPAÑA
            </span>
          </div>
        </Link>

        {/* Navigation links & Theme Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/madrid"
              className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-900 transition-colors"
            >
              <MapPin className="h-3 w-3 text-orange-500" />
              <span>Madrid</span>
            </Link>
            <Link
              href="/barcelona"
              className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-900 transition-colors"
            >
              <MapPin className="h-3 w-3 text-orange-500" />
              <span>Barcelona</span>
            </Link>
            <Link
              href="/etiqueta-dgt/gasolina/2018"
              className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-900 transition-colors"
            >
              <Car className="h-3 w-3 text-slate-400 dark:text-neutral-400" />
              <span>Etiquetas DGT</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 dark:bg-neutral-800 mx-1 hidden sm:block" />

            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-neutral-300 bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 px-2.5 py-0.5 rounded font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
              152 Ciudades ZBE
            </span>
          </nav>

          {/* Selector de Modo Oscuro / Modo Claro */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
