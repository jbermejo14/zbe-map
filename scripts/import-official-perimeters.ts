/**
 * Importa los perímetros oficiales de Barcelona, Valencia, Zaragoza y Málaga
 * (data/official-perimeters/) y actualiza solo esos campos en data/zbe-cities.json.
 *
 * Uso: npm run perimeters:import
 * (node --experimental-sqlite --import tsx scripts/import-official-perimeters.ts)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { parseGpkgGeometry, ringAreaKm2, roundCoordinate, simplifyRing, utmToWgs84 } from '../lib/perimeter-geometry.ts';
import type { LngLatPoint } from '../lib/perimeter-geometry.ts';

// @types/node 20 no declara node:sqlite: se carga con require y se tipa lo mínimo usado.
interface SqliteDatabase {
  prepare(sql: string): { all(): unknown[] };
  close(): void;
}
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as {
  DatabaseSync: new (file: string, options: { readOnly: boolean }) => SqliteDatabase;
};

const SIMPLIFY_TOLERANCE_METERS = 5;
const MAX_VERTICES_PER_CITY = 800;
const MAX_TOLERANCE_METERS = 1000;
const TOLERANCE_GROWTH_FACTOR = 2;
const GEOJSON_POLYGON = 'Polygon';
const GEOJSON_MULTIPOLYGON = 'MultiPolygon';
const RETRIEVED_DATE = '2026-11-19';
const AREA_DECIMALS = 1;
const SOURCES_DIRECTORY = path.join(process.cwd(), 'data/official-perimeters');
const CITIES_FILE = path.join(process.cwd(), 'data/zbe-cities.json');
const JSON_INDENT = 2;
const MALAGA_GENERAL_TYPE = 1;
const MALAGA_PROTECTION_TYPE = 2;

type Polygon = LngLatPoint[][];
type FeatureProperties = Record<string, unknown>;

interface EntityDescription {
  name: string;
  isMain: boolean;
}

interface PerimeterSource {
  slug: string;
  file: string;
  format: 'geojson' | 'gpkg';
  utmZone?: number;
  gpkgTable?: string;
  perimeterName: string;
  sourceName: string;
  sourceUrl: string;
  expectedEntities: number;
  /** Si es true, al menos una entidad debe ser la principal según `describeEntity`. */
  requiresFlaggedMain?: boolean;
  /** Si ninguna entidad está marcada como principal, lo es la de mayor área. */
  describeEntity: (properties: FeatureProperties) => EntityDescription;
}

/** Registro de ciudad: solo se tipan los campos que lee el script; el resto se conserva tal cual. */
interface CityRecord {
  slug: string;
  summary: string;
  [field: string]: unknown;
}

interface RawEntity {
  properties: FeatureProperties;
  polygons: Polygon[];
}

interface Entity {
  name: string;
  isMain: boolean;
  polygons: Polygon[];
}

const MALAGA_PROTECTION_NAMES: Record<string, string> = {
  'CENTRO HISTORICO': 'Zona de especial protección: Centro Histórico',
  CAC: 'Zona de especial protección: CAC',
  SOHO: 'Zona de especial protección: Soho',
};

function describeFixed(name: string): (properties: FeatureProperties) => EntityDescription {
  return () => ({ name, isMain: true });
}

function describeZaragoza(properties: FeatureProperties): EntityDescription {
  const phase = String(properties.fase ?? '').trim();
  const phaseNumber = phase.replace('FASE', '').trim();
  return { name: `ZBE Zaragoza · Fase ${phaseNumber}`, isMain: false };
}

function describeMalaga(properties: FeatureProperties): EntityDescription {
  if (properties.TIPZBE === MALAGA_GENERAL_TYPE) return { name: 'ZBE de Málaga', isMain: true };
  const zoneName = String(properties.NOMZBE ?? '').trim();
  if (properties.TIPZBE !== MALAGA_PROTECTION_TYPE || !MALAGA_PROTECTION_NAMES[zoneName]) {
    throw new Error(`entidad inesperada (TIPZBE ${String(properties.TIPZBE)}, NOMZBE "${zoneName}")`);
  }
  return { name: MALAGA_PROTECTION_NAMES[zoneName], isMain: false };
}

const PERIMETER_SOURCES: PerimeterSource[] = [
  {
    slug: 'barcelona',
    file: 'barcelona.gpkg',
    format: 'gpkg',
    utmZone: 31,
    gpkgTable: '2023_Ambit_ZBE_Barcelona',
    perimeterName: 'ZBE Rondes de Barcelona',
    sourceName: 'Open Data BCN (Ajuntament de Barcelona)',
    sourceUrl: 'https://opendata-ajuntament.barcelona.cat/data/es/dataset/zbe-ambit',
    expectedEntities: 1,
    describeEntity: describeFixed('ZBE Rondes de Barcelona'),
  },
  {
    slug: 'valencia',
    file: 'valencia.geojson',
    format: 'geojson',
    perimeterName: 'ZBE de València',
    sourceName: 'Geoportal del Ajuntament de València',
    sourceUrl: 'https://geoportal.valencia.es/',
    expectedEntities: 1,
    describeEntity: describeFixed('ZBE de València'),
  },
  {
    slug: 'zaragoza',
    file: 'zaragoza.geojson',
    format: 'geojson',
    perimeterName: 'ZBE de Zaragoza (fases 1 y 2)',
    sourceName: 'IDEZar (Ayuntamiento de Zaragoza)',
    sourceUrl:
      'https://idezar-sig.zaragoza.es/servicios/geoserver/movilidad/wfs?service=WFS&version=2.0.0&request=GetCapabilities',
    expectedEntities: 2,
    describeEntity: describeZaragoza,
  },
  {
    slug: 'malaga',
    file: 'malaga.geojson',
    format: 'geojson',
    perimeterName: 'ZBE de Málaga',
    sourceName: 'Datos Abiertos del Ayuntamiento de Málaga',
    sourceUrl: 'https://datosabiertos.malaga.eu/dataset/sistema-de-informacion-cartografica-zona-bajas-emisiones',
    expectedEntities: 4,
    requiresFlaggedMain: true,
    describeEntity: describeMalaga,
  },
];

function toLngLatPolygon(rings: number[][][]): Polygon {
  return rings.map((ring) => ring.map(([lng, lat]): LngLatPoint => [lng, lat]));
}

interface GeoJsonFeature {
  properties?: FeatureProperties | null;
  geometry?: { type: string; coordinates: number[][][] | number[][][][] } | null;
}

function geoJsonFeaturePolygons(feature: GeoJsonFeature, filePath: string): number[][][][] {
  const geometry = feature.geometry;
  if (geometry?.type === GEOJSON_POLYGON) return [geometry.coordinates as number[][][]];
  if (geometry?.type === GEOJSON_MULTIPOLYGON) return geometry.coordinates as number[][][][];
  throw new Error(`geometría no admitida en ${path.basename(filePath)}: ${geometry?.type ?? 'ausente'}`);
}

function readGeoJsonEntities(filePath: string): RawEntity[] {
  const collection = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { features: GeoJsonFeature[] };
  return collection.features.map((feature) => ({
    properties: feature.properties ?? {},
    polygons: geoJsonFeaturePolygons(feature, filePath).map(toLngLatPolygon),
  }));
}

function projectPolygon(polygon: Polygon, zone: number): Polygon {
  return polygon.map((ring) =>
    ring.map(([easting, northing]): LngLatPoint => {
      const { lat, lng } = utmToWgs84(zone, easting, northing);
      return [lng, lat];
    }),
  );
}

function readGpkgEntities(source: PerimeterSource, filePath: string): RawEntity[] {
  const database = new DatabaseSync(filePath, { readOnly: true });
  try {
    const rows = database.prepare(`SELECT * FROM "${source.gpkgTable}"`).all() as FeatureProperties[];
    return rows.map((row) => {
      const { geom, ...properties } = row;
      const polygons = parseGpkgGeometry(geom as Uint8Array).map(toLngLatPolygon);
      return { properties, polygons: polygons.map((polygon) => projectPolygon(polygon, source.utmZone as number)) };
    });
  } finally {
    database.close();
  }
}

function readEntities(source: PerimeterSource): RawEntity[] {
  const filePath = path.join(SOURCES_DIRECTORY, source.file);
  if (!fs.existsSync(filePath)) throw new Error(`falta el fichero ${filePath}`);
  return source.format === 'gpkg' ? readGpkgEntities(source, filePath) : readGeoJsonEntities(filePath);
}

function simplifyPolygons(polygons: Polygon[], tolerance: number): Polygon[] {
  return polygons.map((polygon) =>
    polygon.map((ring) =>
      simplifyRing(ring, tolerance).map(([lng, lat]): LngLatPoint => [roundCoordinate(lng), roundCoordinate(lat)]),
    ),
  );
}

function countVertices(entities: Entity[]): number {
  return entities.reduce(
    (total, entity) => total + entity.polygons.reduce((sum, polygon) => sum + polygon.flat().length, 0),
    0,
  );
}

function polygonAreaKm2(polygon: Polygon): number {
  const [outer, ...holes] = polygon;
  return ringAreaKm2(outer) - holes.reduce((sum, hole) => sum + ringAreaKm2(hole), 0);
}

function entityAreaKm2(entity: Entity): number {
  return entity.polygons.reduce((sum, polygon) => sum + polygonAreaKm2(polygon), 0);
}

function buildEntities(source: PerimeterSource, raw: RawEntity[], tolerance: number): Entity[] {
  return raw.map((rawEntity) => ({
    ...source.describeEntity(rawEntity.properties),
    polygons: simplifyPolygons(rawEntity.polygons, tolerance),
  }));
}

function simplifyUntilSmallEnough(source: PerimeterSource, raw: RawEntity[]) {
  let tolerance = SIMPLIFY_TOLERANCE_METERS;
  let entities = buildEntities(source, raw, tolerance);
  while (countVertices(entities) > MAX_VERTICES_PER_CITY) {
    if (tolerance * TOLERANCE_GROWTH_FACTOR > MAX_TOLERANCE_METERS) {
      throw new Error(`no se consigue bajar de ${MAX_VERTICES_PER_CITY} vértices con tolerancia de hasta ${tolerance} m`);
    }
    tolerance *= TOLERANCE_GROWTH_FACTOR;
    entities = buildEntities(source, raw, tolerance);
  }
  return { entities, tolerance };
}

function validateEntities(source: PerimeterSource, raw: RawEntity[]): void {
  if (raw.length !== source.expectedEntities) {
    throw new Error(`se esperaban ${source.expectedEntities} entidades y hay ${raw.length}`);
  }
  if (raw.some((entity) => entity.polygons.length === 0)) throw new Error('hay una entidad sin geometría');
  if (source.requiresFlaggedMain && !raw.some((entity) => source.describeEntity(entity.properties).isMain)) {
    throw new Error('ninguna entidad es la principal (en Málaga, TIPZBE 1)');
  }
}

function pickMainEntity(entities: Entity[]): Entity {
  const flagged = entities.find((entity) => entity.isMain);
  if (flagged) return flagged;
  return entities.reduce((largest, entity) => (entityAreaKm2(entity) > entityAreaKm2(largest) ? entity : largest));
}

function toGeoJsonFeature(entity: Entity, mainEntity: Entity, summary: string) {
  const isMain = entity === mainEntity;
  const geometry =
    entity.polygons.length === 1
      ? { type: 'Polygon', coordinates: entity.polygons[0] }
      : { type: 'MultiPolygon', coordinates: entity.polygons };
  return {
    type: 'Feature',
    properties: { nombre: entity.name, descripcion: isMain ? summary : entity.name },
    geometry,
  };
}

function largestOuterRingAsLatLng(entity: Entity): [number, number][] {
  const largest = entity.polygons.reduce((best, polygon) =>
    ringAreaKm2(polygon[0]) > ringAreaKm2(best[0]) ? polygon : best,
  );
  return largest[0].map(([lng, lat]): [number, number] => [lat, lng]);
}

function applySourceToCity(city: CityRecord, source: PerimeterSource, entities: Entity[]): void {
  const mainEntity = pickMainEntity(entities);
  city.geoJSON = {
    type: 'FeatureCollection',
    features: entities.map((entity) => toGeoJsonFeature(entity, mainEntity, city.summary)),
  };
  city.polygon = largestOuterRingAsLatLng(mainEntity);
  city.areaKm2 = Number(entityAreaKm2(mainEntity).toFixed(AREA_DECIMALS));
  city.perimeterName = source.perimeterName;
  city.perimeterSource = { name: source.sourceName, url: source.sourceUrl, retrieved: RETRIEVED_DATE };
}

function importCity(cities: CityRecord[], source: PerimeterSource): void {
  try {
    const city = cities.find((candidate) => candidate.slug === source.slug);
    if (!city) throw new Error('la ciudad no está en data/zbe-cities.json');
    const raw = readEntities(source);
    validateEntities(source, raw);
    const { entities, tolerance } = simplifyUntilSmallEnough(source, raw);
    applySourceToCity(city, source, entities);
    console.log(
      `${source.slug}: tolerancia ${tolerance} m, ${countVertices(entities)} vértices, ${city.areaKm2} km², ${entities.length} entidades`,
    );
  } catch (error) {
    throw new Error(`Perímetro de ${source.slug}: ${(error as Error).message}`);
  }
}

function main(): void {
  const cities = JSON.parse(fs.readFileSync(CITIES_FILE, 'utf8')) as CityRecord[];
  for (const source of PERIMETER_SOURCES) importCity(cities, source);
  fs.writeFileSync(CITIES_FILE, JSON.stringify(cities, null, JSON_INDENT));
}

main();
