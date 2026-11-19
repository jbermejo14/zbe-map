/**
 * Importa el estado real de cada ZBE desde la copia local de Atlas ZBE (data/atlaszbe/)
 * y lo escribe en data/zbe-cities.json conservando su formato.
 *
 * Uso: npx tsx scripts/import-atlaszbe.ts [--fecha AAAA-MM-DD]
 * (npm run atlaszbe:import).
 *
 * Después hay que ejecutar npm run perimeters:import. Este script no toca la geometría de Barcelona,
 * Valencia, Zaragoza y Málaga (la oficial viene de data/official-perimeters/), pero sí reescribe su
 * `summary`. perimeters:import usa ese `summary` como `descripcion` del GeoJSON de esas cuatro ciudades:
 * si se ejecuta antes, esa descripción conserva el resumen antiguo.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  ATLAS_INE_OVERRIDES,
  badgeAccessFromAtlas,
  calendarEntries,
  cityEnforcementZone,
  enforcementSummary,
  exemptionsFromZone,
  groupedRuleTexts,
  inventorySummary,
  isRuleActive,
  matchCityToMunicipality,
  NO_RESTRICTIONS_SCHEDULE_TEXT,
  pickMainZone,
  scheduleText,
  zonesSummary,
} from '../lib/atlas-zbe.ts';
import type { AtlasMunicipality, AtlasRule, AtlasZone, EnforcementState } from '../lib/atlas-zbe.ts';
import {
  OFFICIAL_PERIMETER_SLUGS,
  polygonAreaKm2,
  ringAreaKm2,
  simplifyPolygons,
  simplifyUntilSmallEnough,
} from '../lib/perimeter-geometry.ts';
import type { LngLatPoint, LngLatPolygon } from '../lib/perimeter-geometry.ts';
import type {
  AtlasEnforcement,
  CityData,
  CityEnforcement,
  CityRule,
  MitecoEnforcement,
  PerimeterPrecision,
} from '../lib/cities-repository.ts';
import type { DgtBadgeType, ZbeAccessStatus } from '../lib/zbe-engine.ts';

const DATA_DIRECTORY = path.join(process.cwd(), 'data');
const ZONES_FILE = path.join(DATA_DIRECTORY, 'atlaszbe/zonas.json');
const MUNICIPALITIES_FILE = path.join(DATA_DIRECTORY, 'atlaszbe/municipios.json');
const CITIES_FILE = path.join(DATA_DIRECTORY, 'zbe-cities.json');
const JSON_INDENT = 2;
const DATE_ARGUMENT = '--fecha';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_LENGTH = 10;
const MAX_VERIFICATION_AGE_DAYS = 120;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const AREA_DECIMALS = 1;
const MAX_REASON_RULES = 2;
const BADGES: DgtBadgeType[] = ['CERO', 'ECO', 'C', 'B', 'SIN_ETIQUETA'];
const ALWAYS_ALLOWED_STATES: EnforcementState[] = ['solo_episodios', 'suspendida', 'sin_restricciones'];
const STATUS_BY_STATE: Partial<Record<EnforcementState, CityData['status']>> = {
  sanciona: 'activa',
  aviso: 'activa',
  solo_episodios: 'activa',
  aprobada_sin_aplicar: 'en_tramitacion',
  suspendida: 'suspendida',
  sin_restricciones: 'suspendida',
};
const NO_RESTRICTIONS_REASON = 'No hay restricciones en vigor para esta etiqueta.';
const ATLAS_HOME_URL = 'https://atlaszbe.es';
const ATLAS_GEOMETRY_SOURCE_NAMES: Record<PerimeterPrecision, string> = {
  oficial: 'Atlas ZBE (geometría oficial)',
  aproximada: 'Atlas ZBE (contorno de la DGT)',
};
const MITECO_SOURCE_NAME = 'Inventario de ZBE del MITECO (vía Atlas ZBE)';
const INVENTORY_STATES = ['en_tramite', 'pendiente'];

/** Zona principal (geometría, multa y nombre) y zona que decide el estado de aplicación de la ciudad. */
interface ZonesByRole {
  mainZone: AtlasZone;
  stateZone: AtlasZone;
}

interface AtlasData {
  zones: AtlasZone[];
  municipalities: AtlasMunicipality[];
}

function readJson<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) throw new Error(`falta el fichero ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function readAtlasData(): AtlasData {
  const zones = readJson<{ zonas: AtlasZone[] }>(ZONES_FILE).zonas;
  const municipalities = readJson<{ municipios: AtlasMunicipality[] }>(MUNICIPALITIES_FILE).municipios;
  return { zones, municipalities };
}

/** Comprueba el formato y que el día exista (rechaza, por ejemplo, 2026-02-30). */
function isRealIsoDate(value: string): boolean {
  const parsed = Date.parse(value);
  return ISO_DATE.test(value) && !Number.isNaN(parsed) && new Date(parsed).toISOString().slice(0, ISO_DATE_LENGTH) === value;
}

function parseImportDate(args: string[]): string {
  const index = args.indexOf(DATE_ARGUMENT);
  if (index < 0) return new Date().toISOString().slice(0, 10);
  const value = args[index + 1];
  if (!value || !isRealIsoDate(value)) {
    throw new Error(`${DATE_ARGUMENT} necesita una fecha AAAA-MM-DD que exista y se recibió "${value}"`);
  }
  return value;
}

function validateOverrides(municipalities: AtlasMunicipality[]): void {
  for (const [slug, ine] of Object.entries(ATLAS_INE_OVERRIDES)) {
    if (!municipalities.some((municipality) => municipality.ine === ine)) {
      throw new Error(`el override de ${slug} apunta a un INE inexistente: ${ine}`);
    }
  }
}

function daysBetween(fromIsoDate: string, toIsoDate: string): number {
  return (Date.parse(toIsoDate) - Date.parse(fromIsoDate)) / MILLISECONDS_PER_DAY;
}

function applyVerification(city: CityData, verifiedDate: string | null | undefined, isTrusted: boolean, importedOn: string): void {
  const age = verifiedDate ? daysBetween(verifiedDate, importedOn) : Number.NaN;
  const isRecent = age >= 0 && age < MAX_VERIFICATION_AGE_DAYS;
  const verified = isTrusted && isRecent;
  city.verificationStatus = verified ? 'verified' : 'pending';
  city.lastVerified = verified ? (verifiedDate as string) : null;
}

function reasonFromRules(rules: AtlasRule[], city: CityData, zones: AtlasZone[]): string {
  return groupedRuleTexts(rules, zones, city.name).slice(0, MAX_REASON_RULES).join(' ');
}

function buildAtlasRule(
  badge: DgtBadgeType,
  city: CityData,
  zones: AtlasZone[],
  zonesByRole: ZonesByRole,
  importedOn: string,
): CityRule {
  const { mainZone, stateZone } = zonesByRole;
  const state = stateZone.estadoSancion;
  const decided = badgeAccessFromAtlas(badge, zones, mainZone, importedOn);
  const status: ZbeAccessStatus = ALWAYS_ALLOWED_STATES.includes(state) ? 'allowed' : decided.status;
  if (status !== 'allowed') return { status, reason: reasonFromRules(decided.rules, city, zones) };
  const isPlainState = state === 'sanciona' || state === 'aviso';
  const stateSentence = isPlainState ? '' : ` ${enforcementSummary(stateZone).sentence}`;
  return { status, reason: `${NO_RESTRICTIONS_REASON}${stateSentence}` };
}

function buildAtlasRules(
  city: CityData,
  zones: AtlasZone[],
  zonesByRole: ZonesByRole,
  importedOn: string,
): Record<DgtBadgeType, CityRule> {
  const rules = {} as Record<DgtBadgeType, CityRule>;
  for (const badge of BADGES) rules[badge] = buildAtlasRule(badge, city, zones, zonesByRole, importedOn);
  return rules;
}

function buildAtlasEnforcement(
  zones: AtlasZone[],
  { mainZone, stateZone }: ZonesByRole,
  cityName: string,
  importedOn: string,
): AtlasEnforcement {
  return {
    source: 'atlaszbe',
    ...enforcementSummary(stateZone),
    finesFrom: stateZone.fechas.multasDesde,
    warningUntil: stateZone.fechas.avisosHasta,
    nextChange: stateZone.fechas.proximoCambio?.fecha ?? null,
    confidence: stateZone.confianza,
    verifiedOn: stateZone.verificadoEl ?? null,
    officialUrl: stateZone.urlOficial ?? null,
    earlyPaymentAmount: mainZone.editorial?.multa?.prontoPago ?? null,
    importedOn,
    mainZoneName: mainZone.nombre,
    calendar: calendarEntries(zones, stateZone, cityName),
  };
}

/** Horario de la primera regla en vigor que restringe alguna etiqueta, empezando por la zona del estado. */
function zoneSchedule(zones: AtlasZone[], { stateZone }: ZonesByRole, importedOn: string): string {
  if (ALWAYS_ALLOWED_STATES.includes(stateZone.estadoSancion)) return NO_RESTRICTIONS_SCHEDULE_TEXT;
  const ordered = [stateZone, ...zones.filter((zone) => zone !== stateZone)];
  const rule = ordered
    .flatMap((zone) => zone.reglas)
    .find((candidate) => isRuleActive(candidate, importedOn) && candidate.condicion === 'siempre' && candidate.etiquetas?.length !== 0);
  return rule ? scheduleText(rule.horario) : NO_RESTRICTIONS_SCHEDULE_TEXT;
}

function zonePolygons(zone: AtlasZone): LngLatPolygon[] {
  return zone.geometria.type === 'Polygon'
    ? [zone.geometria.coordinates as LngLatPolygon]
    : (zone.geometria.coordinates as LngLatPolygon[]);
}

function countVertices(zonePolygonLists: LngLatPolygon[][]): number {
  return zonePolygonLists.reduce(
    (total, polygons) => total + polygons.reduce((sum, polygon) => sum + polygon.flat().length, 0),
    0,
  );
}

function toGeoJsonFeature(zone: AtlasZone, polygons: LngLatPolygon[], description: string) {
  const geometry =
    polygons.length === 1
      ? { type: 'Polygon', coordinates: polygons[0] }
      : { type: 'MultiPolygon', coordinates: polygons };
  return { type: 'Feature', properties: { nombre: zone.nombre, descripcion: description }, geometry };
}

function largestOuterRingAsLatLng(polygons: LngLatPolygon[]): [number, number][] {
  const largest = polygons.reduce((best, polygon) => (ringAreaKm2(polygon[0]) > ringAreaKm2(best[0]) ? polygon : best));
  return largest[0].map(([lng, lat]: LngLatPoint): [number, number] => [lat, lng]);
}

function applyAtlasGeometry(city: CityData, zones: AtlasZone[], mainZone: AtlasZone, enforcement: AtlasEnforcement): void {
  const { result, tolerance } = simplifyUntilSmallEnough(
    (toleranceMeters) => zones.map((zone) => simplifyPolygons(zonePolygons(zone), toleranceMeters)),
    countVertices,
  );
  const mainPolygons = result[zones.indexOf(mainZone)];
  city.geoJSON = {
    type: 'FeatureCollection',
    features: zones.map((zone, index) => toGeoJsonFeature(zone, result[index], enforcement.sentence)),
  };
  city.polygon = largestOuterRingAsLatLng(mainPolygons);
  city.areaKm2 = Number(mainPolygons.reduce((sum, polygon) => sum + polygonAreaKm2(polygon), 0).toFixed(AREA_DECIMALS));
  city.perimeterName = mainZone.nombre;
  city.perimeterSource = {
    name: ATLAS_GEOMETRY_SOURCE_NAMES[mainZone.geometriaPrecision],
    url: mainZone.urlOficial ?? ATLAS_HOME_URL,
    retrieved: enforcement.importedOn,
    precision: mainZone.geometriaPrecision,
  };
  console.log(`${city.slug}: geometría Atlas ZBE, tolerancia ${tolerance} m, ${countVertices(result)} vértices`);
}

/** Sustituye los textos antiguos, que podían contradecir las reglas nuevas, por los derivados de Atlas ZBE. */
function applyDescriptiveTexts(city: CityData, zones: AtlasZone[], mainZone: AtlasZone, enforcement: AtlasEnforcement): void {
  city.noticePeriod = null;
  city.parkingCondition = null;
  city.summary = zonesSummary(city.name, zones, enforcement.sentence);
  city.exemptions = exemptionsFromZone(mainZone);
}

function applyAtlasSource(city: CityData, { mainZone, stateZone }: ZonesByRole, importedOn: string): void {
  city.sourceUrl = mainZone.urlOficial ?? ATLAS_HOME_URL;
  city.sourceName = `${mainZone.nombre} (fuente oficial, vía Atlas ZBE)`;
  applyVerification(city, stateZone.verificadoEl, stateZone.confianza === 'alta', importedOn);
}

/** Las calles antiguas no describen el polígono nuevo; las 4 ciudades de Z8 conservan su geometría oficial. */
function applyGeometryUnlessOfficial(city: CityData, zones: AtlasZone[], mainZone: AtlasZone, enforcement: AtlasEnforcement): void {
  if (!OFFICIAL_PERIMETER_SLUGS.includes(city.slug)) applyAtlasGeometry(city, zones, mainZone, enforcement);
  city.streets = null;
}

function importCityWithZones(city: CityData, zones: AtlasZone[], importedOn: string): void {
  const zonesByRole: ZonesByRole = { mainZone: pickMainZone(zones), stateZone: cityEnforcementZone(zones) };
  const { mainZone } = zonesByRole;
  const enforcement = buildAtlasEnforcement(zones, zonesByRole, city.name, importedOn);
  city.enforcement = enforcement;
  // La geometría no depende de las reglas: también se importa para las ZBE sin verificar.
  applyGeometryUnlessOfficial(city, zones, mainZone, enforcement);
  // Sin verificar no se sabe qué reglas rigen: se conservan reglas y textos anteriores.
  if (enforcement.state === 'sin_verificar') return;
  const mappedStatus = STATUS_BY_STATE[enforcement.state];
  if (mappedStatus) city.status = mappedStatus;
  city.rules = buildAtlasRules(city, zones, zonesByRole, importedOn);
  const fine = mainZone.editorial?.multa?.importe;
  if (fine !== null && fine !== undefined) city.fineAmount = fine;
  city.schedule = zoneSchedule(zones, zonesByRole, importedOn);
  applyAtlasSource(city, zonesByRole, importedOn);
  applyDescriptiveTexts(city, zones, mainZone, enforcement);
}

function importCityFromInventory(city: CityData, municipality: AtlasMunicipality, importedOn: string): void {
  const summary = inventorySummary(municipality, city.name);
  const enforcement: MitecoEnforcement = {
    source: 'miteco',
    ...summary,
    inventoryUpdated: municipality.inventarioActualizado,
    importedOn,
  };
  city.enforcement = enforcement;
  city.status = 'en_tramitacion';
  city.schedule = NO_RESTRICTIONS_SCHEDULE_TEXT;
  for (const badge of BADGES) city.rules[badge] = { status: 'allowed', reason: summary.sentence };
  city.polygon = null;
  city.geoJSON = null;
  city.areaKm2 = null;
  city.perimeterName = null;
  city.perimeterSource = null;
  city.streets = null;
  city.parkingCondition = null;
  city.exemptions = [];
  city.noticePeriod = null;
  city.summary = summary.sentence;
  city.sourceName = MITECO_SOURCE_NAME;
  city.sourceUrl = ATLAS_HOME_URL;
  applyVerification(city, municipality.inventarioActualizado, true, importedOn);
}

function importCity(city: CityData, data: AtlasData, importedOn: string): boolean {
  city.enforcement = null;
  const municipality = matchCityToMunicipality(city, data.municipalities, ATLAS_INE_OVERRIDES);
  if (!municipality) return false;
  if (municipality.zonas.length > 0) {
    const zones = municipality.zonas.map((id) => {
      const zone = data.zones.find((candidate) => candidate.id === id);
      if (!zone) throw new Error(`${city.slug}: la zona ${id} no está en zonas.json`);
      return zone;
    });
    importCityWithZones(city, zones, importedOn);
  } else if (INVENTORY_STATES.includes(municipality.estadoInventario)) {
    importCityFromInventory(city, municipality, importedOn);
  }
  return true;
}

function countBy(values: string[]): string {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].map(([key, count]) => `${key}=${count}`).join(', ');
}

function printReport(cities: CityData[], unmatched: string[]): void {
  const withEnforcement = cities.filter((city) => city.enforcement);
  console.log(`Ciudades con enforcement: ${withEnforcement.length} de ${cities.length}`);
  console.log(`Por estado: ${countBy(withEnforcement.map((city) => (city.enforcement as CityEnforcement).state))}`);
  console.log(`Por fuente: ${countBy(withEnforcement.map((city) => (city.enforcement as CityEnforcement).source))}`);
  for (const badge of BADGES) console.log(`Etiqueta ${badge}: ${countBy(withEnforcement.map((city) => city.rules[badge].status))}`);
  console.log(`Ciudades sin municipio: ${unmatched.join(', ')}`);
}

function main(): void {
  const importedOn = parseImportDate(process.argv.slice(2));
  const data = readAtlasData();
  validateOverrides(data.municipalities);
  const cities = readJson<CityData[]>(CITIES_FILE);
  const unmatched = cities.filter((city) => !importCity(city, data, importedOn)).map((city) => city.slug);
  printReport(cities, unmatched);
  fs.writeFileSync(CITIES_FILE, JSON.stringify(cities, null, JSON_INDENT));
}

main();
