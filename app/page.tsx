import type { Metadata } from 'next';
import { SplitDashboard } from '@/components/SplitDashboard';
import { getAllCities, evaluateAllCities } from '@/lib/cities-repository';
import { DgtBadgeType } from '@/lib/zbe-engine';

export const revalidate = 3600;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://radar-zbe.es';

export const metadata: Metadata = {
  title: 'Radar ZBE España 2025: Mapa y Restricciones de Bajas Emisiones',
  description:
    'Comprueba si tu vehículo puede circular o aparcar en las 152 Zonas de Bajas Emisiones (ZBE) de España según su distintivo DGT. Perímetros, horarios y multas verificadas.',
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: 'Radar ZBE España 2025: Mapa y Restricciones de Bajas Emisiones',
    description:
      'Comprueba si tu vehículo puede circular o aparcar en las 152 Zonas de Bajas Emisiones (ZBE) de España según su distintivo DGT.',
    url: siteUrl,
    siteName: 'Radar ZBE España',
    type: 'website',
  },
};

export default function HomePage() {
  const fallbackBadge: DgtBadgeType = 'B';
  const initialEvaluatedCities = evaluateAllCities(fallbackBadge);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Radar ZBE España',
    url: siteUrl,
    applicationCategory: 'TravelApplication',
    operatingSystem: 'All',
    description:
      'Buscador visual y mapa interactivo con perímetros de Zonas de Bajas Emisiones en España. Consulta las restricciones para tu vehículo según su distintivo DGT.',
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Headline */}
      <div className="text-center max-w-2xl mx-auto mb-6">
        <div className="inline-flex items-center gap-1.5 rounded bg-orange-950/30 border border-orange-500/40 px-2.5 py-0.5 text-xs font-semibold text-orange-400 mb-2.5">
          <span>Perímetros ZBE actualizados a 2025</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
          ¿Dónde puede circular tu coche?{' '}
          <span className="text-orange-500">
            Zonas ZBE España
          </span>
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-xl mx-auto">
          Selecciona tu coche o etiqueta DGT y visualiza en el mapa el perímetro
          de cada Zona de Bajas Emisiones (ZBE), con horarios, condiciones de parking y multas.
        </p>
      </div>

      {/* Split Dashboard */}
      <SplitDashboard
        initialVehicle={null}
        initialBadge={fallbackBadge}
        initialCities={initialEvaluatedCities}
      />
    </div>
  );
}
