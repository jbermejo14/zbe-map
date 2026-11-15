import React from 'react';
import Link from 'next/link';
import { DgtBadgeType, getBadgeMetadata } from '@/lib/zbe-engine';
import { DgtSticker } from '@/lib/dgt-svg-badges';
import { ArrowUpRight } from 'lucide-react';

interface VehicleData {
  id?: string;
  brand: string;
  model: string;
  version: string;
  year: number;
  propulsionCode: string;
  euroNorm: string;
  dgtBadge: DgtBadgeType;
  electricRangeKm?: number | null;
  co2Emissions?: number | null;
  powerKw: number;
  powerCv: number;
  bodyType: string;
  wheelbaseMm: number;
  slug?: string;
}

interface VehicleBadgeCardProps {
  vehicle: VehicleData;
  explanation?: string;
}

export function VehicleBadgeCard({ vehicle, explanation }: VehicleBadgeCardProps) {
  const meta = getBadgeMetadata(vehicle.dgtBadge);

  const getBadgeTitle = () => {
    switch (vehicle.dgtBadge) {
      case 'CERO':
        return 'Distintivo 0 Emisiones';
      case 'ECO':
        return 'Distintivo ECO';
      case 'C':
        return 'Distintivo C (Verde)';
      case 'B':
        return 'Distintivo B (Amarillo)';
      case 'SIN_ETIQUETA':
        return 'Sin Distintivo (Categoría A)';
    }
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* Pegatina Oficial DGT */}
        <div className="flex flex-col items-center flex-shrink-0">
          <DgtSticker badge={vehicle.dgtBadge} size={110} />
          <span className="mt-1 text-[10px] uppercase font-bold text-neutral-400">
            DGT Oficial
          </span>
        </div>

        {/* Detalles del coche */}
        <div className="flex-1 w-full text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mb-1">
            <span className="rounded bg-neutral-900 border border-neutral-800 px-2 py-0.5 text-[11px] font-semibold text-neutral-300">
              {vehicle.year}
            </span>
            <span className="rounded bg-neutral-900 border border-neutral-800 px-2 py-0.5 text-[11px] text-neutral-300">
              {vehicle.bodyType}
            </span>
            <span className="text-[11px] font-bold text-orange-500 ml-1">
              {getBadgeTitle()}
            </span>
          </div>

          <h3 className="text-xl font-black text-white tracking-tight">
            {vehicle.brand} {vehicle.model}
          </h3>
          <p className="text-xs text-neutral-300 mb-2">
            {vehicle.version}
          </p>

          <p className="text-xs text-neutral-400 leading-relaxed mb-3">
            {explanation || meta.name}
          </p>

          {/* Especificaciones técnicas compactas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2.5 border-t border-neutral-800 text-left">
            <div className="rounded bg-neutral-900 p-2 border border-neutral-800/80">
              <span className="text-[10px] text-neutral-400 block font-medium">Norma</span>
              <strong className="text-xs text-white">{vehicle.euroNorm}</strong>
            </div>

            <div className="rounded bg-neutral-900 p-2 border border-neutral-800/80">
              <span className="text-[10px] text-neutral-400 block font-medium">Potencia</span>
              <strong className="text-xs text-white">{vehicle.powerCv} CV</strong>
            </div>

            <div className="rounded bg-neutral-900 p-2 border border-neutral-800/80">
              <span className="text-[10px] text-neutral-400 block font-medium">CO₂</span>
              <strong className="text-xs text-white">
                {vehicle.co2Emissions ? `${vehicle.co2Emissions} g/km` : '0 g/km'}
              </strong>
            </div>

            <div className="rounded bg-neutral-900 p-2 border border-neutral-800/80">
              <span className="text-[10px] text-neutral-400 block font-medium">Batalla</span>
              <strong className="text-xs text-white">{vehicle.wheelbaseMm} mm</strong>
            </div>
          </div>

          {/* Enlace SEO si procede */}
          {vehicle.slug && (
            <div className="mt-3 pt-2 flex items-center justify-between text-xs">
              <span className="text-neutral-400 text-[11px]">Ficha indexable DGT:</span>
              <Link
                href={`/etiqueta-dgt/${vehicle.brand.toLowerCase()}/${vehicle.model.toLowerCase().replace(/\s+/g, '-')}`}
                className="inline-flex items-center gap-1 text-orange-500 hover:text-orange-400 font-semibold text-xs"
              >
                <span>Ver ficha</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
