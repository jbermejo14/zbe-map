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

/** Punto [lat, lng]. */
export type MarkerPoint = [number, number];

/** Mínimo de vértices para que un anillo encierre un área. */
const MARKER_MIN_POLYGON_VERTICES = 3;
/** El 6 sale de la fórmula del centroide: C = suma((a + b) * cruce) / (6 * área). */
const MARKER_CENTROID_AREA_FACTOR = 6;
/** El área del polígono es la mitad de la suma de cruces del shoelace. */
const MARKER_AREA_DIVISOR = 2;
/** Los cortes de una horizontal con el anillo se agrupan de dos en dos: entra y sale. */
const MARKER_CROSSING_PAIR_STEP = 2;
const MARKER_MIDPOINT_DIVISOR = 2;

function markerVertexMean(ring: readonly MarkerPoint[]): MarkerPoint {
  const lat = ring.reduce((sum, [pointLat]) => sum + pointLat, 0) / ring.length;
  const lng = ring.reduce((sum, [, pointLng]) => sum + pointLng, 0) / ring.length;
  return [lat, lng];
}

/** Centroide de área (shoelace) del anillo, o null si el área es 0. */
function markerAreaCentroid(ring: readonly MarkerPoint[]): MarkerPoint | null {
  let doubleArea = 0;
  let sumLat = 0;
  let sumLng = 0;
  ring.forEach(([lat, lng], index) => {
    const [nextLat, nextLng] = ring[(index + 1) % ring.length];
    const cross = lat * nextLng - nextLat * lng;
    doubleArea += cross;
    sumLat += (lat + nextLat) * cross;
    sumLng += (lng + nextLng) * cross;
  });
  if (doubleArea === 0) return null;
  const factor = MARKER_CENTROID_AREA_FACTOR * (doubleArea / MARKER_AREA_DIVISOR);
  return [sumLat / factor, sumLng / factor];
}

/** Longitudes donde el anillo corta la horizontal a la latitud dada, ordenadas. */
function markerCrossingsAtLat(lat: number, ring: readonly MarkerPoint[]): number[] {
  const crossings: number[] = [];
  ring.forEach(([lat1, lng1], index) => {
    const [lat2, lng2] = ring[(index + 1) % ring.length];
    if (lat1 > lat === lat2 > lat) return;
    crossings.push(lng1 + ((lat - lat1) * (lng2 - lng1)) / (lat2 - lat1));
  });
  return crossings.sort((a, b) => a - b);
}

/** Punto en polígono: es interior si hay un número impar de cortes a su derecha en su latitud. */
function markerIsInside(point: MarkerPoint, ring: readonly MarkerPoint[]): boolean {
  const [lat, lng] = point;
  const crossingsToTheRight = markerCrossingsAtLat(lat, ring).filter((crossingLng) => lng < crossingLng);
  return crossingsToTheRight.length % MARKER_CROSSING_PAIR_STEP === 1;
}

/** Punto medio del tramo interior más largo de la horizontal a esa latitud, o null si no hay cortes. */
function markerLongestInteriorMidpoint(lat: number, ring: readonly MarkerPoint[]): MarkerPoint | null {
  const crossings = markerCrossingsAtLat(lat, ring);
  let best: MarkerPoint | null = null;
  let bestLength = -1;
  for (let index = 0; index + 1 < crossings.length; index += MARKER_CROSSING_PAIR_STEP) {
    const length = crossings[index + 1] - crossings[index];
    if (length > bestLength) {
      bestLength = length;
      best = [lat, (crossings[index] + crossings[index + 1]) / MARKER_MIDPOINT_DIVISOR];
    }
  }
  return best;
}

/**
 * Posición [lat, lng] del marcador de una ciudad: el centroide de su perímetro si cae dentro;
 * si no (perímetro cóncavo), el medio del tramo interior más largo a la latitud del centroide;
 * si tampoco hay, la media de los vértices. Sin perímetro, `lat` y `lng` de la ciudad.
 */
export function perimeterMarkerPosition(city: {
  lat: number;
  lng: number;
  polygon?: readonly MarkerPoint[] | null;
}): MarkerPoint {
  const ring = city.polygon;
  if (!ring || ring.length < MARKER_MIN_POLYGON_VERTICES) return [city.lat, city.lng];
  const centroid = markerAreaCentroid(ring);
  if (!centroid) return markerVertexMean(ring);
  if (markerIsInside(centroid, ring)) return centroid;
  return markerLongestInteriorMidpoint(centroid[0], ring) ?? markerVertexMean(ring);
}
