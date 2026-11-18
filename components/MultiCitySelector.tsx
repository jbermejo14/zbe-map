'use client';

import React, { useId, useState } from 'react';
import type { CityData } from '@/lib/cities-repository';
import type { DgtBadgeType } from '@/lib/zbe-engine';
import {
  MAX_CIUDADES_SELECCIONADAS,
  MAX_CITIES_MESSAGE,
  addSelectedCity,
  removeSelectedCity,
  suggestCities,
} from '@/lib/multi-city';
import { CityInfoCard } from './CityInfoCard';
import { X } from 'lucide-react';

interface MultiCitySelectorProps {
  /** Datos ligeros de todas las ciudades; null mientras se cargan. */
  cities: CityData[] | null;
  /** Etiqueta elegida en la home; null si todavía no hay. */
  badge: DgtBadgeType | null;
}

/** Sección "Consulta varias ciudades": fichas quitables, autocompletado y una tarjeta con mapa por ciudad. */
export function MultiCitySelector({ cities, badge }: MultiCitySelectorProps) {
  const ids = useId();
  const [query, setQuery] = useState('');
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);

  const allCities = cities ?? [];
  const isFull = selectedSlugs.length >= MAX_CIUDADES_SELECCIONADAS;
  const suggestions = suggestCities(allCities, query, selectedSlugs);
  const selectedCities = selectedSlugs.flatMap((slug) => allCities.find((city) => city.slug === slug) ?? []);

  const handleAdd = (slug: string) => {
    setSelectedSlugs((current) => addSelectedCity(current, slug));
    setQuery('');
  };

  const handleRemove = (slug: string) => setSelectedSlugs((current) => removeSelectedCity(current, slug));

  return (
    <section id="varias-ciudades" className="anchor-target mt-8 card card-compact">
      <h2 className="text-lg font-bold text-fg">Consulta varias ciudades</h2>
      <p className="text-xs text-muted mt-1">
        Añade hasta {MAX_CIUDADES_SELECCIONADAS} ciudades para comparar su ZBE, el acceso con tu etiqueta y su mapa.
      </p>

      <div className="mt-3 max-w-md relative">
        <label htmlFor={`${ids}-city`} className="block text-xs font-semibold text-secondary mb-1">
          Añadir una ciudad
        </label>
        <input
          id={`${ids}-city`}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isFull || cities === null}
          placeholder={cities === null ? 'Cargando ciudades…' : 'Escribe el nombre: Madrid, Zaragoza…'}
          autoComplete="off"
          className="w-full min-h-11 rounded border border-line bg-elevated px-3 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none disabled:opacity-50"
        />
        {suggestions.length > 0 && (
          <ul className="absolute z-30 mt-1 w-full rounded border border-line bg-surface shadow-lg max-h-72 overflow-y-auto">
            {suggestions.map((city) => (
              <li key={city.slug}>
                <button
                  type="button"
                  onClick={() => handleAdd(city.slug)}
                  className="w-full min-h-11 px-3 text-left text-sm text-fg hover:bg-elevated"
                >
                  {city.name} <span className="text-xs text-muted">({city.province})</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isFull && (
        <p role="status" className="mt-2 text-xs font-semibold text-warning">{MAX_CITIES_MESSAGE}</p>
      )}

      {selectedCities.length > 0 && (
        <>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Ciudades seleccionadas">
            {selectedCities.map((city) => (
              <li key={city.slug}>
                <button
                  type="button"
                  onClick={() => handleRemove(city.slug)}
                  aria-label={`Quitar ${city.name}`}
                  className="inline-flex items-center gap-1.5 min-h-11 rounded-full border border-accent-line bg-accent-soft pl-3 pr-2 text-xs font-semibold text-accent"
                >
                  {city.name}
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {selectedCities.map((city) => (
              <CityInfoCard key={city.slug} city={city} badge={badge} onRemove={handleRemove} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
