import linksJson from '../data/municipality-links.json' with { type: 'json' };

export const FUEL_SECTION_PATH = '/es/gasolineras/provincia';
export const CHARGING_SECTION_PATH = '/es/puntos-recarga/provincia';

interface MunicipalityLinkEntry {
  fuel: string | null;
  charging: string | null;
}

const links = linksJson as Record<string, MunicipalityLinkEntry>;

function municipalityLinksHref(sectionPath: string, target: string | null | undefined): string | null {
  return target ? `${sectionPath}/${target}` : null;
}

/**
 * Rutas, desde la raíz del dominio, de las páginas de gasolineras y puntos de recarga
 * del municipio. Devuelve `null` en cada una si no existe la página o la ciudad no consta.
 */
export function getMunicipalityLinks(citySlug: string): {
  fuelHref: string | null;
  chargingHref: string | null;
} {
  const entry = Object.hasOwn(links, citySlug) ? links[citySlug] : undefined;
  return {
    fuelHref: municipalityLinksHref(FUEL_SECTION_PATH, entry?.fuel),
    chargingHref: municipalityLinksHref(CHARGING_SECTION_PATH, entry?.charging),
  };
}
