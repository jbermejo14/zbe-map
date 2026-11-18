/**
 * Geolocalización: distancia entre puntos, ZBE más cercana y mensajes de error del navegador.
 * Funciones puras: la ubicación del usuario no se guarda ni se envía a ningún sitio.
 */

/** Tiempo máximo de espera de `getCurrentPosition`, en milisegundos. */
export const TIEMPO_ESPERA_UBICACION_MS = 10000;

const EARTH_RADIUS_KM = 6371;
const DEGREES_PER_HALF_TURN = 180;
const DISTANCE_DECIMALS_BELOW_KM = 10;

/** Códigos de GeolocationPositionError (no existen como constantes fuera del navegador). */
export const GEOLOCATION_PERMISSION_DENIED = 1;
export const GEOLOCATION_POSITION_UNAVAILABLE = 2;
export const GEOLOCATION_TIMEOUT = 3;

export const GEOLOCATION_UNSUPPORTED_MESSAGE =
  'Tu navegador no permite obtener la ubicación. Busca tu ciudad en el mapa o en el selector de ciudades.';

const GEOLOCATION_ERROR_MESSAGES: Record<number, string> = {
  [GEOLOCATION_PERMISSION_DENIED]:
    'No has dado permiso para usar tu ubicación. Permítelo en los ajustes del sitio de tu navegador y pulsa «Mi ubicación» de nuevo, o busca tu ciudad en el mapa.',
  [GEOLOCATION_POSITION_UNAVAILABLE]:
    'No se ha podido determinar tu ubicación. Comprueba que el GPS o la conexión estén activos y vuelve a intentarlo.',
  [GEOLOCATION_TIMEOUT]:
    'Se agotó el tiempo de espera al buscar tu ubicación. Vuelve a pulsar «Mi ubicación» o busca tu ciudad en el mapa.',
};

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface NearestZbe<T extends GeoPoint> {
  city: T;
  distanceKm: number;
}

function geoToRadians(degrees: number): number {
  return (degrees * Math.PI) / DEGREES_PER_HALF_TURN;
}

/** Distancia en kilómetros sobre la esfera terrestre (fórmula de Haversine). */
export function haversineKm(from: GeoPoint, to: GeoPoint): number {
  const deltaLat = geoToRadians(to.lat - from.lat);
  const deltaLng = geoToRadians(to.lng - from.lng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(geoToRadians(from.lat)) * Math.cos(geoToRadians(to.lat)) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Ciudad cuyo centro está más cerca del punto dado, o null si la lista está vacía. */
export function nearestZbe<T extends GeoPoint>(
  lat: number,
  lng: number,
  ciudades: readonly T[]
): NearestZbe<T> | null {
  let nearest: NearestZbe<T> | null = null;
  for (const city of ciudades) {
    const distanceKm = haversineKm({ lat, lng }, city);
    if (nearest === null || distanceKm < nearest.distanceKm) nearest = { city, distanceKm };
  }
  return nearest;
}

/** Distancia legible: un decimal por debajo de 10 km y entera a partir de ahí. */
export function formatDistanceKm(distanceKm: number): string {
  const text =
    distanceKm < DISTANCE_DECIMALS_BELOW_KM ? distanceKm.toFixed(1) : String(Math.round(distanceKm));
  return text.replace('.', ',');
}

/** Texto para el usuario según el código de error de la geolocalización: qué pasó y qué hacer. */
export function geolocationErrorMessage(code: number): string {
  return GEOLOCATION_ERROR_MESSAGES[code] ?? GEOLOCATION_ERROR_MESSAGES[GEOLOCATION_POSITION_UNAVAILABLE];
}
