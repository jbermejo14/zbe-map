/**
 * Lógica que antes servían las rutas de API del servidor: ahora se ejecuta en el navegador.
 * Cada función devuelve lo mismo que devolvía la ruta que sustituye.
 */
import { findEquivalentEcoCars } from './zbe-engine.ts';
import type { VehicleRecord } from './zbe-engine.ts';
import { getEcoCandidates, getVehicleById } from './vehicles-repository.ts';
import { lookupPlate } from './plate-lookup.ts';
import type { FuelType, PlateLookupResult } from './plate-lookup.ts';

/** Longitud mínima de una matrícula para intentar la consulta. */
export const PLATE_MIN_LENGTH = 4;

export const PLATE_TOO_SHORT_MESSAGE =
  'Debes proporcionar una matrícula válida (ej. 1234 LMN o M 1234 AB)';

const DEFAULT_FUEL: FuelType = 'gasolina';
const VALID_FUELS: FuelType[] = ['gasolina', 'diesel', 'hibrido', 'electrico', 'auto'];

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
    segundaMano: AffiliateDeal;
    renting: AffiliateDeal;
    tasacion: AffiliateDeal;
  };
}

export interface RecommendationsResult {
  target: RecommendationTarget;
  recommendations: EnrichedRecommendation[];
}

/**
 * Consulta de matrícula. Lanza Error con el motivo (matrícula corta o con formato
 * no válido) para que la interfaz lo muestre. Un combustible desconocido se trata como gasolina.
 */
export async function lookupPlateForForm(plate: string, fuel: string): Promise<PlateLookupResult> {
  if (plate.trim().length < PLATE_MIN_LENGTH) {
    throw new Error(PLATE_TOO_SHORT_MESSAGE);
  }
  const selectedFuel = VALID_FUELS.includes(fuel as FuelType) ? (fuel as FuelType) : DEFAULT_FUEL;
  return lookupPlate(plate, selectedFuel);
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

function withAffiliateParam(url: string, separator: '&' | '?', name: string, tag: string | undefined): string {
  return tag ? `${url}${separator}${name}=${encodeURIComponent(tag)}` : url;
}

function buildAffiliateDeals(rec: VehicleRecord): EnrichedRecommendation['affiliateDeals'] {
  // Next solo sustituye NEXT_PUBLIC_* si se referencian con nombre literal.
  const clicarsTag = process.env.NEXT_PUBLIC_AFFILIATE_CLICARS_TAG;
  const rentingTag = process.env.NEXT_PUBLIC_AFFILIATE_RENTING_TAG;
  const tasacionTag = process.env.NEXT_PUBLIC_AFFILIATE_TASACION_TAG;
  const query = encodeURIComponent(`${rec.brand} ${rec.model}`);

  return {
    segundaMano: {
      platform: 'Clicars',
      label: `Ver ${rec.brand} ${rec.model} de segunda mano y ocasión`,
      url: withAffiliateParam(`https://www.clicars.com/coches-segunda-mano?search=${query}`, '&', 'tag', clicarsTag),
    },
    renting: {
      platform: 'Renting Finders',
      label: `Consultar renting para particulares de ${rec.brand} ${rec.model}`,
      url: withAffiliateParam(`https://rentingfinders.com/coches/?search=${query}`, '&', 'ref', rentingTag),
    },
    tasacion: {
      platform: 'Compramostucoche',
      label: 'Tasación online de vehículo actual',
      url: withAffiliateParam('https://www.compramostucoche.es/', '?', 'tag', tasacionTag),
    },
  };
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
