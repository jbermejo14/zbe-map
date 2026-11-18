/** Nombre oficial de cada comunidad cuando los datos la escriben de otra forma. */
const REGION_CANONICAL_NAMES: Readonly<Record<string, string>> = {
  'Comunidad Valenciana': 'Comunitat Valenciana',
  'Islas Baleares': 'Illes Balears',
};

/** Unifica las variantes de escritura de una comunidad en su nombre oficial. */
export function canonicalRegion(name: string): string {
  const trimmed = name.trim();
  return REGION_CANONICAL_NAMES[trimmed] ?? trimmed;
}
