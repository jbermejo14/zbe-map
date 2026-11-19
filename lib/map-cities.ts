import { isZbeInProgress } from './zbe-ui.ts';

export interface VisibleMapCitiesOptions {
  /** Si es false, las ciudades con la ZBE en tramitación se ocultan. */
  showInProgress: boolean;
  /** Ciudad elegida en el selector: se muestra aunque esté en tramitación. */
  selectedCityId: string | null;
}

/** Ciudades que debe pintar el mapa de la portada según el conmutador de ZBE en tramitación. */
export function visibleMapCities<T extends { cityId: string; zbeStatus: string }>(
  cities: readonly T[],
  options: VisibleMapCitiesOptions
): T[] {
  return cities.filter(
    (city) => options.showInProgress || !isZbeInProgress(city) || city.cityId === options.selectedCityId
  );
}
