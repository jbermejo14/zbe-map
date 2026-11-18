import React from 'react';
import Link from 'next/link';
import { BrandLogo } from './BrandLogo';
import { ThemeSwitch } from './ThemeSwitch';
import { SECTION_NAME } from '@/lib/site';

const SECTION_LINKS = [
  { label: 'Mapa', href: '/' },
  { label: 'Etiqueta DGT', href: '/etiqueta-dgt/gasolina/2018' },
  { label: 'Ciudades', href: '/#ciudades' }
] as const;

/** Cabecera: logo, nombre de la sección, conmutador de tema y fila de navegación. */
export function Header() {
  return (
    <header className="site-header">
      <div className="header-container">
        <Link href="/" className="brand">
          <BrandLogo />
          <span className="brand-separator" aria-hidden="true" />
          <span className="brand-section">{SECTION_NAME}</span>
        </Link>

        <div className="header-actions">
          <ThemeSwitch />
        </div>
      </div>
      <nav aria-label="Secciones" className="header-nav">
        {SECTION_LINKS.map(link => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
