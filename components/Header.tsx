import React from 'react';
import Link from 'next/link';
import { MapPin, Car, Shield } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-black/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-black font-black text-sm">
            ZBE
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-black tracking-tight text-white group-hover:text-orange-500 transition-colors">
              RADAR ZBE
            </span>
            <span className="text-[11px] font-semibold text-orange-500 uppercase tracking-widest hidden sm:inline">
              ESPAÑA
            </span>
          </div>
        </Link>

        {/* Navigation links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/zbe/madrid"
            className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <MapPin className="h-3 w-3 text-orange-500" />
            <span>Madrid</span>
          </Link>
          <Link
            href="/zbe/barcelona"
            className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <MapPin className="h-3 w-3 text-orange-500" />
            <span>Barcelona</span>
          </Link>
          <Link
            href="/etiqueta-dgt/toyota/corolla"
            className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <Car className="h-3 w-3 text-neutral-400" />
            <span>Etiquetas DGT</span>
          </Link>

          <div className="h-4 w-px bg-neutral-800 mx-1 hidden sm:block" />

          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-neutral-300 bg-neutral-900 border border-neutral-800 px-2.5 py-0.5 rounded">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            39 Ciudades con Líneas ZBE
          </span>
        </nav>
      </div>
    </header>
  );
}
