'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Leer preferencia guardada o clase actual en html
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);

    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }

    // Notificar a componentes como el mapa
    window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: nextTheme } }));
  };

  if (!mounted) {
    return (
      <div className="h-8 w-8 rounded-lg border border-neutral-700 bg-neutral-800/50" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="flex items-center gap-1.5 rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 px-2.5 py-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200 shadow-sm backdrop-blur hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500"
    >
      {theme === 'dark' ? (
        <>
          <Sun className="h-3.5 w-3.5 text-amber-400" />
          <span className="hidden md:inline text-[11px]">Modo claro</span>
        </>
      ) : (
        <>
          <Moon className="h-3.5 w-3.5 text-blue-600" />
          <span className="hidden md:inline text-[11px]">Modo oscuro</span>
        </>
      )}
    </button>
  );
}
