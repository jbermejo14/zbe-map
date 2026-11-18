import React from 'react';
import Link from 'next/link';
import { DgtBadgeType, getBadgeMetadata } from '@/lib/zbe-engine';
import { DgtSticker } from '@/lib/dgt-svg-badges';
import { etiquetaRouteFor } from '@/lib/etiqueta-routes';
import { zbeUiBadgeChipClass } from '@/lib/zbe-ui';
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
}

interface VehicleBadgeCardProps {
  vehicle: VehicleData;
  explanation?: string;
}

export function VehicleBadgeCard({ vehicle, explanation }: VehicleBadgeCardProps) {
  const meta = getBadgeMetadata(vehicle.dgtBadge);
  const etiquetaHref = etiquetaRouteFor(vehicle.propulsionCode, vehicle.year);

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
    <div className="rounded-xl border border-line bg-surface p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* Pegatina Oficial DGT */}
        <div className="flex flex-col items-center flex-shrink-0">
          <DgtSticker badge={vehicle.dgtBadge} size={110} />
          <span className="mt-1 text-[10px] uppercase font-bold text-muted">
            Distintivo DGT
          </span>
        </div>

        {/* Detalles del coche */}
        <div className="flex-1 w-full text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mb-1">
            <span className="rounded bg-elevated border border-line px-2 py-0.5 text-[11px] font-semibold text-secondary">
              {vehicle.year}
            </span>
            <span className="rounded bg-elevated border border-line px-2 py-0.5 text-[11px] text-secondary">
              {vehicle.bodyType}
            </span>
            <span className={`${zbeUiBadgeChipClass(vehicle.dgtBadge)} text-[11px] font-bold px-2 py-0.5 rounded`}>
              {getBadgeTitle()}
            </span>
          </div>

          <h3 className="text-xl font-black text-fg tracking-tight">
            {vehicle.brand} {vehicle.model}
          </h3>
          <p className="text-xs text-secondary mb-2">
            {vehicle.version}
          </p>

          <p className="text-xs text-muted leading-relaxed mb-3">
            {explanation || meta.name}
          </p>

          {/* Especificaciones técnicas compactas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2.5 border-t border-line text-left">
            <div className="rounded bg-elevated p-2 border border-line">
              <span className="text-[10px] text-muted block font-medium">Norma</span>
              <strong className="text-xs text-fg">{vehicle.euroNorm}</strong>
            </div>

            <div className="rounded bg-elevated p-2 border border-line">
              <span className="text-[10px] text-muted block font-medium">Potencia</span>
              <strong className="text-xs text-fg">{vehicle.powerCv} CV</strong>
            </div>

            <div className="rounded bg-elevated p-2 border border-line">
              <span className="text-[10px] text-muted block font-medium">CO₂</span>
              <strong className="text-xs text-fg">
                {vehicle.co2Emissions ? `${vehicle.co2Emissions} g/km` : '0 g/km'}
              </strong>
            </div>

            <div className="rounded bg-elevated p-2 border border-line">
              <span className="text-[10px] text-muted block font-medium">Batalla</span>
              <strong className="text-xs text-fg">{vehicle.wheelbaseMm} mm</strong>
            </div>
          </div>

          {/* Enlace a la página de etiqueta DGT, solo si existe esa ruta */}
          {etiquetaHref && (
            <div className="mt-3 pt-2 flex items-center justify-between text-xs">
              <span className="text-muted text-[11px]">Etiqueta DGT de su combustible y año:</span>
              <Link
                href={etiquetaHref}
                className="inline-flex items-center gap-1 text-accent hover:text-accent-hover font-semibold text-xs"
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
