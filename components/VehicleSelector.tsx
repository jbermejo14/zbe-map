'use client';

import React, { useState, useEffect } from 'react';
import { DgtBadgeType } from '@/lib/zbe-engine';
import { Search, Filter, Car, ShieldCheck, AlertCircle, Fuel, Zap } from 'lucide-react';

type FuelOption = 'gasolina' | 'diesel' | 'hibrido' | 'electrico';

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

  // Cascading states
  const [brands, setBrands] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [versions, setVersions] = useState<any[]>([]);

  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');

  // Live search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load brands on mount
  useEffect(() => {
    async function loadBrands() {
      try {
        const res = await fetch('/api/vehicles?action=brands');
        const data = await res.json();
        if (data.brands) {
          setBrands(data.brands);
        }
      } catch (err) {
        console.error('Error fetching brands:', err);
      }
    }
    loadBrands();
  }, []);

  // When brand changes, load models
  useEffect(() => {
    if (!selectedBrand) {
      setModels([]);
      setSelectedModel('');
      setVersions([]);
      setSelectedVersionId('');
      return;
    }

    async function loadModels() {
      try {
        const res = await fetch(`/api/vehicles?action=models&brand=${encodeURIComponent(selectedBrand)}`);
        const data = await res.json();
        if (data.models) {
          setModels(data.models);
          setSelectedModel('');
          setVersions([]);
          setSelectedVersionId('');
        }
      } catch (err) {
        console.error('Error loading models:', err);
      }
    }
    loadModels();
  }, [selectedBrand]);

  // When model changes, load versions
  useEffect(() => {
    if (!selectedBrand || !selectedModel) {
      setVersions([]);
      setSelectedVersionId('');
      return;
    }

    async function loadVersions() {
      try {
        const res = await fetch(
          `/api/vehicles?action=versions&brand=${encodeURIComponent(selectedBrand)}&model=${encodeURIComponent(
            selectedModel
          )}`
        );
        const data = await res.json();
        if (data.versions) {
          setVersions(data.versions);
          if (data.versions.length > 0) {
            const matched = data.versions.find((v: any) => v.dgtBadge === currentBadge) || data.versions[0];
            setSelectedVersionId(matched.id);
            onVehicleSelect(matched);
            onBadgeSelect(matched.dgtBadge as DgtBadgeType);
          }
        }
      } catch (err) {
        console.error('Error loading versions:', err);
      }
    }
    loadVersions();
  }, [selectedBrand, selectedModel]);

  // Live search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/vehicles?search=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        if (data.results) {
          setSearchResults(data.results);
        }
      } catch (err) {
        console.error('Error searching vehicles:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const quickBadges: { badge: DgtBadgeType; label: string; desc: string }[] = [
    { badge: 'CERO', label: '0 CERO', desc: '100% Eléctrico / PHEV' },
    { badge: 'ECO', label: 'ECO', desc: 'Híbridos / GLP' },
    { badge: 'C', label: 'C', desc: 'Gasolina ≥06 / Diésel ≥15' },
    { badge: 'B', label: 'B', desc: 'Gasolina 01-05 / Diésel 06-15' },
    { badge: 'SIN_ETIQUETA', label: 'SIN ETIQUETA', desc: 'Categoría A' },
  ];

  const handlePlateLookup = async (e?: React.FormEvent, fuelOverride?: FuelOption) => {
    if (e) e.preventDefault();
    if (!plateInput || plateInput.trim().length < 4) {
      setPlateError('Introduce una matrícula válida (ej: 1234 LMN o M 1234 AB)');
      return;
    }

    const fuelToUse = fuelOverride || selectedFuel;

    setIsPlateLoading(true);
    setPlateError(null);

    try {
      const res = await fetch(
        `/api/plate?plate=${encodeURIComponent(plateInput.trim())}&fuel=${encodeURIComponent(fuelToUse)}`
      );
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'No se pudo consultar la matrícula');
      }

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
    } catch (err: any) {
      setPlateError(err?.message || 'Error al conectar con el servicio DGT');
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
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/80 p-3 shadow-inner">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Comprobador por Matrícula (Estimación)
          </label>
          <span className="text-[10px] text-neutral-400">Estimación por año de serie</span>
        </div>

        {/* Fila superior: Placa de Matrícula + Botón */}
        <form onSubmit={(e) => handlePlateLookup(e)} className="flex flex-col sm:flex-row items-stretch gap-2">
          {/* Placa de matrícula europea estilizada */}
          <div className="flex-1 flex items-center bg-white rounded border-2 border-neutral-300 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-orange-500">
            {/* Franja azul europea */}
            <div className="bg-[#003399] text-white px-2.5 py-1.5 flex flex-col items-center justify-center select-none flex-shrink-0">
              <span className="text-[10px] leading-tight text-amber-300 font-bold">★★★</span>
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
              className="w-full bg-transparent px-3 py-1.5 text-base sm:text-lg font-black tracking-widest text-neutral-900 placeholder-neutral-400 uppercase text-center focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isPlateLoading}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {isPlateLoading ? (
              <>
                <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Comprobando...
              </>
            ) : (
              'Calcular Estimación'
            )}
          </button>
        </form>

        {/* Selector de Combustible al lado / debajo */}
        <div className="mt-2.5 pt-2 border-t border-neutral-800/80">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
              <Fuel className="h-3 w-3 text-orange-400" />
              Tipo de Motor / Combustible:
            </span>
            <span className="text-[9px] text-neutral-500 hidden sm:inline">
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
                      ? 'border-orange-500 bg-orange-950/30 text-orange-400 font-bold shadow-sm'
                      : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white hover:border-neutral-700'
                  }`}
                >
                  <span className="text-xs">{f.icon} {f.label}</span>
                  <span className="text-[9px] text-neutral-500 mt-0.5">{f.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error de matrícula */}
        {plateError && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded px-2.5 py-1.5">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{plateError}</span>
          </div>
        )}

        {/* Éxito de matrícula */}
        {plateSuccess && (
          <div className="mt-2.5 rounded border border-neutral-700 bg-neutral-900 p-2.5 text-xs shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-white tracking-wider">
                  {plateSuccess.formattedPlate}
                </span>
                <span className="text-[10px] text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded">
                  {plateSuccess.estimatedYear ? `Año estimado: ~${plateSuccess.estimatedYear}` : ''} ({plateSuccess.fuelLabel})
                </span>
              </div>

              {/* Distintivo Badge */}
              <span
                className={`text-[11px] font-black uppercase px-2 py-0.5 rounded border ${
                  plateSuccess.badge === 'CERO'
                    ? 'bg-blue-950/60 text-blue-400 border-blue-500/50'
                    : plateSuccess.badge === 'ECO'
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/50'
                    : plateSuccess.badge === 'C'
                    ? 'bg-green-950/60 text-green-400 border-green-500/50'
                    : plateSuccess.badge === 'B'
                    ? 'bg-amber-950/60 text-amber-400 border-amber-500/50'
                    : 'bg-neutral-800 text-neutral-300 border-neutral-600'
                }`}
              >
                {plateSuccess.badge === 'CERO'
                  ? '0 CERO'
                  : plateSuccess.badge === 'SIN_ETIQUETA'
                  ? 'SIN ETIQUETA (A)'
                  : `ETIQUETA ${plateSuccess.badge}`}
              </span>
            </div>
            <p className="text-[11px] text-neutral-300 mt-1.5 leading-relaxed">
              {plateSuccess.explanation}
            </p>
            <div className="mt-2 pt-2 border-t border-neutral-800 flex items-center justify-between text-[10px]">
              <span className="text-amber-400/90 font-medium">
                ⚠️ Es una estimación basada en serie de matriculación.
              </span>
              <a
                href={plateSuccess.officialDgtUrl || 'https://sede.dgt.gob.es/es/vehiculos/distintivo-ambiental/'}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 underline font-semibold inline-flex items-center gap-1"
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
          <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
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
                    ? 'border-orange-500 bg-orange-950/20 text-orange-400'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white hover:border-neutral-700'
                }`}
              >
                <span className="text-xs font-bold">{b.label}</span>
                <span className="text-[10px] text-neutral-400 truncate mt-0.5">{b.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Buscador de vehículo */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar modelo (ej. Corolla, Golf, Audi A4, Tucson...)"
            className="w-full rounded border border-neutral-800 bg-neutral-900 py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-400 focus:border-orange-500 focus:outline-none"
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-orange-500 border-t-transparent animate-spin block" />
            </div>
          )}
        </div>

        {/* Resultados de búsqueda */}
        {searchResults.length > 0 && (
          <div className="absolute z-30 mt-1 w-full rounded border border-neutral-800 bg-neutral-900 shadow-xl max-h-56 overflow-y-auto">
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
                  setSearchResults([]);
                }}
                className="w-full px-3 py-2 text-left text-xs border-b border-neutral-800/60 last:border-b-0 hover:bg-neutral-800 flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-white">
                    {item.brand} {item.model}
                  </span>
                  <span className="text-neutral-400 ml-2">({item.year})</span>
                  <p className="text-[11px] text-neutral-400 truncate">{item.version}</p>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-orange-500/40 text-orange-400">
                  {item.dgtBadge}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selectores en cascada */}
      <div className="space-y-2.5 rounded border border-neutral-800 bg-neutral-900/60 p-3">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
          <Filter className="h-3 w-3 text-orange-500" />
          <span>Filtro por Marca y Modelo</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Marca */}
          <div>
            <label className="block text-[10px] text-neutral-400 mb-0.5">1. Marca</label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full rounded border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
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
            <label className="block text-[10px] text-neutral-400 mb-0.5">2. Modelo</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={!selectedBrand}
              className="w-full rounded border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none disabled:opacity-40"
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
            <label className="block text-[10px] text-neutral-400 mb-0.5">3. Versión / Año</label>
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
              className="w-full rounded border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none disabled:opacity-40"
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
