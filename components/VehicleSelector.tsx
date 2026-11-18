'use client';

import React, { useMemo, useState } from 'react';
import type { DgtBadgeType } from '@/lib/zbe-engine';
import { getBrands, getModelsByBrand, getVersionsByModel, searchVehicles } from '@/lib/vehicles-repository';
import { lookupPlateForForm } from '@/lib/client-logic';
import { zbeUiBadgeChipClass, zbeUiBadgeShortLabel } from '@/lib/zbe-ui';
import { Search, Filter, Car, ShieldCheck, AlertCircle, Fuel, Zap } from 'lucide-react';

type FuelOption = 'gasolina' | 'diesel' | 'hibrido' | 'electrico';

/** Caracteres mínimos para lanzar la búsqueda libre de vehículos. */
const SEARCH_MIN_LENGTH = 2;

interface VehicleSelectorProps {
  currentBadge: DgtBadgeType;
  onBadgeSelect: (badge: DgtBadgeType) => void;
  onVehicleSelect: (vehicle: any) => void;
  selectedVehicle: any | null;
}

export function VehicleSelector({
  currentBadge,
  onBadgeSelect,
  onVehicleSelect,
  selectedVehicle,
}: VehicleSelectorProps) {
  // Plate search state
  const [plateInput, setPlateInput] = useState('');
  const [selectedFuel, setSelectedFuel] = useState<FuelOption>('gasolina');
  const [isPlateLoading, setIsPlateLoading] = useState(false);
  const [plateError, setPlateError] = useState<string | null>(null);
  const [plateSuccess, setPlateSuccess] = useState<any | null>(null);

  // Selección en cascada: marcas, modelos, versiones y búsqueda se derivan de forma síncrona
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const brands = useMemo(() => getBrands(), []);
  const models = useMemo(() => (selectedBrand ? getModelsByBrand(selectedBrand) : []), [selectedBrand]);
  const versions = useMemo(
    () => (selectedBrand && selectedModel ? getVersionsByModel(selectedBrand, selectedModel) : []),
    [selectedBrand, selectedModel]
  );
  const searchResults = useMemo(
    () => (searchQuery.trim().length >= SEARCH_MIN_LENGTH ? searchVehicles(searchQuery.trim()) : []),
    [searchQuery]
  );

  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    setSelectedModel('');
    setSelectedVersionId('');
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    setSelectedVersionId('');
    const modelVersions = model ? getVersionsByModel(selectedBrand, model) : [];
    if (modelVersions.length === 0) return;
    const matched = modelVersions.find((v) => v.dgtBadge === currentBadge) || modelVersions[0];
    setSelectedVersionId(matched.id);
    onVehicleSelect(matched);
    onBadgeSelect(matched.dgtBadge as DgtBadgeType);
  };

  const quickBadges: { badge: DgtBadgeType; label: string; desc: string }[] = [
    { badge: 'CERO', label: '0 CERO', desc: '100% Eléctrico / PHEV' },
    { badge: 'ECO', label: 'ECO', desc: 'Híbridos / GLP' },
    { badge: 'C', label: 'C', desc: 'Gasolina ≥06 / Diésel ≥15' },
    { badge: 'B', label: 'B', desc: 'Gasolina 01-05 / Diésel 06-15' },
    { badge: 'SIN_ETIQUETA', label: 'SIN ETIQUETA', desc: 'Categoría A' },
  ];

  const handlePlateLookup = async (e?: React.FormEvent, fuelOverride?: FuelOption) => {
    if (e) e.preventDefault();
    const fuelToUse = fuelOverride || selectedFuel;

    setIsPlateLoading(true);
    setPlateError(null);

    try {
      const data = await lookupPlateForForm(plateInput.trim(), fuelToUse);
      const exactBadge = data.badge as DgtBadgeType;
      setPlateSuccess(data);

      // 1. Marcar prioritariamente la etiqueta oficial calculada por la matrícula
      onBadgeSelect(exactBadge);

      // 2. Si hay vehículo representativo, asignarlo con la etiqueta oficial exacta
      if (data.matchedVehicle) {
        onVehicleSelect({
          ...data.matchedVehicle,
          dgtBadge: exactBadge,
        });
      }
    } catch (err) {
      setPlateError(err instanceof Error ? err.message : 'No se pudo consultar la matrícula');
    } finally {
      setIsPlateLoading(false);
    }
  };

  const onFuelChange = (fuel: FuelOption) => {
    setSelectedFuel(fuel);
    // Si ya hay matrícula escrita, recalcular al instante
    if (plateInput.trim().length >= 4) {
      handlePlateLookup(undefined, fuel);
    }
  };

  const fuelOptions: { id: FuelOption; label: string; icon: string; desc: string }[] = [
    { id: 'gasolina', label: 'Gasolina', icon: '⛽', desc: 'Euro 3 a 6' },
    { id: 'diesel', label: 'Diésel', icon: '🛢️', desc: 'Euro 4 a 6' },
    { id: 'hibrido', label: 'Híbrido / GLP', icon: '🔋', desc: 'HEV, MHEV, GNC' },
    { id: 'electrico', label: '100% Eléctrico', icon: '⚡', desc: 'BEV / PHEV ≥40km' },
  ];

  return (
    <div className="space-y-4">
      {/* Buscador de Matrícula DGT */}
      <div className="rounded-lg border border-line bg-elevated/80 p-3 shadow-inner">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Comprobador por Matrícula (Estimación)
          </label>
          <span className="text-[10px] text-muted">Estimación por año de serie</span>
        </div>

        {/* Fila superior: Placa de Matrícula + Botón */}
        <form onSubmit={(e) => handlePlateLookup(e)} className="flex flex-col sm:flex-row items-stretch gap-2">
          {/* Placa de matrícula europea estilizada */}
          <div className="flex-1 flex items-center bg-plate rounded border-2 border-line shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-accent">
            {/* Franja azul europea */}
            <div className="bg-plate-band text-on-plate-band px-2.5 py-1.5 flex flex-col items-center justify-center select-none flex-shrink-0">
              <span className="text-[10px] leading-tight text-plate-star font-bold">★★★</span>
              <span className="text-xs font-black tracking-tight mt-0.5">E</span>
            </div>

            {/* Input de matrícula */}
            <input
              type="text"
              value={plateInput}
              onChange={(e) => {
                setPlateInput(e.target.value.toUpperCase());
                if (plateError) setPlateError(null);
              }}
              placeholder="1234 LMN"
              maxLength={10}
              className="w-full bg-transparent px-3 py-1.5 text-base sm:text-lg font-black tracking-widest text-on-plate placeholder:text-on-plate-muted uppercase text-center focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isPlateLoading}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded bg-btn hover:bg-btn-hover text-on-btn font-bold text-xs transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {isPlateLoading ? (
              <>
                <span className="h-3 w-3 rounded-full border-2 border-on-btn border-t-transparent animate-spin" />
                Comprobando...
              </>
            ) : (
              'Calcular Estimación'
            )}
          </button>
        </form>

        {/* Selector de Combustible al lado / debajo */}
        <div className="mt-2.5 pt-2 border-t border-line">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
              <Fuel className="h-3 w-3 text-accent" />
              Tipo de Motor / Combustible:
            </span>
            <span className="text-[9px] text-muted hidden sm:inline">
              Cruza año DGT + combustible
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {fuelOptions.map((f) => {
              const isSelected = selectedFuel === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onFuelChange(f.id)}
                  className={`flex flex-col items-center justify-center py-1.5 px-2 rounded border text-center transition-all ${
                    isSelected
                      ? 'border-accent bg-accent-soft text-accent font-bold shadow-sm'
                      : 'border-line bg-elevated/60 text-muted hover:text-fg hover:border-line-hover'
                  }`}
                >
                  <span className="text-xs">{f.icon} {f.label}</span>
                  <span className="text-[9px] text-muted mt-0.5">{f.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error de matrícula */}
        {plateError && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-negative bg-negative-soft border border-negative-line rounded px-2.5 py-1.5">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{plateError}</span>
          </div>
        )}

        {/* Éxito de matrícula */}
        {plateSuccess && (
          <div className="mt-2.5 rounded border border-line bg-elevated p-2.5 text-xs shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-fg tracking-wider">
                  {plateSuccess.formattedPlate}
                </span>
                <span className="text-[10px] text-muted bg-elevated px-1.5 py-0.5 rounded">
                  {plateSuccess.estimatedYear ? `Año estimado: ~${plateSuccess.estimatedYear}` : ''} ({plateSuccess.fuelLabel})
                </span>
              </div>

              {/* Distintivo Badge */}
              <span className={`${zbeUiBadgeChipClass(plateSuccess.badge)} text-[11px] font-black uppercase px-2 py-0.5 rounded`}>
                {zbeUiBadgeShortLabel(plateSuccess.badge)}
              </span>
            </div>
            <p className="text-[11px] text-secondary mt-1.5 leading-relaxed">
              {plateSuccess.explanation}
            </p>
            <div className="mt-2 pt-2 border-t border-line flex items-center justify-between text-[10px]">
              <span className="text-warning font-medium">
                ⚠️ Es una estimación basada en serie de matriculación.
              </span>
              <a
                href={plateSuccess.officialDgtUrl || 'https://sede.dgt.gob.es/es/vehiculos/distintivo-ambiental/'}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="text-accent hover:text-accent-hover underline font-semibold inline-flex items-center gap-1"
              >
                Confirmar en Sede DGT &rarr;
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Botonera de prueba rápida */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Prueba rápida por Etiqueta
          </label>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {quickBadges.map((b) => {
            const isActive = currentBadge === b.badge;
            return (
              <button
                key={b.badge}
                type="button"
                onClick={() => onBadgeSelect(b.badge)}
                className={`flex flex-col p-2 rounded border text-left transition-colors ${
                  isActive
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line bg-elevated text-muted hover:text-fg hover:border-line-hover'
                }`}
              >
                <span className="text-xs font-bold">{b.label}</span>
                <span className="text-[10px] text-muted truncate mt-0.5">{b.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Buscador de vehículo */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar modelo (ej. Corolla, Golf, A4, Tucson...)"
            className="w-full rounded border border-line bg-elevated py-2 pl-9 pr-3 text-xs text-fg placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>

        {/* Resultados de búsqueda */}
        {searchResults.length > 0 && (
          <div className="absolute z-30 mt-1 w-full rounded border border-line bg-elevated shadow-xl max-h-56 overflow-y-auto">
            {searchResults.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onVehicleSelect(item);
                  onBadgeSelect(item.dgtBadge as DgtBadgeType);
                  setSelectedBrand(item.brand);
                  setSelectedModel(item.model);
                  setSelectedVersionId(item.id);
                  setSearchQuery('');
                }}
                className="w-full px-3 py-2 text-left text-xs border-b border-line last:border-b-0 hover:bg-elevated flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-fg">
                    {item.brand} {item.model}
                  </span>
                  <span className="text-muted ml-2">({item.year})</span>
                  <p className="text-[11px] text-muted truncate">{item.version}</p>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-accent-line text-accent">
                  {item.dgtBadge}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selectores en cascada */}
      <div className="space-y-2.5 rounded border border-line bg-elevated/60 p-3">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
          <Filter className="h-3 w-3 text-accent" />
          <span>Filtro por Marca y Modelo</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Marca */}
          <div>
            <label className="block text-[10px] text-muted mb-0.5">1. Marca</label>
            <select
              value={selectedBrand}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="w-full rounded border border-line bg-elevated px-2 py-1.5 text-xs text-fg focus:border-accent focus:outline-none"
            >
              <option value="">Selecciona Marca</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Modelo */}
          <div>
            <label className="block text-[10px] text-muted mb-0.5">2. Modelo</label>
            <select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={!selectedBrand}
              className="w-full rounded border border-line bg-elevated px-2 py-1.5 text-xs text-fg focus:border-accent focus:outline-none disabled:opacity-40"
            >
              <option value="">Selecciona Modelo</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Versión */}
          <div>
            <label className="block text-[10px] text-muted mb-0.5">3. Versión / Año</label>
            <select
              value={selectedVersionId}
              onChange={(e) => {
                const vid = e.target.value;
                setSelectedVersionId(vid);
                const match = versions.find((v) => v.id === vid);
                if (match) {
                  onVehicleSelect(match);
                  onBadgeSelect(match.dgtBadge as DgtBadgeType);
                }
              }}
              disabled={!selectedModel || versions.length === 0}
              className="w-full rounded border border-line bg-elevated px-2 py-1.5 text-xs text-fg focus:border-accent focus:outline-none disabled:opacity-40"
            >
              <option value="">Selecciona Versión</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.year} - {v.version} ({v.dgtBadge})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
