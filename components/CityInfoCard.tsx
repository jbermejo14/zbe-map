'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { CityData } from '@/lib/cities-repository';
import { getVerificationText, isCityVerified } from '@/lib/city-verification';
import { evaluateCitiesForBadge, getAccessStatusPresentation } from '@/lib/zbe-engine';
import type { DgtBadgeType } from '@/lib/zbe-engine';
import { zbeUiAccessTagClass, zbeUiBadgeSentenceLabel } from '@/lib/zbe-ui';
import { ArrowRight, ExternalLink, X } from 'lucide-react';

const CityMiniMap = dynamic(() => import('./CityMiniMap').then((mod) => mod.CityMiniMap), {
  ssr: false,
  loading: () => (
    <div className="h-[220px] w-full rounded-xl bg-elevated animate-pulse flex items-center justify-center text-xs text-muted">
      Cargando mapa de la ciudad...
    </div>
  ),
});

const CARD_MAP_HEIGHT = '220px';
const NO_PARKING_CONDITION_TEXT = 'Sin condición específica de aparcamiento.';
const NO_PERIMETER_NAME_TEXT = 'No disponible';

interface CityInfoCardProps {
  city: CityData;
  /** Etiqueta elegida en la home; null si todavía no hay. */
  badge: DgtBadgeType | null;
  onRemove: (slug: string) => void;
}

function CityInfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-2 text-xs">
      <dt className="sm:w-28 flex-shrink-0 font-semibold text-muted">{label}</dt>
      <dd className="min-w-0 text-secondary break-words">{children}</dd>
    </div>
  );
}

/** Tarjeta de una ciudad del selector múltiple: datos de su ZBE, acceso para la etiqueta y mapa. */
export function CityInfoCard({ city, badge, onRemove }: CityInfoCardProps) {
  const access = useMemo(
    () => (badge ? evaluateCitiesForBadge(badge, [city])[0] : null),
    [city, badge]
  );
  const mapCity = useMemo(
    () => ({
      lat: city.lat,
      lng: city.lng,
      name: city.name,
      cityName: city.name,
      polygon: city.polygon,
      status: access?.status ?? ('neutral' as const),
      officialUrl: isCityVerified(city) ? city.sourceUrl : null,
    }),
    [city, access]
  );
  const isActive = city.status === 'activa';

  return (
    <article className="card card-compact min-w-0 space-y-3">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-black text-fg break-words">{city.name}</h3>
          <p className="text-xs text-muted">{city.province} · {city.region}</p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(city.slug)}
          aria-label={`Quitar ${city.name} de la selección`}
          className="inline-flex items-center justify-center min-h-11 min-w-11 flex-shrink-0 rounded text-muted hover:text-fg hover:bg-elevated"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <span className={isActive ? 'tag tag-green' : 'tag tag-warning'}>
          {isActive ? 'ZBE activa' : 'En tramitación'}
        </span>
        {access && badge ? (
          <span className={zbeUiAccessTagClass(access.status)}>
            {zbeUiBadgeSentenceLabel(badge)}: {getAccessStatusPresentation(access.status).label}
          </span>
        ) : (
          <span className="tag">Elige tu vehículo para ver el acceso</span>
        )}
      </div>
      {access && <p className="text-xs text-secondary">{access.reason}</p>}

      <dl className="space-y-1.5">
        <CityInfoRow label="Horario">{city.schedule}</CityInfoRow>
        <CityInfoRow label="Multa">{city.fineAmount} €</CityInfoRow>
        <CityInfoRow label="Aparcamiento">{city.parkingCondition || NO_PARKING_CONDITION_TEXT}</CityInfoRow>
        <CityInfoRow label="Perímetro">{city.perimeterName || NO_PERIMETER_NAME_TEXT}</CityInfoRow>
        <CityInfoRow label="Fuente">
          <a
            href={city.sourceUrl}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent hover:text-accent-hover underline"
          >
            {city.sourceName}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
          <span className="block text-muted">{getVerificationText(city)}</span>
        </CityInfoRow>
      </dl>

      <CityMiniMap city={mapCity} height={CARD_MAP_HEIGHT} />

      <Link
        href={`/${city.slug}`}
        className="inline-flex items-center gap-1 min-h-11 text-xs font-semibold text-accent hover:text-accent-hover"
      >
        Ver ficha de {city.name}
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </Link>
    </article>
  );
}
