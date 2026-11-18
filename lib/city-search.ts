/** Búsqueda y agrupación de ciudades para la página /ciudades y el selector de varias ciudades. */

export interface CitySearchItem {
  name: string;
  province: string;
  region: string;
}

export interface RegionGroup<T extends CitySearchItem> {
  region: string;
  cities: T[];
}

const SPANISH_LOCALE = 'es';

/** Minúsculas y sin tildes, para que "malaga" encuentre "Málaga". */
export function normalizeSearchText(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

/** Ciudades cuyo nombre contiene la búsqueda; con búsqueda vacía devuelve todas. */
export function filterCitiesByName<T extends CitySearchItem>(cities: readonly T[], query: string): T[] {
  const needle = normalizeSearchText(query);
  if (!needle) return [...cities];
  return cities.filter((city) => normalizeSearchText(city.name).includes(needle));
}

/** Ciudades agrupadas por comunidad autónoma; comunidades y ciudades en orden alfabético. */
export function groupCitiesByRegion<T extends CitySearchItem>(cities: readonly T[]): RegionGroup<T>[] {
  const byRegion = new Map<string, T[]>();
  for (const city of cities) {
    byRegion.set(city.region, [...(byRegion.get(city.region) ?? []), city]);
  }
  return [...byRegion.entries()]
    .sort(([a], [b]) => a.localeCompare(b, SPANISH_LOCALE))
    .map(([region, list]) => ({
      region,
      cities: [...list].sort((a, b) => a.name.localeCompare(b.name, SPANISH_LOCALE)),
    }));
}
