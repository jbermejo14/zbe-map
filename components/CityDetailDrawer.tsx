'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  CityEvaluationResult,
  DgtBadgeType,
  ZbeAccessStatus,
  getAccessStatusPresentation,
} from '@/lib/zbe-engine';
import { zbeUiAccessTextClass } from '@/lib/zbe-ui';
import { PENDING_VERIFICATION_TEXT, isCityVerified } from '@/lib/city-verification';
import { canonicalRegion } from '@/lib/regions';
import {
  X,
  MapPin,
  Clock,
  AlertOctagon,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ParkingCircle,
  ArrowRight,
  Layers,
  Milestone,
} from 'lucide-react';

const CityMiniMap = dynamic(
  () => import('./CityMiniMap').then((mod) => mod.CityMiniMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-44 w-full rounded-xl bg-elevated animate-pulse flex items-center justify-center text-xs text-muted">
        Cargando mapa de la ciudad...
      </div>
    ),
  }
);

/** Colores del panel de veredicto según el estado de acceso. */
const ACCESS_PANEL_CLASS: Record<ZbeAccessStatus, string> = {
  allowed: 'bg-positive-soft border-positive-line',
  restricted: 'bg-warning-soft border-warning-line',
  banned: 'bg-negative-soft border-negative-line',
};

interface CityDetailDrawerProps {
  city: CityEvaluationResult | null;
  onClose: () => void;
  /** Etiqueta elegida; null si aún no hay, y entonces no se muestra veredicto. */
  currentBadge: DgtBadgeType | null;
  vehicleName?: string;
}

export function CityDetailDrawer({
  city,
  onClose,
  currentBadge,
  vehicleName,
}: CityDetailDrawerProps) {
  const miniMapCity = useMemo(
    () => (city ? { ...city, status: currentBadge ? city.status : ('neutral' as const) } : null),
    [city, currentBadge]
  );

  if (!city || !miniMapCity) return null;

  const pres = getAccessStatusPresentation(city.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-overlay backdrop-blur-sm transition-opacity">
      <div className="relative w-full max-w-lg bg-surface border-l border-line h-full overflow-y-auto p-5 sm:p-6 shadow-2xl flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between pb-3.5 border-b border-line">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="rounded bg-elevated border border-line px-2 py-0.5 text-[11px] font-semibold text-secondary">
                  {city.province} · {canonicalRegion(city.region)}
                </span>
                <span className="text-[11px] text-accent font-bold uppercase tracking-wider">
                  ZBE en vigor
                </span>
              </div>
              <h2 className="text-xl font-black text-fg tracking-tight flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" />
                {city.cityName}
              </h2>
            </div>
            <button
              type="button"
              aria-label="Cerrar detalle de la ciudad"
              onClick={onClose}
              className="inline-flex items-center justify-center min-h-11 min-w-11 rounded text-muted hover:text-fg hover:bg-elevated transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Veredicto actual: solo con etiqueta elegida */}
          {currentBadge && (
          <div className={`mt-4 rounded-lg p-3.5 border ${ACCESS_PANEL_CLASS[city.status]}`}>
            <div className="flex items-center gap-2 mb-1.5">
              {city.status === 'allowed' && <CheckCircle2 className="h-4 w-4 text-positive" />}
              {city.status === 'restricted' && <AlertTriangle className="h-4 w-4 text-warning" />}
              {city.status === 'banned' && <XCircle className="h-4 w-4 text-negative" />}
              <span className={`text-xs font-bold uppercase tracking-wider ${zbeUiAccessTextClass(city.status)}`}>
                {pres.label}
              </span>
            </div>

            <p className="text-xs font-medium text-secondary leading-relaxed">
              {city.reason}
            </p>

            {vehicleName && (
              <p className="text-[11px] text-muted mt-2">
                Vehículo: <strong className="text-secondary">{vehicleName}</strong> (Etiqueta {currentBadge})
              </p>
            )}
          </div>
          )}

          {/* Sanción y Horarios */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded bg-elevated border border-line p-2.5">
              <span className="flex items-center gap-1 text-[10px] font-bold text-negative uppercase tracking-wider">
                <AlertOctagon className="h-3 w-3" />
                Multa
              </span>
              <p className="text-base font-black text-fg mt-0.5">{city.fineAmount} €</p>
              <p className="text-[10px] text-muted">100 € por pronto pago</p>
            </div>

            <div className="rounded bg-elevated border border-line p-2.5">
              <span className="flex items-center gap-1 text-[10px] font-bold text-secondary uppercase tracking-wider">
                <Clock className="h-3 w-3 text-accent" />
                Horario Activo
              </span>
              <p className="text-xs font-semibold text-secondary mt-1 line-clamp-2">
                {city.schedule}
              </p>
            </div>
          </div>

          {!isCityVerified(city) && (
            <p className="mt-2 text-[11px] text-warning">{PENDING_VERIFICATION_TEXT}</p>
          )}

          {/* Mapa Compacto de la Ciudad en la Vista Detalle */}
          <div className="mt-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                {city.polygon ? `Mapa ZBE ${city.cityName}` : `Ubicación ZBE ${city.cityName}`}
              </span>
              <span className="text-[10px] text-accent font-semibold truncate max-w-[200px]">
                {city.perimeterName || 'Área Regulada'}
              </span>
            </div>
            <CityMiniMap city={miniMapCity} height="195px" />
          </div>

          {/* Vías y Calles que delimitan el perímetro ZBE */}
          <div className="mt-4 rounded-lg bg-elevated/90 border border-line p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-accent uppercase tracking-wider">
                <Milestone className="h-3.5 w-3.5" />
                Calles Perimetrales con Cámaras OCR
              </span>
              <span className="text-[10px] text-muted">~{city.areaKm2 || 2.5} km²</span>
            </div>
            <p className="text-xs font-bold text-fg mb-2">
              {city.perimeterName || `Zona ZBE ${city.cityName}`}
            </p>

            {city.streets && city.streets.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {city.streets.map((street, idx) => (
                  <span
                    key={idx}
                    className="inline-block text-[11px] bg-surface border border-line text-secondary px-2 py-0.5 rounded"
                  >
                    {street}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">
                Límites trazados según ordenanza municipal sobre el mapa.
              </p>
            )}
          </div>

          {/* Condición de Parking si existe */}
          {city.parkingCondition && (
            <div className="mt-3 rounded bg-warning-soft border border-warning-line p-2.5 flex items-start gap-2">
              <ParkingCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-warning">
                  Condición de Estacionamiento
                </span>
                <p className="text-xs text-warning mt-0.5 leading-relaxed">
                  {city.parkingCondition}
                </p>
              </div>
            </div>
          )}

          {/* Resumen */}
          <div className="mt-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
              Resumen Normativo Municipal
            </h4>
            <p className="text-xs text-secondary leading-relaxed bg-elevated/50 p-2.5 rounded border border-line">
              {city.summary}
            </p>
          </div>

          {/* Excepciones tasadas */}
          {city.exemptions && city.exemptions.length > 0 && (
            <div className="mt-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-secondary" />
                Excepciones Legales Oficiales
              </h4>
              <ul className="space-y-1">
                {city.exemptions.map((ex, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-secondary bg-elevated/40 px-2.5 py-1.5 rounded border border-line"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-accent mt-1 flex-shrink-0" />
                    <span>{ex}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-4 border-t border-line">
          <Link
            href={`/${city.slug}`}
            className="w-full flex items-center justify-center gap-2 rounded bg-btn hover:bg-btn-hover text-on-btn font-bold text-xs py-2.5 px-4 transition-colors"
          >
            <span>Ver Ficha Completa ZBE {city.cityName}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
