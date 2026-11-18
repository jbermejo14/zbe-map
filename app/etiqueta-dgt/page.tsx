import type { Metadata } from 'next';
import Link from 'next/link';
import { AdSlot } from '@/components/AdSlot';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { EtiquetaCalculator } from '@/components/EtiquetaCalculator';
import { DGT_LEGAL_SOURCE } from '@/lib/dgt-rules';
import { DgtSticker } from '@/lib/dgt-svg-badges';
import { ETIQUETA_CRITERIA } from '@/lib/etiqueta-criteria';
import { ETIQUETA_YEARS } from '@/lib/etiqueta-routes';
import { SEO_CURRENT_YEAR } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site';
import { FUEL_CHOICES } from '@/lib/vehicle-selection';

const ETIQUETA_ROUTE = '/etiqueta-dgt';
const ETIQUETA_TITLE = `Etiqueta ambiental de la DGT ${SEO_CURRENT_YEAR}: qué etiqueta tiene tu coche`;
const ETIQUETA_DESCRIPTION =
  'Consulta las cinco etiquetas ambientales de la DGT (0, ECO, C, B y sin etiqueta), sus criterios por combustible y año, y calcula la de tu coche en un momento.';
const CRITERIA_STICKER_SIZE = 72;

export const metadata: Metadata = {
  title: ETIQUETA_TITLE,
  description: ETIQUETA_DESCRIPTION,
  alternates: { canonical: absoluteUrl(ETIQUETA_ROUTE) },
  openGraph: {
    title: ETIQUETA_TITLE,
    description: ETIQUETA_DESCRIPTION,
    url: absoluteUrl(ETIQUETA_ROUTE),
    type: 'website',
  },
};

function EtiquetaCriteriaList() {
  return (
    <section aria-labelledby="etiqueta-criteria-title" className="mt-10">
      <h2 id="etiqueta-criteria-title" className="text-lg font-bold text-fg mb-3">
        Las cinco etiquetas y sus criterios
      </h2>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ETIQUETA_CRITERIA.map((criteria) => (
          <li key={criteria.badge} className="card card-compact flex items-start gap-4">
            <DgtSticker badge={criteria.badge} size={CRITERIA_STICKER_SIZE} className="flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="text-base font-bold text-fg">{criteria.title}</h3>
              <ul className="mt-1 list-disc pl-4 space-y-1 text-xs text-secondary">
                {criteria.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        Fuente:{' '}
        <a
          href={DGT_LEGAL_SOURCE.url}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="text-accent hover:text-accent-hover underline font-medium"
        >
          {DGT_LEGAL_SOURCE.name}
        </a>
        . Para confirmar la etiqueta de tu vehículo, consúltala en la{' '}
        <a
          href={DGT_LEGAL_SOURCE.dgtPortalUrl}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="text-accent hover:text-accent-hover underline font-medium"
        >
          Sede electrónica de la DGT
        </a>
        .
      </p>
    </section>
  );
}

function EtiquetaFichaGrid() {
  return (
    <section aria-labelledby="etiqueta-fichas-title" className="mt-10">
      <h2 id="etiqueta-fichas-title" className="text-lg font-bold text-fg mb-3">
        Fichas por combustible y año
      </h2>
      <div className="space-y-5">
        {FUEL_CHOICES.map((fuel) => (
          <div key={fuel.id}>
            <h3 className="text-sm font-bold text-secondary mb-2">{fuel.label}</h3>
            <ul className="flex flex-wrap gap-1.5">
              {ETIQUETA_YEARS.map((year) => (
                <li key={year}>
                  <Link
                    href={`/etiqueta-dgt/${fuel.id}/${year}`}
                    aria-label={`Etiqueta DGT ${fuel.label} ${year}`}
                    className="inline-flex items-center min-h-11 px-3 rounded bg-surface border border-line hover:border-accent text-xs text-secondary hover:text-fg"
                  >
                    {year}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function EtiquetaDgtPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs
        items={[
          { name: 'Inicio', url: '/' },
          { name: 'Etiqueta DGT', url: ETIQUETA_ROUTE },
        ]}
      />
      <h1 className="text-2xl sm:text-3xl font-black text-fg tracking-tight">
        Etiqueta ambiental de la DGT: qué etiqueta tiene tu coche
      </h1>
      <p className="mt-2 mb-6 text-sm text-secondary max-w-2xl">
        Elige el combustible y el año de matriculación de tu coche y te decimos qué distintivo le corresponde.
      </p>
      <EtiquetaCalculator />
      <AdSlot />
      <EtiquetaCriteriaList />
      <EtiquetaFichaGrid />
      <AdSlot />
    </div>
  );
}
