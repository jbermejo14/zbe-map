'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { evaluateCitiesForBadge } from '@/lib/zbe-engine';
import type { CityEvaluationResult, DgtBadgeType, ZbeAccessStatus } from '@/lib/zbe-engine';
import type { CityData } from '@/lib/cities-repository';
import { zbeUiBadgeChipClass, zbeUiBadgeSentenceLabel } from '@/lib/zbe-ui';
import {
  EMPTY_VEHICLE_SELECTION,
  FUEL_QUESTION,
  evaluateVehicleSelection,
  selectionNeedsFuel,
} from '@/lib/vehicle-selection';
import type { VehicleSelection } from '@/lib/vehicle-selection';
import { VehicleSelector } from './VehicleSelector';
import { VehicleResultCard, VehicleResultPlaceholder } from './VehicleResultCard';
import { CityDetailDrawer } from './CityDetailDrawer';
import { MultiCitySelector } from './MultiCitySelector';
import { RecommendationsSection } from './RecommendationsSection';
import { Check, AlertTriangle, X } from 'lucide-react';

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

/** Sin etiqueta no hay acceso que calcular; este valor solo sirve para obtener la geometría de las ciudades. */
const GEOMETRY_ONLY_BADGE: DgtBadgeType = 'B';

const EMPTY_STATE_TEXT = 'Elige tu vehículo (marca, combustible y año) para ver dónde puedes circular';
const COUNT_PLACEHOLDER = '—';
const CITIES_LOAD_ERROR =
  'No se pudieron cargar los datos de las ciudades ZBE. Recarga la página; si persiste, vuelve a intentarlo más tarde.';

function DashboardCount({ label, value, icon, colorClass }: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-2 rounded bg-elevated border border-line text-center">
      <span className={`flex items-center gap-1 text-[11px] font-semibold ${colorClass}`}>
        {icon}
        {label}
      </span>
      <span className="text-xl font-black text-fg">{value}</span>
    </div>
  );
}

export function SplitDashboard() {
  const [selection, setSelection] = useState<VehicleSelection>(EMPTY_VEHICLE_SELECTION);
  const [allCities, setAllCities] = useState<CityData[] | null>(null);
  const [citiesError, setCitiesError] = useState<string | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | ZbeAccessStatus>('all');

  const result = useMemo(() => evaluateVehicleSelection(selection), [selection]);
  const currentBadge = result?.badge ?? null;

  // Los datos de las ciudades (con polígonos, ~400 KB) se importan de forma dinámica
  // para que no entren en el JS inicial de la página.
  useEffect(() => {
    let isCurrent = true;
    import('@/lib/cities-repository')
      .then(({ getAllCities }) => {
        if (isCurrent) setAllCities(getAllCities());
      })
      .catch((err: unknown) => {
        console.error('Error cargando las ciudades ZBE:', err);
        if (isCurrent) setCitiesError(CITIES_LOAD_ERROR);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const cities: CityEvaluationResult[] = useMemo(
    () => (allCities ? evaluateCitiesForBadge(currentBadge ?? GEOMETRY_ONLY_BADGE, allCities) : []),
    [allCities, currentBadge]
  );
  const selectedCity = cities.find((city) => city.cityId === selectedCityId) ?? null;

  const countOf = (status: ZbeAccessStatus) => {
    if (!currentBadge || !allCities) return COUNT_PLACEHOLDER;
    return cities.filter((c) => c.status === status).length;
  };

  return (
    <div className="w-full">
      {/* Barra de resumen superior */}
      <div className="mb-6 rounded-xl border border-line bg-surface p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-accent" />
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                Veredicto Nacional ZBE
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-fg break-words">
              {result && currentBadge ? (
                <>
                  {result.title} &middot;{' '}
                  <span className={`${zbeUiBadgeChipClass(currentBadge)} font-black px-2 py-0.5 rounded`}>
                    {zbeUiBadgeSentenceLabel(currentBadge)}
                  </span>
                </>
              ) : (
                EMPTY_STATE_TEXT
              )}
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-2 flex-shrink-0">
            <DashboardCount label="Libre" value={countOf('allowed')} colorClass="text-positive" icon={<Check className="h-3 w-3" aria-hidden="true" />} />
            <DashboardCount label="Parking" value={countOf('restricted')} colorClass="text-warning" icon={<AlertTriangle className="h-3 w-3" aria-hidden="true" />} />
            <DashboardCount label="Vetado" value={countOf('banned')} colorClass="text-negative" icon={<X className="h-3 w-3" aria-hidden="true" />} />
          </div>
        </div>
      </div>

      {citiesError && (
        <div role="alert" className="mb-6 rounded-xl border border-negative-line bg-negative-soft p-4 text-xs text-negative">
          {citiesError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* PANEL IZQUIERDO: selector de vehículo y resultado */}
        <div className="lg:col-span-5 min-w-0 space-y-6">
          <div id="buscador" className="anchor-target card card-compact">
            <h3 className="text-sm font-bold text-fg uppercase tracking-wider mb-3">
              Tu vehículo
            </h3>
            <VehicleSelector
              selection={selection}
              onSelectionChange={setSelection}
              onReset={() => {
                setSelection(EMPTY_VEHICLE_SELECTION);
                setSelectedCityId(null);
                setStatusFilter('all');
              }}
            />
          </div>

          {result ? (
            <VehicleResultCard
              badge={result.badge}
              title={result.title}
              chips={[String(result.year), ...(result.fuelLabel ? [result.fuelLabel] : [])]}
              description={result.evaluation.description}
              euroStandard={result.evaluation.euroStandard}
              etiquetaHref={result.etiquetaHref}
              assumptions={result.assumptions}
            />
          ) : (
            <VehicleResultPlaceholder
              message={selectionNeedsFuel(selection) ? FUEL_QUESTION : undefined}
            />
          )}
        </div>

        {/* PANEL DERECHO: mapa de España con los perímetros ZBE */}
        <div id="mapa" className="anchor-target lg:col-span-7 flex flex-col h-full min-h-[580px] min-w-0">
          <SpainZbeMap
            cities={cities}
            badge={currentBadge}
            selectedCity={selectedCity}
            onCitySelect={(city) => setSelectedCityId(city.cityId)}
            statusFilter={statusFilter}
            onFilterChange={setStatusFilter}
          />

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-muted px-1">
            <span>Haz clic en cualquier ciudad o perímetro para ver las calles y límites de la ZBE.</span>
            <span>Multa general: 200 €</span>
          </div>
        </div>
      </div>

      <MultiCitySelector cities={allCities} badge={currentBadge} />

      <RecommendationsSection currentBadge={currentBadge} vehicleTitle={result?.title ?? null} />

      <CityDetailDrawer
        city={selectedCity}
        onClose={() => setSelectedCityId(null)}
        currentBadge={currentBadge}
        vehicleName={result?.title}
      />
    </div>
  );
}
