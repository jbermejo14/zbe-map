import citiesJson from '../data/zbe-cities.json' with { type: 'json' };
import type { DgtBadgeType, ZbeAccessStatus, CityEvaluationResult } from './zbe-engine.ts';
import { evaluateCitiesForBadge } from './zbe-engine.ts';
import type { VerificationStatus } from './city-verification.ts';
import type { CalendarEntry, EnforcementState } from './atlas-zbe.ts';

export interface CityRule {
  status: ZbeAccessStatus;
  reason: string;
}

/** Estado de aplicación de la ZBE según Atlas ZBE (zona con reglas verificadas). */
export interface AtlasEnforcement {
  source: 'atlaszbe';
  state: EnforcementState;
  label: string;
  sentence: string;
  finesFrom: string | null;
  warningUntil: string | null;
  nextChange: string | null;
  confidence: 'alta' | 'media' | 'baja';
  verifiedOn: string | null;
  officialUrl: string | null;
  /** Importe de la multa con pronto pago, de la zona principal; null si no consta. */
  earlyPaymentAmount: number | null;
  importedOn: string;
  mainZoneName: string;
  calendar: CalendarEntry[];
}

/** Estado de una ZBE que solo consta en el inventario del MITECO, sin zona en vigor. */
export interface MitecoEnforcement {
  source: 'miteco';
  state: EnforcementState;
  label: string;
  sentence: string;
  inventoryUpdated: string;
  importedOn: string;
}

export type CityEnforcement = AtlasEnforcement | MitecoEnforcement;

export interface CityData {
  id: string;
  slug: string;
  name: string;
  province: string;
  region: string;
  lat: number;
  lng: number;
  status: 'activa' | 'en_tramitacion' | 'suspendida';
  fineAmount: number;
  schedule: string;
  summary: string;
  parkingCondition?: string | null;
  exemptions: string[];
  rules: Record<DgtBadgeType, CityRule>;
  perimeterName?: string | null;
  areaKm2?: number | null;
  polygon?: [number, number][] | null;
  streets?: string[] | null;
  geoJSON?: any;
  perimeterSource?: { name: string; url: string; retrieved: string } | null;
  sourceUrl: string;
  sourceName: string;
  verificationStatus: VerificationStatus;
  lastVerified: string | null;
  noticePeriod?: string | null;
  enforcement?: CityEnforcement | null;
}

const cities: CityData[] = citiesJson as unknown as CityData[];

export function getAllCities(): CityData[] {
  return cities;
}

export function getCityBySlug(slug: string): CityData | undefined {
  if (!slug) return undefined;
  const normalized = slug.toLowerCase().trim();
  return cities.find((c) => c.slug.toLowerCase() === normalized);
}

export function evaluateCityAccess(city: CityData, badge: DgtBadgeType): CityEvaluationResult {
  const [result] = evaluateCitiesForBadge(badge, [city]);
  return result;
}

export function evaluateAllCities(badge: DgtBadgeType): CityEvaluationResult[] {
  return evaluateCitiesForBadge(badge, cities);
}
