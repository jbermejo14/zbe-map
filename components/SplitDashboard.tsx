'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  DgtBadgeType,
  CityEvaluationResult,
  ZbeAccessStatus,
} from '@/lib/zbe-engine';
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
      <div className="flex h-[580px] w-full items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <span className="h-4 w-4 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          <span>Cargando mapa de España y líneas ZBE...</span>
        </div>
      </div>
    ),
  }
);

interface SplitDashboardProps {
  initialVehicle?: any;
  initialBadge?: DgtBadgeType;
  initialCities?: CityEvaluationResult[];
}

export function SplitDashboard({
  initialVehicle = null,
  initialBadge = 'B',
  initialCities = [],
}: SplitDashboardProps) {
  const [currentBadge, setCurrentBadge] = useState<DgtBadgeType>(initialBadge);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(initialVehicle);
  const [cities, setCities] = useState<CityEvaluationResult[]>(initialCities);
  const [loadingCities, setLoadingCities] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityEvaluationResult | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | ZbeAccessStatus>('all');

  // Cargar ciudades cuando cambia el distintivo
  useEffect(() => {
    async function fetchCities() {
      setLoadingCities(true);
      try {
        const res = await fetch(`/api/zbe-cities?badge=${currentBadge}`);
        const data = await res.json();
        if (data.cities) {
          setCities(data.cities);
        }
      } catch (err) {
        console.error('Error fetching cities for badge:', err);
      } finally {
        setLoadingCities(false);
      }
    }

    fetchCities();
  }, [currentBadge]);

  // Vehículo inicial por defecto
  useEffect(() => {
    if (!selectedVehicle) {
      async function loadDefaultCar() {
        try {
          const res = await fetch('/api/vehicles?search=Audi A4');
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            const car = data.results[0];
            setSelectedVehicle(car);
            setCurrentBadge(car.dgtBadge as DgtBadgeType);
          }
        } catch (err) {
          console.error('Error loading default vehicle:', err);
        }
      }
      loadDefaultCar();
    }
  }, [selectedVehicle]);

  // Contadores
  const allowedCount = cities.filter((c) => c.status === 'allowed').length;
  const restrictedCount = cities.filter((c) => c.status === 'restricted').length;
  const bannedCount = cities.filter((c) => c.status === 'banned').length;

  const vehicleDisplayName = selectedVehicle
    ? `${selectedVehicle.brand} ${selectedVehicle.model}`
    : `Vehículo Etiqueta ${currentBadge}`;

  return (
    <div className="w-full">
      {/* Barra de Resumen Superior - Simple Negro y Naranja */}
      <div className="mb-6 rounded-xl border border-neutral-800 bg-neutral-950 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Veredicto Nacional ZBE
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              {vehicleDisplayName} &middot;{' '}
              <span className="text-orange-500 font-black">
                {currentBadge === 'CERO'
                  ? '0 CERO'
                  : currentBadge === 'SIN_ETIQUETA'
                  ? 'Sin Etiqueta (A)'
                  : `Etiqueta ${currentBadge}`}
              </span>
            </h2>
          </div>

          {/* Estadísticas de ciudades */}
          <div className="grid grid-cols-3 gap-2 flex-shrink-0">
            {/* Permitidas */}
            <div className="flex flex-col items-center justify-center px-4 py-2 rounded bg-neutral-900 border border-neutral-800 text-center">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-green-400">
                <Check className="h-3 w-3" />
                Libre
              </span>
              <span className="text-xl font-black text-white">{allowedCount}</span>
            </div>

            {/* Restringidas */}
            <div className="flex flex-col items-center justify-center px-4 py-2 rounded bg-neutral-900 border border-neutral-800 text-center">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-orange-400">
                <AlertTriangle className="h-3 w-3" />
                Parking
              </span>
              <span className="text-xl font-black text-white">{restrictedCount}</span>
            </div>

            {/* Prohibidas */}
            <div className="flex flex-col items-center justify-center px-4 py-2 rounded bg-neutral-900 border border-neutral-800 text-center">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-red-400">
                <X className="h-3 w-3" />
                Vetado
              </span>
              <span className="text-xl font-black text-white">{bannedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Split View Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* PANEL IZQUIERDO: Selector de Vehículo & Ficha DGT */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
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
        <div className="lg:col-span-7 flex flex-col h-full min-h-[580px]">
          <SpainZbeMap
            cities={cities}
            selectedCity={selectedCity}
            onCitySelect={(city) => setSelectedCity(city)}
            statusFilter={statusFilter}
            onFilterChange={(f) => setStatusFilter(f)}
          />

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-neutral-400 px-1">
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
