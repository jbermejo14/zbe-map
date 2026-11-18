/**
 * Lógica que antes servían las rutas de API del servidor: ahora se ejecuta en el navegador.
 * Cada función devuelve lo mismo que devolvía la ruta que sustituye.
 */
import { findEquivalentEcoCars } from './zbe-engine.ts';
import type { VehicleRecord } from './zbe-engine.ts';
import { getEcoCandidates, getVehicleById } from './vehicles-repository.ts';

/** Perfil de partida de las recomendaciones cuando no se conoce el vehículo. */
export const DEFAULT_RECOMMENDATION_BODY_TYPE = 'Compacto';
export const DEFAULT_RECOMMENDATION_WHEELBASE_MM = 2650;
export const DEFAULT_RECOMMENDATION_POWER_KW = 100;

export interface RecommendationInput {
  vehicleId?: string;
  bodyType?: string;
  wheelbaseMm?: number;
  powerKw?: number;
}

export interface RecommendationTarget {
  id?: string;
  bodyType: string;
  wheelbaseMm: number;
  powerKw: number;
}

export interface AffiliateDeal {
  platform: string;
  label: string;
  url: string;
}

export interface EnrichedRecommendation extends VehicleRecord {
  affiliateDeals: {
    segundaMano?: AffiliateDeal;
    renting?: AffiliateDeal;
  };
}

export interface RecommendationsResult {
  target: RecommendationTarget;
  recommendations: EnrichedRecommendation[];
}

function resolveRecommendationTarget(input: RecommendationInput): RecommendationTarget {
  const vehicle = input.vehicleId ? getVehicleById(input.vehicleId) : undefined;
  if (vehicle) {
    return {
      id: vehicle.id,
      bodyType: vehicle.bodyType,
      wheelbaseMm: vehicle.wheelbaseMm,
      powerKw: vehicle.powerKw,
    };
  }
  return {
    id: input.vehicleId || undefined,
    bodyType: input.bodyType || DEFAULT_RECOMMENDATION_BODY_TYPE,
    wheelbaseMm: input.wheelbaseMm || DEFAULT_RECOMMENDATION_WHEELBASE_MM,
    powerKw: input.powerKw || DEFAULT_RECOMMENDATION_POWER_KW,
  };
}

function withAffiliateParam(url: string, separator: '&' | '?', name: string, tag: string): string {
  return `${url}${separator}${name}=${encodeURIComponent(tag)}`;
}

/** Enlace de tasación; null si no hay código de afiliación (NEXT_PUBLIC_AFFILIATE_TASACION_TAG). */
export function buildTasacionDeal(): AffiliateDeal | null {
  // Next solo sustituye NEXT_PUBLIC_* si se referencian con nombre literal.
  const tag = process.env.NEXT_PUBLIC_AFFILIATE_TASACION_TAG;
  if (!tag) return null;
  return {
    platform: 'Compramostucoche',
    label: 'Tasación online de vehículo actual',
    url: withAffiliateParam('https://www.compramostucoche.es/', '?', 'tag', tag),
  };
}

/** Solo los enlaces cuyo código de afiliación existe: sin código no hay enlace. */
function buildAffiliateDeals(rec: VehicleRecord): EnrichedRecommendation['affiliateDeals'] {
  const clicarsTag = process.env.NEXT_PUBLIC_AFFILIATE_CLICARS_TAG;
  const rentingTag = process.env.NEXT_PUBLIC_AFFILIATE_RENTING_TAG;
  const query = encodeURIComponent(`${rec.brand} ${rec.model}`);
  const deals: EnrichedRecommendation['affiliateDeals'] = {};

  if (clicarsTag) {
    deals.segundaMano = {
      platform: 'Clicars',
      label: `Ver ${rec.brand} ${rec.model} de segunda mano y ocasión`,
      url: withAffiliateParam(`https://www.clicars.com/coches-segunda-mano?search=${query}`, '&', 'tag', clicarsTag),
    };
  }
  if (rentingTag) {
    deals.renting = {
      platform: 'Renting Finders',
      label: `Consultar renting para particulares de ${rec.brand} ${rec.model}`,
      url: withAffiliateParam(`https://rentingfinders.com/coches/?search=${query}`, '&', 'ref', rentingTag),
    };
  }
  return deals;
}

/** Coches ECO/CERO equivalentes al vehículo (o al perfil dado), con enlaces comerciales. */
export function buildRecommendations(input: RecommendationInput): RecommendationsResult {
  const target = resolveRecommendationTarget(input);
  const recommendations = findEquivalentEcoCars(target, getEcoCandidates()).map((rec) => ({
    ...rec,
    affiliateDeals: buildAffiliateDeals(rec),
  }));
  return { target, recommendations };
}
