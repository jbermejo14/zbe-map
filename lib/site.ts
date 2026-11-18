/** Nombre de la marca de la red de webs. */
export const SITE_NAME = 'Ododex';

/** Etiqueta de la sección que aparece junto al logo en la cabecera. */
export const SECTION_NAME = 'Zonas de bajas emisiones';

/** Ruta bajo la que se publica la web dentro de ododex.com. Sin barra final. */
export const BASE_PATH = '/es/zbe';

const DEFAULT_SITE_URL = 'http://localhost:3000';

/** Origen del sitio, sin ruta ni barra final. Variable NEXT_PUBLIC_SITE_URL; por defecto http://localhost:3000. */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  return url.replace(/\/+$/, '');
}

function siteRoutePart(path: string): string {
  if (path === '' || path === '/') return '';
  return path.startsWith('/') ? path : `/${path}`;
}

/** URL absoluta de una ruta de la web: origen + BASE_PATH + ruta. absoluteUrl('/') → 'https://ododex.com/es/zbe'. */
export function absoluteUrl(path: string): string {
  return `${getSiteUrl()}${BASE_PATH}${siteRoutePart(path)}`;
}

/** Ruta de un fichero de public/ con la ruta base, para <img>, <a> sin next/link y scripts: assetPath('/brand/x.svg') → '/es/zbe/brand/x.svg'. */
export function assetPath(path: string): string {
  return `${BASE_PATH}${siteRoutePart(path)}`;
}
