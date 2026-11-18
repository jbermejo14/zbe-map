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

const NO_ACTIVE_SUGGESTION = -1;

export interface MultiCityKeyState {
  isOpen: boolean;
  /** Posición de la sugerencia resaltada; NO_ACTIVE_SUGGESTION si ninguna. */
  activeIndex: number;
}

export interface MultiCityKeyResult extends MultiCityKeyState {
  /** Posición de la sugerencia que hay que añadir, o null si la tecla no añade. */
  addIndex: number | null;
  /** Si la tecla ha tenido efecto y hay que evitar su acción por defecto. */
  handled: boolean;
}

/** Lógica de teclado del buscador: flechas mueven, Intro añade (la primera si no hay resaltada) y Escape cierra. */
export function multiCityHandleKey(
  state: MultiCityKeyState,
  key: string,
  suggestionCount: number
): MultiCityKeyResult {
  const unchanged: MultiCityKeyResult = { ...state, addIndex: null, handled: false };
  if (suggestionCount === 0) return unchanged;
  const last = suggestionCount - 1;
  switch (key) {
    case 'ArrowDown':
      return { isOpen: true, activeIndex: state.activeIndex >= last ? 0 : state.activeIndex + 1, addIndex: null, handled: true };
    case 'ArrowUp':
      return { isOpen: true, activeIndex: state.activeIndex <= 0 ? last : state.activeIndex - 1, addIndex: null, handled: true };
    case 'Enter':
      if (!state.isOpen) return unchanged;
      return { isOpen: false, activeIndex: NO_ACTIVE_SUGGESTION, addIndex: Math.max(state.activeIndex, 0), handled: true };
    case 'Escape':
      if (!state.isOpen) return unchanged;
      return { isOpen: false, activeIndex: NO_ACTIVE_SUGGESTION, addIndex: null, handled: true };
    default:
      return unchanged;
  }
}

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
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(NO_ACTIVE_SUGGESTION);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);

  const allCities = cities ?? [];
  const isFull = selectedSlugs.length >= MAX_CIUDADES_SELECCIONADAS;
  const suggestions = suggestCities(allCities, query, selectedSlugs);
  const selectedCities = selectedSlugs.flatMap((slug) => allCities.find((city) => city.slug === slug) ?? []);

  const handleAdd = (slug: string) => {
    setSelectedSlugs((current) => addSelectedCity(current, slug));
    setQuery('');
    setIsOpen(false);
    setActiveIndex(NO_ACTIVE_SUGGESTION);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setIsOpen(true);
    setActiveIndex(NO_ACTIVE_SUGGESTION);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const result = multiCityHandleKey({ isOpen, activeIndex }, event.key, suggestions.length);
    if (!result.handled) return;
    event.preventDefault();
    setIsOpen(result.isOpen);
    setActiveIndex(result.activeIndex);
    if (result.addIndex !== null) handleAdd(suggestions[result.addIndex].slug);
  };

  const showSuggestions = isOpen && suggestions.length > 0;
  const listboxId = `${ids}-suggestions`;
  const optionId = (index: number) => `${ids}-option-${index}`;

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
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={showSuggestions}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={showSuggestions && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          disabled={isFull || cities === null}
          placeholder={cities === null ? 'Cargando ciudades…' : 'Escribe el nombre: Madrid, Zaragoza…'}
          autoComplete="off"
          className="w-full min-h-11 rounded border border-line bg-elevated px-3 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none disabled:opacity-50"
        />
        {showSuggestions && (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Ciudades sugeridas"
            className="absolute z-30 mt-1 w-full rounded border border-line bg-surface shadow-lg max-h-72 overflow-y-auto"
          >
            {suggestions.map((city, index) => (
              <li
                key={city.slug}
                id={optionId(index)}
                role="option"
                aria-selected={index === activeIndex}
                onClick={() => handleAdd(city.slug)}
                className={`flex items-center min-h-11 px-3 text-sm text-fg cursor-pointer hover:bg-elevated ${
                  index === activeIndex ? 'bg-elevated' : ''
                }`}
              >
                {city.name} <span className="ml-1 text-xs text-muted">({city.province})</span>
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
