'use client';

import React, { useMemo } from 'react';
import type { DgtBadgeType } from '@/lib/zbe-engine';
import { buildRecommendations } from '@/lib/client-logic';
import { DgtSticker } from '@/lib/dgt-svg-badges';
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
    <section className="mt-8 rounded-xl border border-neutral-800 bg-neutral-950 p-5 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-orange-500 block mb-1">
            Alternativas de Renovación ZBE
          </span>
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Modelos equivalentes con Etiqueta ECO/CERO para circular sin restricciones
          </h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-xl">
            {vehicle?.brand ? `${vehicle.brand} ${vehicle.model}` : 'Tu vehículo actual'} sufre restricciones en diversas ciudades con ZBE activa.
            A continuación se muestran opciones en habitabilidad y potencia con distintivo ambiental ECO o CERO.
          </p>
        </div>

        {/* External Tasación Box */}
        <div className="flex-shrink-0 bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-center sm:text-left">
          <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider block">
            Tasación de tu coche actual
          </span>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Comprueba el valor de mercado en plataformas externas de tasación.
          </p>
          <a
            href="https://www.compramostucoche.es/"
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="mt-2 inline-flex items-center justify-center gap-1.5 w-full rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold py-1.5 px-3 transition-colors"
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
              className="flex flex-col justify-between rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 hover:border-neutral-700 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-neutral-700 bg-neutral-800 text-neutral-200">
                    {car.dgtBadge === 'CERO' ? '0 CERO' : 'Etiqueta ECO'}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {car.bodyType} &middot; {car.year}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <DgtSticker badge={car.dgtBadge as DgtBadgeType} size={54} className="flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {car.brand} {car.model}
                    </h4>
                    <p className="text-xs text-neutral-300 truncate">{car.version}</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {car.powerCv} CV ({car.powerKw} kW) &middot; {car.wheelbaseMm} mm
                    </p>
                  </div>
                </div>

                <div className="bg-neutral-950 p-2 rounded text-[11px] text-neutral-300 space-y-0.5 mb-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Acceso ZBE:</span>
                    <strong className="text-green-400">Libre sin restricciones</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Emisiones CO₂:</span>
                    <span>{car.co2Emissions ? `${car.co2Emissions} g/km` : '0 g/km'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-neutral-800">
                <a
                  href={car.affiliateDeals?.segundaMano?.url || '#'}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="flex items-center justify-between w-full px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <ShoppingBag className="h-3 w-3 text-orange-500" />
                    <span>Ver ofertas de ocasión</span>
                  </span>
                  <span className="text-[10px] text-neutral-400">Segunda mano</span>
                </a>

                <a
                  href={car.affiliateDeals?.renting?.url || '#'}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="flex items-center justify-between w-full px-2.5 py-1.5 rounded border border-orange-500/40 bg-orange-950/20 text-orange-400 text-xs font-medium transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-orange-500" />
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
