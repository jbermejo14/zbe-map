/** Selección de varias ciudades de la home: límite, alta y baja de fichas. */
import { filterCitiesByName } from './city-search.ts';
import type { CitySearchItem } from './city-search.ts';

/** Máximo de ciudades a la vez, para no cargar demasiados mapas. */
export const MAX_CIUDADES_SELECCIONADAS = 4;

/** Sugerencias que muestra el autocompletado. */
export const CITY_SUGGESTION_LIMIT = 8;

export const MAX_CITIES_MESSAGE = `Has llegado al máximo de ${MAX_CIUDADES_SELECCIONADAS} ciudades. Quita una ficha para añadir otra.`;

/** Añade un slug al final; ignora los repetidos y no pasa del máximo. */
export function addSelectedCity(selected: readonly string[], slug: string): string[] {
  if (selected.includes(slug) || selected.length >= MAX_CIUDADES_SELECCIONADAS) return [...selected];
  return [...selected, slug];
}

export function removeSelectedCity(selected: readonly string[], slug: string): string[] {
  return selected.filter((item) => item !== slug);
}

/** Ciudades que encajan con la búsqueda y aún no están seleccionadas. */
export function suggestCities<T extends CitySearchItem & { slug: string }>(
  cities: readonly T[],
  query: string,
  selected: readonly string[]
): T[] {
  if (!query.trim()) return [];
  return filterCitiesByName(cities, query)
    .filter((city) => !selected.includes(city.slug))
    .slice(0, CITY_SUGGESTION_LIMIT);
}
