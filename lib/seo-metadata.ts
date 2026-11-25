import type { Metadata } from 'next';
import { absoluteUrl, SITE_NAME } from './site.ts';

/** Ruta, dentro de public/, de la imagen que se muestra al compartir cualquier página. */
export const OG_IMAGE_PATH = '/brand/ododex-og.png';
/** Dimensiones de la imagen OG, en píxeles. */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
/** Longitud objetivo del título completo (con marca) y límite máximo aceptado. */
export const TITLE_TARGET_LENGTH = 60;
export const TITLE_MAX_LENGTH = 65;
/** Límites de longitud de la description. */
export const DESCRIPTION_MIN_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 160;

const TITLE_BRAND_SEPARATOR = ' | ';
const OG_LOCALE = 'es_ES';

/** Título con la marca al final: 'Aviso legal' → 'Aviso legal | Ododex'. */
export function titleWithBrand(title: string): string {
  return `${title}${TITLE_BRAND_SEPARATOR}${SITE_NAME}`;
}

/**
 * Elige el primer título de `variants` (de la palabra clave más completa a la más corta) que,
 * con la marca, cabe en TITLE_TARGET_LENGTH; si ninguno, el primero que cabe en TITLE_MAX_LENGTH.
 * Nunca trunca: si ninguna variante cabe lanza un error para que se añada una variante más corta.
 */
export function fitTitle(variants: string[]): string {
  const titles = variants.map(titleWithBrand);
  const chosen =
    titles.find((title) => title.length <= TITLE_TARGET_LENGTH) ??
    titles.find((title) => title.length <= TITLE_MAX_LENGTH);
  if (!chosen) {
    throw new Error(
      `Ninguna variante de título cabe en ${TITLE_MAX_LENGTH} caracteres: ${titles.join(' / ')}. Añade una variante más corta.`,
    );
  }
  return chosen;
}

/**
 * Elige la primera descripción de `candidates` (de la más rica a la más corta) cuya longitud
 * está entre DESCRIPTION_MIN_LENGTH y DESCRIPTION_MAX_LENGTH.
 */
export function fitDescription(candidates: string[]): string {
  const chosen = candidates.find(
    (text) => text.length >= DESCRIPTION_MIN_LENGTH && text.length <= DESCRIPTION_MAX_LENGTH,
  );
  if (chosen === undefined) {
    throw new Error(
      `Ninguna descripción mide entre ${DESCRIPTION_MIN_LENGTH} y ${DESCRIPTION_MAX_LENGTH} caracteres: ${candidates.join(' / ')}. Añade un candidato intermedio.`,
    );
  }
  return chosen;
}

/** Datos de una página para sus etiquetas Open Graph y Twitter. */
export interface SocialMetadataInput {
  /** Título completo, con marca. */
  title: string;
  description: string;
  /** Ruta de la página dentro de la sección ('/' para la portada). */
  path: string;
  imageAlt: string;
  /** Tipo Open Graph; por defecto 'website'. */
  type?: 'website' | 'article';
}

/** Open Graph y Twitter de una página, siempre con la imagen OG y `summary_large_image`. */
export function socialMetadata({
  title,
  description,
  path,
  imageAlt,
  type = 'website',
}: SocialMetadataInput): Pick<Metadata, 'openGraph' | 'twitter'> {
  const image = absoluteUrl(OG_IMAGE_PATH);
  return {
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      type,
      locale: OG_LOCALE,
      siteName: SITE_NAME,
      images: [{ url: image, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: imageAlt }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}
