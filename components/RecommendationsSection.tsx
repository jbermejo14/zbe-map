'use client';

import React, { useMemo } from 'react';
import type { DgtBadgeType } from '@/lib/zbe-engine';
import { buildRecommendations } from '@/lib/client-logic';
import { DgtSticker } from '@/lib/dgt-svg-badges';
import { zbeUiBadgeChipClass, zbeUiBadgeSentenceLabel } from '@/lib/zbe-ui';
import { ArrowRight, ShoppingBag, Zap, Coins } from 'lucide-react';

interface RecommendationsSectionProps {
  vehicle: any | null;
  currentBadge: DgtBadgeType;
}

export function RecommendationsSection({ vehicle, currentBadge }: RecommendationsSectionProps) {
  const shouldShow = currentBadge === 'B' || currentBadge === 'SIN_ETIQUETA';

  const recommendations = useMemo(
    () =>
      shouldShow
        ? buildRecommendations({
            vehicleId: vehicle?.id,
            bodyType: vehicle?.bodyType,
            wheelbaseMm: vehicle?.wheelbaseMm,
            powerKw: vehicle?.powerKw,
          }).recommendations
        : [],
    [vehicle, shouldShow]
  );

  if (!shouldShow) return null;

  return (
    <section className="mt-8 rounded-xl border border-line bg-surface p-5 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-accent block mb-1">
            Alternativas de Renovación ZBE
          </span>
          <h3 className="text-lg sm:text-xl font-bold text-fg tracking-tight">
            Modelos equivalentes con Etiqueta ECO/CERO para circular sin restricciones
          </h3>
          <p className="text-xs text-muted mt-1 max-w-xl">
            {vehicle?.brand ? `${vehicle.brand} ${vehicle.model}` : 'Tu vehículo actual'} sufre restricciones en diversas ciudades con ZBE activa.
            A continuación se muestran opciones en habitabilidad y potencia con distintivo ambiental ECO o CERO.
          </p>
        </div>

        {/* External Tasación Box */}
        <div className="flex-shrink-0 bg-elevated border border-line rounded-lg p-3 text-center sm:text-left">
          <span className="text-[11px] font-bold text-accent uppercase tracking-wider block">
            Tasación de tu coche actual
          </span>
          <p className="text-[11px] text-muted mt-0.5">
            Comprueba el valor de mercado en plataformas externas de tasación.
          </p>
          <a
            href="https://www.compramostucoche.es/"
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="mt-2 inline-flex items-center justify-center gap-1.5 w-full rounded bg-btn hover:bg-btn-hover text-on-btn text-xs font-bold py-1.5 px-3 transition-colors"
          >
            <Coins className="h-3 w-3" />
            Tasación orientativa
          </a>
        </div>
      </div>

      {/* Grid de Coches */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
        {recommendations.map((car) => {
          return (
            <div
              key={car.id}
              className="flex flex-col justify-between rounded-lg border border-line bg-elevated/60 p-4 hover:border-line-hover transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`${zbeUiBadgeChipClass(car.dgtBadge as DgtBadgeType)} text-[10px] font-bold px-2 py-0.5 rounded`}>
                    {zbeUiBadgeSentenceLabel(car.dgtBadge as DgtBadgeType)}
                  </span>
                  <span className="text-[11px] text-muted">
                    {car.bodyType} &middot; {car.year}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <DgtSticker badge={car.dgtBadge as DgtBadgeType} size={54} className="flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-fg">
                      {car.brand} {car.model}
                    </h4>
                    <p className="text-xs text-secondary truncate">{car.version}</p>
                    <p className="text-[11px] text-muted mt-0.5">
                      {car.powerCv} CV ({car.powerKw} kW) &middot; {car.wheelbaseMm} mm
                    </p>
                  </div>
                </div>

                <div className="bg-surface p-2 rounded text-[11px] text-secondary space-y-0.5 mb-3">
                  <div className="flex justify-between">
                    <span className="text-muted">Acceso ZBE:</span>
                    <strong className="text-positive">Libre sin restricciones</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Emisiones CO₂:</span>
                    <span>{car.co2Emissions ? `${car.co2Emissions} g/km` : '0 g/km'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-line">
                <a
                  href={car.affiliateDeals?.segundaMano?.url || '#'}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="flex items-center justify-between w-full px-2.5 py-1.5 rounded bg-elevated hover:bg-line text-fg text-xs font-medium transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <ShoppingBag className="h-3 w-3 text-accent" />
                    <span>Ver ofertas de ocasión</span>
                  </span>
                  <span className="text-[10px] text-muted">Segunda mano</span>
                </a>

                <a
                  href={car.affiliateDeals?.renting?.url || '#'}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="flex items-center justify-between w-full px-2.5 py-1.5 rounded border border-accent-line bg-accent-soft text-accent text-xs font-medium transition-colors hover:border-accent"
                >
                  <span className="flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-accent" />
                    <span>Consultar cuotas de renting</span>
                  </span>
                  <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
