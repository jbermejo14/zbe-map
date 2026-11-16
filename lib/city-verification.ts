/** Textos y reglas de presentación del estado de verificación de cada ciudad. */

export type VerificationStatus = 'verified' | 'pending';

export const PENDING_VERIFICATION_TEXT = 'Pendiente de verificar con la ordenanza municipal. Normas orientativas.';
export const PERIMETER_UNAVAILABLE_TEXT = 'Perímetro no disponible: consulta el plano oficial del ayuntamiento';

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
