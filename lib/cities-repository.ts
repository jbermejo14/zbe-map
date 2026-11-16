import citiesJson from '../data/zbe-cities.json' with { type: 'json' };
import type { DgtBadgeType, ZbeAccessStatus, CityEvaluationResult } from './zbe-engine.ts';
import { evaluateCitiesForBadge } from './zbe-engine.ts';

export interface CityRule {
  status: ZbeAccessStatus;
  reason: string;
}

export interface CityData {
  id: string;
  slug: string;
  name: string;
  province: string;
  region: string;
  lat: number;
  lng: number;
  status: 'activa' | 'en_tramitacion';
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
  sourceUrl: string;
  sourceName: string;
  lastVerified: string;
  noticePeriod?: string | null;
}

const cities: CityData[] = citiesJson as unknown as CityData[];

export function getAllCities(): CityData[] {
  return cities;
}

export function getActiveCities(): CityData[] {
  return cities.filter((c) => c.status === 'activa');
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
