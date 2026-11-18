import type { Metadata } from 'next';
import { AdSlot } from '@/components/AdSlot';
import { SplitDashboard } from '@/components/SplitDashboard';
import { absoluteUrl, SECTION_NAME, SITE_NAME } from '@/lib/site';
import { SEO_CURRENT_YEAR } from '@/lib/seo';

const homeUrl = absoluteUrl('/');

export const metadata: Metadata = {
  title: `Zonas de bajas emisiones (ZBE) ${SEO_CURRENT_YEAR}: mapa y restricciones por etiqueta DGT`,
  description:
    'Comprueba si tu vehículo puede circular o aparcar en las 152 Zonas de Bajas Emisiones (ZBE) de España según su distintivo DGT. Perímetros oficiales cuando están disponibles; el resto de datos, orientativos hasta su verificación.',
  alternates: {
    canonical: homeUrl,
  },
  openGraph: {
    title: `Zonas de bajas emisiones (ZBE) ${SEO_CURRENT_YEAR}: mapa y restricciones por etiqueta DGT`,
    description:
      'Comprueba si tu vehículo puede circular o aparcar en las 152 Zonas de Bajas Emisiones (ZBE) de España según su distintivo DGT.',
    url: homeUrl,
    siteName: SITE_NAME,
    type: 'website',
  },
};

export default function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: `${SITE_NAME} · ${SECTION_NAME}`,
    url: homeUrl,
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
        <div className="tag tag-accent mb-3">
          <span>Perímetros ZBE actualizados a {SEO_CURRENT_YEAR}</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-fg tracking-tight">
          ¿Dónde puede circular tu coche?{' '}
          <span className="text-accent">
            Zonas ZBE España
          </span>
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-secondary leading-relaxed max-w-xl mx-auto">
          Elige la marca, el combustible y el año de tu coche y visualiza en el mapa el perímetro
          de cada Zona de Bajas Emisiones (ZBE), con horarios, condiciones de parking y multas.
        </p>
      </div>

      {/* Split Dashboard */}
      <SplitDashboard />

      <AdSlot />
    </div>
  );
}
