/**
 * Detección de perímetros sintéticos (no reales) en el dataset de ZBE.
 * Se usa en las pruebas y en el script de auditoría de datos.
 */

export type LatLngPoint = [number, number];

/** Mínimo de vértices para considerar que un polígono tiene forma analizable. */
const POLYGON_QUALITY_MIN_VERTICES = 5;
/** Coeficiente de variación máximo de la distancia al centroide para considerarlo regular. */
const POLYGON_QUALITY_MAX_REGULAR_CV = 0.05;
/** Metros por grado de latitud. */
const POLYGON_QUALITY_METERS_PER_DEGREE = 111320;
/** Redondeo (m) de la firma de forma para detectar plantillas copiadas entre ciudades. */
const POLYGON_QUALITY_SIGNATURE_STEP_METERS = 100;

/** Convierte el campo polygon (array o JSON en texto) en una lista de puntos [lat, lng]. */
export function parsePolygonPoints(polygon: unknown): LatLngPoint[] {
  if (!polygon) return [];
  if (typeof polygon === 'string') {
    try {
      return parsePolygonPoints(JSON.parse(polygon));
    } catch {
      // Texto no JSON: se trata como polígono ausente.
      return [];
    }
  }
  return Array.isArray(polygon) ? (polygon as LatLngPoint[]) : [];
}

/** Coeficiente de variación de la distancia de los vértices a su centroide (0 = polígono regular perfecto). */
function polygonRadiusVariation(points: LatLngPoint[]): number {
  const centerLat = points.reduce((sum, [lat]) => sum + lat, 0) / points.length;
  const centerLng = points.reduce((sum, [, lng]) => sum + lng, 0) / points.length;
  const lngScale = Math.cos((centerLat * Math.PI) / 180);
  const distances = points.map(([lat, lng]) => Math.hypot(lat - centerLat, (lng - centerLng) * lngScale));
  const mean = distances.reduce((sum, d) => sum + d, 0) / distances.length;
  const variance = distances.reduce((sum, d) => sum + (d - mean) ** 2, 0) / distances.length;
  return Math.sqrt(variance) / mean;
}

/** Indica si casi todos los vértices están a la misma distancia de su centroide (polígono generado). */
export function isRegularPolygon(points: LatLngPoint[]): boolean {
  if (points.length < POLYGON_QUALITY_MIN_VERTICES) return false;
  return polygonRadiusVariation(points) < POLYGON_QUALITY_MAX_REGULAR_CV;
}

/**
 * Firma de forma en metros, independiente de la posición: dos ciudades con la misma
 * firma comparten una plantilla copiada, no un perímetro real.
 */
export function polygonShapeSignature(points: LatLngPoint[]): string {
  if (points.length === 0) return '';
  const [originLat, originLng] = points[0];
  const lngScale = Math.cos((originLat * Math.PI) / 180);
  return points
    .map(([lat, lng]) => {
      const north = (lat - originLat) * POLYGON_QUALITY_METERS_PER_DEGREE;
      const east = (lng - originLng) * POLYGON_QUALITY_METERS_PER_DEGREE * lngScale;
      const step = POLYGON_QUALITY_SIGNATURE_STEP_METERS;
      return `${Math.round(north / step)},${Math.round(east / step)}`;
    })
    .join(';');
}

interface PolygonQualityCity {
  slug: string;
  polygon?: unknown;
}

/** Devuelve los slugs cuyo polígono es regular o copia la forma de otra ciudad. */
export function findSyntheticPolygonSlugs(cities: PolygonQualityCity[]): string[] {
  const slugsBySignature = new Map<string, string[]>();
  const synthetic = new Set<string>();

  for (const city of cities) {
    const points = parsePolygonPoints(city.polygon);
    if (points.length === 0) continue;
    if (isRegularPolygon(points)) synthetic.add(city.slug);
    const signature = polygonShapeSignature(points);
    slugsBySignature.set(signature, [...(slugsBySignature.get(signature) ?? []), city.slug]);
  }

  for (const slugs of slugsBySignature.values()) {
    if (slugs.length > 1) slugs.forEach((slug) => synthetic.add(slug));
  }
  return [...synthetic];
}
