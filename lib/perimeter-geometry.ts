/**
 * Geometría para importar perímetros oficiales: proyección UTM inversa,
 * lectura de GeoPackage, simplificación y área de anillos.
 * Funciones puras, sin dependencias.
 */

export type LngLatPoint = [number, number];

const GRS80_SEMI_MAJOR_AXIS = 6378137;
const GRS80_INVERSE_FLATTENING = 298.257222101;
const UTM_SCALE_FACTOR = 0.9996;
const UTM_FALSE_EASTING = 500000;
const UTM_ZONE_WIDTH_DEGREES = 6;
const UTM_ZONE_COUNT = 60;
const UTM_FIRST_ZONE_CENTRAL_MERIDIAN = -177;
const RADIANS_PER_DEGREE = Math.PI / 180;
const DEGREES_PER_RADIAN = 1 / RADIANS_PER_DEGREE;

const EARTH_RADIUS_METERS = 6371008.8;
const METERS_PER_DEGREE_LATITUDE = EARTH_RADIUS_METERS * RADIANS_PER_DEGREE;
const SQUARE_METERS_PER_SQUARE_KILOMETER = 1e6;
const COORDINATE_DECIMALS = 6;
const COORDINATE_FACTOR = 10 ** COORDINATE_DECIMALS;
const MIN_CLOSED_RING_POINTS = 4;

const GPKG_MAGIC = 'GP';
const GPKG_HEADER_FIXED_BYTES = 8;
const GPKG_FLAG_ENVELOPE_SHIFT = 1;
const GPKG_FLAG_ENVELOPE_MASK = 0x07;
const GPKG_FLAG_EMPTY = 0x10;
const GPKG_ENVELOPE_BYTES = [0, 32, 48, 48, 64];

const WKB_POLYGON = 3;
const WKB_MULTIPOLYGON = 6;
const WKB_ISO_THOUSANDS = 1000;
const WKB_EXTENDED_MASK = 0x1fffffff;
const WKB_EWKB_Z_FLAG = 0x80000000;
const WKB_EWKB_M_FLAG = 0x40000000;
const WKB_ISO_Z_VARIANTS = [1, 3];
const WKB_ISO_M_VARIANTS = [2, 3];
const WKB_XY_DIMENSIONS = 2;
const WKB_LITTLE_ENDIAN_FLAG = 1;
const WKB_UINT32_BYTES = 4;
const WKB_DOUBLE_BYTES = 8;

/** Proyección UTM inversa (hemisferio norte, GRS80). Devuelve grados. */
export function utmToWgs84(zone: number, easting: number, northing: number): { lat: number; lng: number } {
  const flattening = 1 / GRS80_INVERSE_FLATTENING;
  const e2 = flattening * (2 - flattening);
  const ePrime2 = e2 / (1 - e2);
  const meridianArc = northing / UTM_SCALE_FACTOR;
  const mu =
    meridianArc /
    (GRS80_SEMI_MAJOR_AXIS * (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256));
  const sqrtTerm = Math.sqrt(1 - e2);
  const e1 = (1 - sqrtTerm) / (1 + sqrtTerm);

  const footprintLat =
    mu +
    ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);

  const sinLat = Math.sin(footprintLat);
  const cosLat = Math.cos(footprintLat);
  const tanLat = Math.tan(footprintLat);
  const c1 = ePrime2 * cosLat ** 2;
  const t1 = tanLat ** 2;
  const denominator = 1 - e2 * sinLat ** 2;
  const n1 = GRS80_SEMI_MAJOR_AXIS / Math.sqrt(denominator);
  const r1 = (GRS80_SEMI_MAJOR_AXIS * (1 - e2)) / denominator ** 1.5;
  const d = (easting - UTM_FALSE_EASTING) / (n1 * UTM_SCALE_FACTOR);

  const latitude =
    footprintLat -
    ((n1 * tanLat) / r1) *
      (d ** 2 / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * ePrime2) * d ** 4) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 252 * ePrime2 - 3 * c1 ** 2) * d ** 6) / 720);
  const longitudeOffset =
    (d -
      ((1 + 2 * t1 + c1) * d ** 3) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * ePrime2 + 24 * t1 ** 2) * d ** 5) / 120) /
    cosLat;

  const centralMeridian = UTM_FIRST_ZONE_CENTRAL_MERIDIAN + UTM_ZONE_WIDTH_DEGREES * ((zone - 1) % UTM_ZONE_COUNT);
  return {
    lat: latitude * DEGREES_PER_RADIAN,
    lng: centralMeridian + longitudeOffset * DEGREES_PER_RADIAN,
  };
}

/** Redondea una coordenada a 6 decimales. */
export function roundCoordinate(value: number): number {
  return Math.round(value * COORDINATE_FACTOR) / COORDINATE_FACTOR;
}

/** Área geodésica aproximada (km², valor absoluto) de un anillo [lng, lat], con la fórmula esférica de Leaflet/Turf. */
export function ringAreaKm2(ring: LngLatPoint[]): number {
  let sum = 0;
  for (let index = 0; index < ring.length; index++) {
    const [lng1, lat1] = ring[index];
    const [lng2, lat2] = ring[(index + 1) % ring.length];
    const deltaLng = (lng2 - lng1) * RADIANS_PER_DEGREE;
    sum += deltaLng * (2 + Math.sin(lat1 * RADIANS_PER_DEGREE) + Math.sin(lat2 * RADIANS_PER_DEGREE));
  }
  const squareMeters = (Math.abs(sum) * EARTH_RADIUS_METERS ** 2) / 2;
  return squareMeters / SQUARE_METERS_PER_SQUARE_KILOMETER;
}

function perimeterToMeters(ring: LngLatPoint[]): LngLatPoint[] {
  const [originLng, originLat] = ring[0];
  const lngScale = Math.cos(originLat * RADIANS_PER_DEGREE);
  return ring.map(([lng, lat]) => [
    (lng - originLng) * lngScale * METERS_PER_DEGREE_LATITUDE,
    (lat - originLat) * METERS_PER_DEGREE_LATITUDE,
  ]);
}

function distanceToSegment(point: LngLatPoint, start: LngLatPoint, end: LngLatPoint): number {
  const [dx, dy] = [end[0] - start[0], end[1] - start[1]];
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSquared));
  return Math.hypot(point[0] - (start[0] + t * dx), point[1] - (start[1] + t * dy));
}

function markDouglasPeuckerKeeps(points: LngLatPoint[], tolerance: number): boolean[] {
  const keep = points.map(() => false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const pending: [number, number][] = [[0, points.length - 1]];
  while (pending.length > 0) {
    const [first, last] = pending.pop() as [number, number];
    let farthestIndex = -1;
    let farthestDistance = tolerance;
    for (let index = first + 1; index < last; index++) {
      const distance = distanceToSegment(points[index], points[first], points[last]);
      if (distance > farthestDistance) {
        farthestDistance = distance;
        farthestIndex = index;
      }
    }
    if (farthestIndex >= 0) {
      keep[farthestIndex] = true;
      pending.push([first, farthestIndex], [farthestIndex, last]);
    }
  }
  return keep;
}

/**
 * Douglas-Peucker sobre un anillo cerrado [lng, lat], con tolerancia en metros.
 * Conserva el cierre y nunca devuelve menos de 4 puntos (si no es posible, devuelve el anillo original).
 */
export function simplifyRing(ring: LngLatPoint[], toleranceMeters: number): LngLatPoint[] {
  if (ring.length <= MIN_CLOSED_RING_POINTS) return ring;
  const keep = markDouglasPeuckerKeeps(perimeterToMeters(ring), toleranceMeters);
  const simplified = ring.filter((_, index) => keep[index]);
  return simplified.length >= MIN_CLOSED_RING_POINTS ? simplified : ring;
}

interface WkbCursor {
  view: DataView;
  offset: number;
}

function readByteOrder(cursor: WkbCursor): boolean {
  const littleEndian = cursor.view.getUint8(cursor.offset) === WKB_LITTLE_ENDIAN_FLAG;
  cursor.offset += 1;
  return littleEndian;
}

function readUint32(cursor: WkbCursor, littleEndian: boolean): number {
  const value = cursor.view.getUint32(cursor.offset, littleEndian);
  cursor.offset += WKB_UINT32_BYTES;
  return value;
}

function readDouble(cursor: WkbCursor, littleEndian: boolean): number {
  const value = cursor.view.getFloat64(cursor.offset, littleEndian);
  cursor.offset += WKB_DOUBLE_BYTES;
  return value;
}

function describeWkbType(rawType: number): { base: number; dimensions: number } {
  const masked = rawType & WKB_EXTENDED_MASK;
  const isoVariant = Math.floor(masked / WKB_ISO_THOUSANDS);
  const hasZ = WKB_ISO_Z_VARIANTS.includes(isoVariant) || (rawType & WKB_EWKB_Z_FLAG) !== 0;
  const hasM = WKB_ISO_M_VARIANTS.includes(isoVariant) || (rawType & WKB_EWKB_M_FLAG) !== 0;
  return { base: masked % WKB_ISO_THOUSANDS, dimensions: WKB_XY_DIMENSIONS + (hasZ ? 1 : 0) + (hasM ? 1 : 0) };
}

function readWkbRing(cursor: WkbCursor, littleEndian: boolean, dimensions: number): number[][] {
  const pointCount = readUint32(cursor, littleEndian);
  const ring: number[][] = [];
  for (let index = 0; index < pointCount; index++) {
    const x = readDouble(cursor, littleEndian);
    const y = readDouble(cursor, littleEndian);
    cursor.offset += (dimensions - WKB_XY_DIMENSIONS) * WKB_DOUBLE_BYTES;
    ring.push([x, y]);
  }
  return ring;
}

function readWkbPolygonBody(cursor: WkbCursor, littleEndian: boolean, dimensions: number): number[][][] {
  const ringCount = readUint32(cursor, littleEndian);
  const rings: number[][][] = [];
  for (let index = 0; index < ringCount; index++) {
    rings.push(readWkbRing(cursor, littleEndian, dimensions));
  }
  return rings;
}

function readWkbGeometry(cursor: WkbCursor): number[][][][] {
  const littleEndian = readByteOrder(cursor);
  const { base, dimensions } = describeWkbType(readUint32(cursor, littleEndian));
  if (base === WKB_POLYGON) return [readWkbPolygonBody(cursor, littleEndian, dimensions)];
  if (base === WKB_MULTIPOLYGON) {
    const polygonCount = readUint32(cursor, littleEndian);
    const polygons: number[][][][] = [];
    for (let index = 0; index < polygonCount; index++) {
      polygons.push(...readWkbGeometry(cursor));
    }
    return polygons;
  }
  throw new Error(`Tipo de geometría WKB no admitido: ${base} (solo Polygon=3 y MultiPolygon=6)`);
}

function gpkgHeaderLength(flags: number): number {
  const envelopeIndicator = (flags >> GPKG_FLAG_ENVELOPE_SHIFT) & GPKG_FLAG_ENVELOPE_MASK;
  const envelopeBytes = GPKG_ENVELOPE_BYTES[envelopeIndicator];
  if (envelopeBytes === undefined) {
    throw new Error(`Indicador de envoltura GeoPackage no válido: ${envelopeIndicator}`);
  }
  return GPKG_HEADER_FIXED_BYTES + envelopeBytes;
}

/**
 * Lee una geometría GeoPackage (cabecera "GP" + WKB) y devuelve una lista de polígonos,
 * cada uno como lista de anillos [x, y][]. Lanza Error si la cabecera o el tipo no son válidos.
 */
export function parseGpkgGeometry(blob: Uint8Array): number[][][][] {
  if (blob.length < GPKG_HEADER_FIXED_BYTES) {
    throw new Error(`Cabecera GeoPackage truncada: ${blob.length} bytes, se necesitan al menos ${GPKG_HEADER_FIXED_BYTES}`);
  }
  const magic = String.fromCharCode(blob[0], blob[1]);
  if (magic !== GPKG_MAGIC) {
    throw new Error(`Cabecera GeoPackage no válida: se esperaba "${GPKG_MAGIC}" y se encontró "${magic}"`);
  }
  const flags = blob[3];
  if ((flags & GPKG_FLAG_EMPTY) !== 0) return [];
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
  const cursor: WkbCursor = { view, offset: gpkgHeaderLength(flags) };
  try {
    return readWkbGeometry(cursor);
  } catch (error) {
    // DataView lanza RangeError al leer más allá del final: se traduce a un mensaje comprensible.
    if (error instanceof RangeError) throw new Error('geometría GeoPackage truncada');
    throw error;
  }
}
