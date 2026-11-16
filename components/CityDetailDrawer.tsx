'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { CityEvaluationResult, DgtBadgeType, getAccessStatusPresentation } from '@/lib/zbe-engine';
import { PENDING_VERIFICATION_TEXT, isCityVerified } from '@/lib/city-verification';
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
      <div className="h-44 w-full rounded-xl bg-neutral-900 animate-pulse flex items-center justify-center text-xs text-neutral-500">
        Cargando mapa de la ciudad...
      </div>
    ),
  }
);

interface CityDetailDrawerProps {
  city: CityEvaluationResult | null;
  onClose: () => void;
  currentBadge: DgtBadgeType;
  vehicleName?: string;
}

export function CityDetailDrawer({
  city,
  onClose,
  currentBadge,
  vehicleName,
}: CityDetailDrawerProps) {
  if (!city) return null;

  const pres = getAccessStatusPresentation(city.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm transition-opacity">
      <div className="relative w-full max-w-lg bg-neutral-950 border-l border-neutral-800 h-full overflow-y-auto p-5 sm:p-6 shadow-2xl flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between pb-3.5 border-b border-neutral-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="rounded bg-neutral-900 border border-neutral-800 px-2 py-0.5 text-[11px] font-semibold text-neutral-300">
                  {city.province} · {city.region}
                </span>
                <span className="text-[11px] text-orange-500 font-bold uppercase tracking-wider">
                  ZBE en vigor
                </span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <MapPin className="h-4 w-4 text-orange-500" />
                {city.cityName}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Veredicto actual */}
          <div
            className={`mt-4 rounded-lg p-3.5 border ${
              city.status === 'allowed'
                ? 'bg-green-950/20 border-green-600/40'
                : city.status === 'restricted'
                ? 'bg-orange-950/20 border-orange-600/40'
                : 'bg-red-950/20 border-red-600/40'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              {city.status === 'allowed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              {city.status === 'restricted' && <AlertTriangle className="h-4 w-4 text-orange-500" />}
              {city.status === 'banned' && <XCircle className="h-4 w-4 text-red-500" />}
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  city.status === 'allowed'
                    ? 'text-green-400'
                    : city.status === 'restricted'
                    ? 'text-orange-400'
                    : 'text-red-400'
                }`}
              >
                {pres.label}
              </span>
            </div>

            <p className="text-xs font-medium text-neutral-200 leading-relaxed">
              {city.reason}
            </p>

            {vehicleName && (
              <p className="text-[11px] text-neutral-400 mt-2">
                Vehículo: <strong className="text-neutral-200">{vehicleName}</strong> (Etiqueta {currentBadge})
              </p>
            )}
          </div>

          {/* Sanción y Horarios */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded bg-neutral-900 border border-neutral-800 p-2.5">
              <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 uppercase tracking-wider">
                <AlertOctagon className="h-3 w-3" />
                Multa
              </span>
              <p className="text-base font-black text-white mt-0.5">{city.fineAmount} €</p>
              <p className="text-[10px] text-neutral-400">100 € por pronto pago</p>
            </div>

            <div className="rounded bg-neutral-900 border border-neutral-800 p-2.5">
              <span className="flex items-center gap-1 text-[10px] font-bold text-neutral-300 uppercase tracking-wider">
                <Clock className="h-3 w-3 text-orange-500" />
                Horario Activo
              </span>
              <p className="text-xs font-semibold text-neutral-200 mt-1 line-clamp-2">
                {city.schedule}
              </p>
            </div>
          </div>

          {!isCityVerified(city) && (
            <p className="mt-2 text-[11px] text-amber-400">{PENDING_VERIFICATION_TEXT}</p>
          )}

          {/* Mapa Compacto de la Ciudad en la Vista Detalle */}
          <div className="mt-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                {city.polygon ? `Mapa ZBE ${city.cityName}` : `Ubicación ZBE ${city.cityName}`}
              </span>
              <span className="text-[10px] text-orange-400 font-semibold truncate max-w-[200px]">
                {city.perimeterName || 'Área Regulada'}
              </span>
            </div>
            <CityMiniMap city={city} height="195px" />
          </div>

          {/* Vías y Calles que delimitan el perímetro ZBE */}
          <div className="mt-4 rounded-lg bg-neutral-900/90 border border-neutral-800 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-orange-400 uppercase tracking-wider">
                <Milestone className="h-3.5 w-3.5" />
                Calles Perimetrales con Cámaras OCR
              </span>
              <span className="text-[10px] text-neutral-400">~{city.areaKm2 || 2.5} km²</span>
            </div>
            <p className="text-xs font-bold text-white mb-2">
              {city.perimeterName || `Zona ZBE ${city.cityName}`}
            </p>

            {city.streets && city.streets.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {city.streets.map((street, idx) => (
                  <span
                    key={idx}
                    className="inline-block text-[11px] bg-black border border-neutral-800 text-neutral-300 px-2 py-0.5 rounded"
                  >
                    {street}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400">
                Límites trazados según ordenanza municipal sobre el mapa.
              </p>
            )}
          </div>

          {/* Condición de Parking si existe */}
          {city.parkingCondition && (
            <div className="mt-3 rounded bg-orange-950/20 border border-orange-500/30 p-2.5 flex items-start gap-2">
              <ParkingCircle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-orange-300">
                  Condición de Estacionamiento
                </span>
                <p className="text-xs text-orange-200/90 mt-0.5 leading-relaxed">
                  {city.parkingCondition}
                </p>
              </div>
            </div>
          )}

          {/* Resumen */}
          <div className="mt-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Resumen Normativo Municipal
            </h4>
            <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-900/50 p-2.5 rounded border border-neutral-800">
              {city.summary}
            </p>
          </div>

          {/* Excepciones tasadas */}
          {city.exemptions && city.exemptions.length > 0 && (
            <div className="mt-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-neutral-300" />
                Excepciones Legales Oficiales
              </h4>
              <ul className="space-y-1">
                {city.exemptions.map((ex, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-neutral-300 bg-neutral-900/40 px-2.5 py-1.5 rounded border border-neutral-800/60"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-1 flex-shrink-0" />
                    <span>{ex}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-4 border-t border-neutral-800">
          <Link
            href={`/zbe/${city.slug}`}
            className="w-full flex items-center justify-center gap-2 rounded bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs py-2.5 px-4 transition-colors"
          >
            <span>Ver Ficha Completa ZBE {city.cityName}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
