import type { Metadata } from 'next';
import { FECHA_TEXTOS_LEGALES } from './legal.ts';
import { socialMetadata, titleWithBrand } from './seo-metadata.ts';
import { absoluteUrl, SITE_NAME } from './site.ts';

/** Robots de las páginas legales: no se indexan, pero se siguen sus enlaces. */
export const LEGAL_ROBOTS = { index: false, follow: true } as const;

/** Metadatos de una página legal: título, descripción, canonical y sin indexar. */
export function legalMetadata(path: string, title: string, description: string): Metadata {
  return {
    title,
    description,
    robots: LEGAL_ROBOTS,
    alternates: { canonical: absoluteUrl(path) },
    ...socialMetadata({ title: titleWithBrand(title), description, path, imageAlt: `${title} · ${SITE_NAME}` })
  };
}

/** Línea "Última revisión: <fecha>" de las páginas legales. */
export function legalLastReview(): string {
  return `Última revisión: ${FECHA_TEXTOS_LEGALES}`;
}
