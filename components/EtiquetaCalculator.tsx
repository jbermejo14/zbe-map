'use client';

import React, { useId, useMemo, useState } from 'react';
import {
  EMPTY_VEHICLE_SELECTION,
  FUEL_CHOICES,
  FUEL_QUESTION,
  MONTH_NAMES,
  evaluateVehicleSelection,
  isEtiquetaFuel,
  registrationYears,
  requiresElectricRange,
  requiresRegistrationMonth,
  selectionNeedsFuel,
} from '@/lib/vehicle-selection';
import type { VehicleSelection } from '@/lib/vehicle-selection';
import { VehicleResultCard, VehicleResultPlaceholder } from './VehicleResultCard';

const FIELD_CLASS =
  'w-full min-h-11 rounded border border-line bg-elevated px-3 text-sm text-fg focus:border-accent focus:outline-none';
const LABEL_CLASS = 'block text-xs font-semibold text-secondary mb-1';
const MAX_ELECTRIC_RANGE_KM = 1000;

/** Texto de un campo numérico → entero, o null si está vacío o no es un entero. */
function calculatorParseInteger(text: string): number | null {
  if (text.trim() === '') return null;
  const value = Number(text);
  return Number.isInteger(value) ? value : null;
}

/** Calculadora rápida: combustible y año (más mes o autonomía cuando la norma los exige) → etiqueta DGT. */
export function EtiquetaCalculator() {
  const ids = useId();
  const [selection, setSelection] = useState<VehicleSelection>(EMPTY_VEHICLE_SELECTION);
  const years = useMemo(() => registrationYears(new Date().getFullYear()), []);
  const result = useMemo(() => evaluateVehicleSelection(selection), [selection]);

  const update = (changes: Partial<VehicleSelection>) => {
    const next = { ...selection, ...changes };
    // Mes y autonomía solo valen para su combustible y año; al cambiarlos se descartan.
    if (!requiresRegistrationMonth(next)) next.month = null;
    if (!requiresElectricRange(next)) next.electricRangeKm = null;
    setSelection(next);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      <form className="card card-compact space-y-3" onSubmit={(event) => event.preventDefault()}>
        <div>
          <label htmlFor={`${ids}-fuel`} className={LABEL_CLASS}>Combustible</label>
          <select
            id={`${ids}-fuel`}
            value={selection.fuel ?? ''}
            onChange={(e) => update({ fuel: isEtiquetaFuel(e.target.value) ? e.target.value : null })}
            className={FIELD_CLASS}
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
              onChange={(e) => update({ electricRangeKm: calculatorParseInteger(e.target.value) })}
              className={FIELD_CLASS}
            />
          </div>
        )}

        <div>
          <label htmlFor={`${ids}-year`} className={LABEL_CLASS}>Año de matriculación</label>
          <select
            id={`${ids}-year`}
            value={selection.year ?? ''}
            onChange={(e) => update({ year: calculatorParseInteger(e.target.value) })}
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
              onChange={(e) => update({ month: calculatorParseInteger(e.target.value) })}
              className={FIELD_CLASS}
            >
              <option value="">Sin indicar</option>
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={index + 1}>{name}</option>
              ))}
            </select>
          </div>
        )}
      </form>

      <div className="min-w-0">
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
            hint="Elige el combustible y el año de matriculación para ver qué etiqueta le corresponde."
          />
        )}
      </div>
    </div>
  );
}
