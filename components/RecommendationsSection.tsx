'use client';

import React, { useEffect, useState } from 'react';
import { DgtBadgeType } from '@/lib/zbe-engine';
import { DgtSticker } from '@/lib/dgt-svg-badges';
import { ArrowRight, ShoppingBag, Zap, Coins } from 'lucide-react';

interface RecommendationsSectionProps {
  vehicle: any | null;
  currentBadge: DgtBadgeType;
}

export function RecommendationsSection({ vehicle, currentBadge }: RecommendationsSectionProps) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const shouldShow = currentBadge === 'B' || currentBadge === 'SIN_ETIQUETA';

  useEffect(() => {
    if (!shouldShow) return;

    async function fetchRecommendations() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (vehicle?.id) params.set('vehicleId', vehicle.id);
        if (vehicle?.bodyType) params.set('bodyType', vehicle.bodyType);
        if (vehicle?.wheelbaseMm) params.set('wheelbaseMm', String(vehicle.wheelbaseMm));
        if (vehicle?.powerKw) params.set('powerKw', String(vehicle.powerKw));

        const res = await fetch(`/api/recommendations?${params.toString()}`);
        const data = await res.json();
        if (data.recommendations) {
          setRecommendations(data.recommendations);
        }
      } catch (err) {
        console.error('Error fetching recommendations:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [vehicle, currentBadge, shouldShow]);

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
            Coches equivalentes con Etiqueta ECO/CERO para circular sin restricciones
          </h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-xl">
            Tu vehículo actual ({vehicle?.brand || 'tu coche'} {vehicle?.model || ''}) sufre restricciones en múltiples ciudades.
            Hemos seleccionado 3 modelos equivalentes en habitabilidad (batalla ±100 mm) y potencia (±20% kW) con acceso ZBE libre.
          </p>
        </div>

        {/* Lead Gen Box */}
        <div className="flex-shrink-0 bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-center sm:text-left">
          <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider block">
            Tasación de tu coche actual
          </span>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Comprueba el valor de mercado antes de que se devalúe por las ZBE.
          </p>
          <a
            href="https://www.compramostucoche.es/?utm_source=radar_zbe"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center justify-center gap-1.5 w-full rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold py-1.5 px-3 transition-colors"
          >
            <Coins className="h-3 w-3" />
            Tasar online gratis
          </a>
        </div>
      </div>

      {/* Grid de Coches */}
      {loading ? (
        <div className="py-8 flex justify-center items-center">
          <div className="flex items-center gap-2 text-neutral-400 text-xs">
            <span className="h-4 w-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
            Buscando vehículos equivalentes en el registro DGT...
          </div>
        </div>
      ) : (
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
                    <DgtSticker badge={car.dgtBadge} size={54} className="flex-shrink-0" />
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
                      <strong className="text-green-400">100% Libre</strong>
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
                    rel="noopener noreferrer"
                    className="flex items-center justify-between w-full px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <ShoppingBag className="h-3 w-3 text-orange-500" />
                      <span>{car.affiliateDeals?.segundaMano?.priceEstimate}</span>
                    </span>
                    <span className="text-[10px] text-neutral-400">Ocasión</span>
                  </a>

                  <a
                    href={car.affiliateDeals?.renting?.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between w-full px-2.5 py-1.5 rounded border border-orange-500/40 bg-orange-950/20 text-orange-400 text-xs font-medium transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Zap className="h-3 w-3 text-orange-500" />
                      <span>Renting: {car.affiliateDeals?.renting?.cuotaEstimate}</span>
                    </span>
                    <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
