/**
 * Configuración de las teselas del mapa. Sin CARTO: sus basemaps exigen ahora clave de API
 * y devuelven teselas de aviso. OpenStreetMap se usa en los dos temas.
 */

export type MapLayerType = 'osm' | 'sat';

export interface MapTileSource {
  label: string;
  title: string;
  url: string;
  attribution: string;
  maxZoom: number;
  /** Solo las teselas con {s} en la URL necesitan subdominios. */
  subdomains?: string;
}

const MAP_OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const MAP_TILE_SOURCES: Record<MapLayerType, MapTileSource> = {
  osm: {
    label: 'OSM',
    title: 'Capa OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: MAP_OSM_ATTRIBUTION,
    maxZoom: 19,
    subdomains: 'abc',
  },
  sat: {
    label: 'Satélite',
    title: 'Fotografía satélite',
    url: 'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Fuente: Esri, Maxar, Earthstar Geographics and the GIS User Community',
    maxZoom: 18,
  },
};

/** Capa inicial del mapa, igual en claro y oscuro. */
export const MAP_DEFAULT_LAYER: MapLayerType = 'osm';

/** Opciones de `L.tileLayer` para una capa; no pasa `subdomains` si la capa no lo usa. */
export function getTileLayerOptions(layer: MapLayerType) {
  const source = MAP_TILE_SOURCES[layer];
  return {
    attribution: source.attribution,
    maxZoom: source.maxZoom,
    ...(source.subdomains ? { subdomains: source.subdomains } : {}),
  };
}
