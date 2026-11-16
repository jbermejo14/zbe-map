/**
 * Configuración de las teselas del mapa. Se lee de variables de entorno públicas
 * (documentadas en .env.example); los valores por defecto son los basemaps de CARTO,
 * que no requieren clave.
 */

export const MAP_DEFAULT_TILE_URL_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
export const MAP_DEFAULT_TILE_URL_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
export const MAP_DEFAULT_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
export const MAP_TILE_SUBDOMAINS = 'abcd';
export const MAP_TILE_MAX_ZOOM = 19;

export interface MapTileConfig {
  lightUrl: string;
  darkUrl: string;
  attribution: string;
}

/** Devuelve la configuración de teselas, usando los valores por defecto si la variable está vacía. */
export function getMapTileConfig(): MapTileConfig {
  // Next solo sustituye NEXT_PUBLIC_* si se referencian con nombre literal.
  return {
    lightUrl: process.env.NEXT_PUBLIC_MAP_TILE_URL_LIGHT || MAP_DEFAULT_TILE_URL_LIGHT,
    darkUrl: process.env.NEXT_PUBLIC_MAP_TILE_URL_DARK || MAP_DEFAULT_TILE_URL_DARK,
    attribution: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || MAP_DEFAULT_ATTRIBUTION,
  };
}
