'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  DgtBadgeType,
  CityEvaluationResult,
  ZbeAccessStatus,
} from '@/lib/zbe-engine';
import { searchVehicles } from '@/lib/vehicles-repository';
import { zbeUiBadgeChipClass, zbeUiBadgeSentenceLabel } from '@/lib/zbe-ui';
import { VehicleSelector } from './VehicleSelector';
import { VehicleBadgeCard } from './VehicleBadgeCard';
import { CityDetailDrawer } from './CityDetailDrawer';
import { RecommendationsSection } from './RecommendationsSection';
import { Check, AlertTriangle, X, Shield, MapPin } from 'lucide-react';

const SpainZbeMap = dynamic(
  () => import('./SpainZbeMap').then((mod) => mod.SpainZbeMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[580px] w-full items-center justify-center rounded-xl border border-line bg-surface">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <span>Cargando mapa de España y líneas ZBE...</span>
        </div>
      </div>
    ),
  }
);

/** Vehículo que se selecciona al abrir la página. */
const DEFAULT_VEHICLE_QUERY = 'A4';

/** Primer vehículo de la búsqueda de ejemplo; la búsqueda mira marca, modelo y versión por separado. */
function splitDashboardDefaultVehicle() {
  return searchVehicles(DEFAULT_VEHICLE_QUERY)[0] ?? null;
}

interface SplitDashboardProps {
  initialVehicle?: any;
  initialBadge?: DgtBadgeType;
}

export function SplitDashboard({
  initialVehicle = null,
  initialBadge = 'B',
}: SplitDashboardProps) {
  // El vehículo inicial se fija en el primer render para que el HTML exportado ya traiga su resultado.
  const [startVehicle] = useState<any>(() => initialVehicle ?? splitDashboardDefaultVehicle());
  const [currentBadge, setCurrentBadge] = useState<DgtBadgeType>(
    () => (startVehicle?.dgtBadge as DgtBadgeType | undefined) ?? initialBadge
  );
  const [selectedVehicle, setSelectedVehicle] = useState<any>(startVehicle);
  const [cities, setCities] = useState<CityEvaluationResult[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [citiesError, setCitiesError] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityEvaluationResult | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | ZbeAccessStatus>('all');

  // Evaluar las ciudades cuando cambia el distintivo. Los datos (con polígonos, ~400 KB)
  // se importan de forma dinámica para que no entren en el JS inicial de la página.
  useEffect(() => {
    let isCurrent = true;
    setLoadingCities(true);
    setCitiesError(null);

    import('@/lib/cities-repository')
      .then(({ evaluateAllCities }) => {
        if (isCurrent) setCities(evaluateAllCities(currentBadge));
      })
      .catch((err: unknown) => {
        console.error('Error cargando las ciudades ZBE:', err);
        if (isCurrent) {
          setCitiesError(
            'No se pudieron cargar los datos de las ciudades ZBE. Recarga la página; si persiste, vuelve a intentarlo más tarde.'
          );
        }
      })
      .finally(() => {
        if (isCurrent) setLoadingCities(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [currentBadge]);

  // Contadores
  const allowedCount = cities.filter((c) => c.status === 'allowed').length;
  const restrictedCount = cities.filter((c) => c.status === 'restricted').length;
  const bannedCount = cities.filter((c) => c.status === 'banned').length;

  const vehicleDisplayName = selectedVehicle
    ? `${selectedVehicle.brand} ${selectedVehicle.model}`
    : `Vehículo Etiqueta ${currentBadge}`;

  return (
    <div className="w-full">
      {/* Barra de resumen superior */}
      <div className="mb-6 rounded-xl border border-line bg-surface p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-accent" />
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                Veredicto Nacional ZBE
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-fg">
              {vehicleDisplayName} &middot;{' '}
              <span className={`${zbeUiBadgeChipClass(currentBadge)} font-black px-2 py-0.5 rounded`}>
                {zbeUiBadgeSentenceLabel(currentBadge)}
              </span>
            </h2>
          </div>

          {/* Estadísticas de ciudades */}
          <div className="grid grid-cols-3 gap-2 flex-shrink-0">
            {/* Permitidas */}
            <div className="flex flex-col items-center justify-center px-4 py-2 rounded bg-elevated border border-line text-center">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-positive">
                <Check className="h-3 w-3" />
                Libre
              </span>
              <span className="text-xl font-black text-fg">{loadingCities ? '…' : allowedCount}</span>
            </div>

            {/* Restringidas */}
            <div className="flex flex-col items-center justify-center px-4 py-2 rounded bg-elevated border border-line text-center">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-warning">
                <AlertTriangle className="h-3 w-3" />
                Parking
              </span>
              <span className="text-xl font-black text-fg">{loadingCities ? '…' : restrictedCount}</span>
            </div>

            {/* Prohibidas */}
            <div className="flex flex-col items-center justify-center px-4 py-2 rounded bg-elevated border border-line text-center">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-negative">
                <X className="h-3 w-3" />
                Vetado
              </span>
              <span className="text-xl font-black text-fg">{loadingCities ? '…' : bannedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {citiesError && (
        <div role="alert" className="mb-6 rounded-xl border border-negative-line bg-negative-soft p-4 text-xs text-negative">
          {citiesError}
        </div>
      )}

      {/* Split View Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* PANEL IZQUIERDO: Selector de Vehículo & Ficha DGT */}
        <div className="lg:col-span-5 min-w-0 space-y-6">
          <div id="buscador" className="anchor-target card card-compact">
            <h3 className="text-sm font-bold text-fg uppercase tracking-wider mb-3">
              Selector de Vehículo DGT
            </h3>

            <VehicleSelector
              currentBadge={currentBadge}
              onBadgeSelect={(badge) => {
                setCurrentBadge(badge);
              }}
              onVehicleSelect={(veh) => {
                setSelectedVehicle(veh);
              }}
              selectedVehicle={selectedVehicle}
            />
          </div>

          {/* Ficha Técnica */}
          {selectedVehicle ? (
            <VehicleBadgeCard vehicle={selectedVehicle} />
          ) : (
            <VehicleBadgeCard
              vehicle={{
                brand: 'Simulación',
                model: `Etiqueta ${currentBadge}`,
                version: 'Perfil de homologación DGT',
                year: 2024,
                propulsionCode: currentBadge === 'CERO' ? 'BEV' : currentBadge === 'ECO' ? 'HEV' : 'GASOLINA',
                euroNorm: currentBadge === 'CERO' ? 'Cero Emisiones' : currentBadge === 'B' ? 'Euro 4' : 'Euro 6',
                dgtBadge: currentBadge,
                powerKw: 100,
                powerCv: 136,
                bodyType: 'Turismo',
                wheelbaseMm: 2650,
              }}
            />
          )}
        </div>

        {/* PANEL DERECHO: Mapa de España con Líneas ZBE */}
        <div id="ciudades" className="anchor-target lg:col-span-7 flex flex-col h-full min-h-[580px] min-w-0">
          <SpainZbeMap
            cities={cities}
            selectedCity={selectedCity}
            onCitySelect={(city) => setSelectedCity(city)}
            statusFilter={statusFilter}
            onFilterChange={(f) => setStatusFilter(f)}
          />

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-muted px-1">
            <span>Haz clic en cualquier ciudad o polígono para ver las calles y límites de la ZBE.</span>
            <span>Multa general: 200 €</span>
          </div>
        </div>
      </div>

      {/* Sección Inferior de Recomendación */}
      <RecommendationsSection vehicle={selectedVehicle} currentBadge={currentBadge} />

      {/* Drawer lateral para detalle de ciudad */}
      <CityDetailDrawer
        city={selectedCity}
        onClose={() => setSelectedCity(null)}
        currentBadge={currentBadge}
        vehicleName={vehicleDisplayName}
      />
    </div>
  );
}
