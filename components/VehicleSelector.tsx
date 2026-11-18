'use client';

import React, { useId, useMemo, useState } from 'react';
import { getVehicleBrands } from '@/lib/brands';
import { resolveBadgeFromPlate } from '@/lib/plate-badge';
import {
  FUEL_CHOICES,
  FUEL_QUESTION,
  MONTH_NAMES,
  isEtiquetaFuel,
  registrationYears,
  requiresElectricRange,
  requiresRegistrationMonth,
  selectionNeedsFuel,
} from '@/lib/vehicle-selection';
import type { VehicleSelection } from '@/lib/vehicle-selection';
import { AlertCircle, RotateCcw, ShieldCheck } from 'lucide-react';

const FIELD_CLASS =
  'w-full min-h-11 rounded border border-line bg-elevated px-3 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none';
const LABEL_CLASS = 'block text-xs font-semibold text-secondary mb-1';
const MAX_ELECTRIC_RANGE_KM = 1000;
const PLATE_MAX_LENGTH = 10;

interface VehicleSelectorProps {
  selection: VehicleSelection;
  onSelectionChange: (selection: VehicleSelection) => void;
  onReset: () => void;
}

/** Texto de un campo numérico → entero, o null si está vacío o no es un entero. */
function selectorParseInteger(text: string): number | null {
  if (text.trim() === '') return null;
  const value = Number(text);
  return Number.isInteger(value) ? value : null;
}

/** Marca, combustible y año del vehículo; el mes y la autonomía solo aparecen cuando las reglas DGT los exigen. */
export function VehicleSelector({ selection, onSelectionChange, onReset }: VehicleSelectorProps) {
  const ids = useId();
  const brands = useMemo(() => getVehicleBrands(), []);
  const [plateInput, setPlateInput] = useState('');
  const [isPlateLoading, setIsPlateLoading] = useState(false);
  const [plateError, setPlateError] = useState<string | null>(null);
  const [plateNote, setPlateNote] = useState<string | null>(null);
  const needsFuel = selectionNeedsFuel(selection);
  const years = useMemo(() => registrationYears(new Date().getFullYear()), []);

  const update = (changes: Partial<VehicleSelection>) => {
    const next = { ...selection, ...changes };
    // Mes y autonomía solo valen para su combustible y año; al cambiarlos se descartan.
    if (!requiresRegistrationMonth(next)) next.month = null;
    if (!requiresElectricRange(next)) next.electricRangeKm = null;
    onSelectionChange(next);
  };

  const handlePlateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsPlateLoading(true);
    setPlateError(null);
    setPlateNote(null);
    try {
      const resolution = await resolveBadgeFromPlate(plateInput);
      setPlateNote(`${resolution.formattedPlate}: año estimado ${resolution.year} por la serie de la matrícula.`);
      update({ year: resolution.year });
    } catch (err) {
      setPlateError(err instanceof Error ? err.message : 'No se pudo estimar la matrícula. Inténtalo de nuevo.');
    } finally {
      setIsPlateLoading(false);
    }
  };

  const handleReset = () => {
    setPlateInput('');
    setPlateError(null);
    setPlateNote(null);
    onReset();
  };

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`${ids}-brand`} className={LABEL_CLASS}>1. Marca (opcional)</label>
        <input
          id={`${ids}-brand`}
          type="text"
          list={`${ids}-brands`}
          value={selection.brand}
          onChange={(e) => update({ brand: e.target.value })}
          placeholder="Escribe para buscar: BMW, Seat…"
          autoComplete="off"
          className={FIELD_CLASS}
        />
        <datalist id={`${ids}-brands`}>
          {brands.map((brand) => (
            <option key={brand} value={brand} />
          ))}
        </datalist>
      </div>

      <div>
        <label
          htmlFor={`${ids}-fuel`}
          className={needsFuel ? `${LABEL_CLASS} text-accent` : LABEL_CLASS}
        >
          2. Combustible{needsFuel ? ` · ${FUEL_QUESTION}` : ''}
        </label>
        <select
          id={`${ids}-fuel`}
          value={selection.fuel ?? ''}
          onChange={(e) => update({ fuel: isEtiquetaFuel(e.target.value) ? e.target.value : null })}
          className={needsFuel ? `${FIELD_CLASS} border-accent ring-2 ring-accent` : FIELD_CLASS}
        >
          <option value="">Elige el combustible</option>
          {FUEL_CHOICES.map((fuel) => (
            <option key={fuel.id} value={fuel.id}>{fuel.label}</option>
          ))}
        </select>
      </div>

      {requiresElectricRange(selection) && (
        <div>
          <label htmlFor={`${ids}-range`} className={LABEL_CLASS}>Autonomía eléctrica (km)</label>
          <input
            id={`${ids}-range`}
            type="number"
            inputMode="numeric"
            min={0}
            max={MAX_ELECTRIC_RANGE_KM}
            value={selection.electricRangeKm ?? ''}
            onChange={(e) => update({ electricRangeKm: selectorParseInteger(e.target.value) })}
            placeholder="Ej. 50"
            className={FIELD_CLASS}
          />
        </div>
      )}

      <div>
        <label htmlFor={`${ids}-year`} className={LABEL_CLASS}>3. Año de matriculación</label>
        <select
          id={`${ids}-year`}
          value={selection.year ?? ''}
          onChange={(e) => update({ year: selectorParseInteger(e.target.value) })}
          className={FIELD_CLASS}
        >
          <option value="">Elige el año</option>
          {years.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {requiresRegistrationMonth(selection) && (
        <div>
          <label htmlFor={`${ids}-month`} className={LABEL_CLASS}>Mes de matriculación</label>
          <select
            id={`${ids}-month`}
            value={selection.month ?? ''}
            onChange={(e) => update({ month: selectorParseInteger(e.target.value) })}
            className={FIELD_CLASS}
          >
            <option value="">Sin indicar</option>
            {MONTH_NAMES.map((name, index) => (
              <option key={name} value={index + 1}>{name}</option>
            ))}
          </select>
        </div>
      )}

      <form onSubmit={handlePlateSubmit} className="rounded-lg border border-line bg-elevated/80 p-3 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Estimación por la serie de la matrícula
        </h4>
        <p className="text-xs text-muted">
          Alternativa a elegir el año a mano: el año se deduce de las letras de la matrícula. Se procesa solo en tu navegador.
        </p>
        <label htmlFor={`${ids}-plate`} className={LABEL_CLASS}>Buscar por matrícula</label>
        <div className="flex gap-2">
          <input
            id={`${ids}-plate`}
            type="text"
            value={plateInput}
            onChange={(e) => {
              setPlateInput(e.target.value.toUpperCase());
              if (plateError) setPlateError(null);
            }}
            placeholder="1234 LMN"
            maxLength={PLATE_MAX_LENGTH}
            autoComplete="off"
            className={`${FIELD_CLASS} uppercase tracking-widest`}
          />
          <button type="submit" disabled={isPlateLoading} className="btn btn-primary disabled:opacity-50">
            {isPlateLoading ? 'Estimando…' : 'Estimar'}
          </button>
        </div>
        {plateError && (
          <div role="alert" className="flex items-start gap-1.5 text-xs text-negative bg-negative-soft border border-negative-line rounded px-2.5 py-1.5">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{plateError}</span>
          </div>
        )}
        {plateNote && <p role="status" className="text-xs text-secondary">{plateNote}</p>}
      </form>

      <button type="button" onClick={handleReset} className="btn btn-secondary w-full">
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Empezar de nuevo
      </button>
    </div>
  );
}
