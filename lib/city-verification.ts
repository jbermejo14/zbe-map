/** Textos y reglas de presentación del estado de verificación de cada ciudad. */

import type { PerimeterSource } from './cities-repository.ts';

export type VerificationStatus = 'verified' | 'pending';

export const PENDING_VERIFICATION_TEXT = 'Pendiente de verificar con la ordenanza municipal. Normas orientativas.';
export const PERIMETER_UNAVAILABLE_TEXT = 'Perímetro no disponible: consulta el plano oficial del ayuntamiento';
export const PERIMETER_NOT_APPROVED_TEXT = 'Todavía no hay perímetro aprobado: la ZBE está en tramitación.';
export const PERIMETER_OFFICIAL_LABEL = 'Perímetro oficial';
export const PERIMETER_APPROXIMATE_LABEL = 'Perímetro aproximado';
export const PERIMETER_APPROXIMATE_ADVICE = 'Consulta el plano oficial del ayuntamiento antes de entrar.';

/** Texto del mapa cuando no hay perímetro: en las ZBE solo en tramitación todavía no existe zona aprobada. */
export function perimeterUnavailableText(enforcementSource: string | null | undefined): string {
  return enforcementSource === 'miteco' ? PERIMETER_NOT_APPROVED_TEXT : PERIMETER_UNAVAILABLE_TEXT;
}

/** Un perímetro sin precisión (datos antiguos) se considera oficial. */
export function isApproximatePerimeter(perimeterSource: PerimeterSource | null | undefined): boolean {
  return perimeterSource?.precision === 'aproximada';
}

interface VerificationSubject {
  verificationStatus?: VerificationStatus | null;
  lastVerified?: string | null;
  sourceName?: string | null;
}

/** Una ciudad solo cuenta como verificada si está marcada así y tiene fecha. */
export function isCityVerified(city: VerificationSubject): boolean {
  return city.verificationStatus === 'verified' && Boolean(city.lastVerified);
}

/** Frase de verificación que se muestra al usuario. */
export function getVerificationText(city: VerificationSubject): string {
  if (!isCityVerified(city)) return PENDING_VERIFICATION_TEXT;
  return `Verificado el ${city.lastVerified} con ${city.sourceName ?? 'la fuente indicada'}`;
}
