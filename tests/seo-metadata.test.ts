import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import './support/ignore-css.ts';
import type { Metadata } from 'next';
import { metadata as homeMetadata } from '../app/page.tsx';
import { metadata as citiesMetadata } from '../app/ciudades/page.tsx';
import { metadata as etiquetaMetadata } from '../app/etiqueta-dgt/page.tsx';
import { metadata as avisoMetadata } from '../app/aviso-legal/page.tsx';
import { metadata as cookiesMetadata } from '../app/cookies/page.tsx';
import { metadata as privacidadMetadata } from '../app/privacidad/page.tsx';
import { generateMetadata as cityMetadata, generateStaticParams as cityParams } from '../app/[ciudad]/page.tsx';
import {
  generateMetadata as badgeMetadata,
  generateStaticParams as badgeParams,
} from '../app/[ciudad]/[etiqueta]/page.tsx';
import {
  generateMetadata as fuelYearMetadata,
  generateStaticParams as fuelYearParams,
} from '../app/etiqueta-dgt/[combustible]/[anio]/page.tsx';
import {
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  fitDescription,
  fitTitle,
  OG_IMAGE_PATH,
  titleWithBrand,
  TITLE_MAX_LENGTH,
  TITLE_TARGET_LENGTH,
} from '../lib/seo-metadata.ts';

const EXPECTED_OG_IMAGE_SUFFIX = '/es/zbe/brand/ododex-og.png';
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const BRAND = 'Ododex';
const MIN_EXPECTED_PAGES = 1000;
const BADGE_PAGE_SEGMENTS = 3;

interface PageMetadata {
  label: string;
  metadata: Metadata;
}

/** Título final tal como lo escribe Next: absoluto, o la cadena con la plantilla del layout. */
function seoRenderedTitle(metadata: Metadata): string {
  const title = metadata.title;
  if (typeof title === 'string') return titleWithBrand(title);
  if (title && 'absolute' in title && title.absolute) return title.absolute;
  throw new Error('La página no define un título utilizable');
}

function seoIsIndexable(metadata: Metadata): boolean {
  const robots = metadata.robots;
  return !(robots && typeof robots === 'object' && 'index' in robots && robots.index === false);
}

async function seoAllPages(): Promise<PageMetadata[]> {
  const pages: PageMetadata[] = [
    { label: '/', metadata: homeMetadata },
    { label: '/ciudades', metadata: citiesMetadata },
    { label: '/etiqueta-dgt', metadata: etiquetaMetadata },
    { label: '/aviso-legal', metadata: avisoMetadata },
    { label: '/cookies', metadata: cookiesMetadata },
    { label: '/privacidad', metadata: privacidadMetadata },
  ];
  for (const params of await cityParams()) {
    pages.push({ label: `/${params.ciudad}`, metadata: await cityMetadata({ params: Promise.resolve(params) }) });
  }
  for (const params of await badgeParams()) {
    pages.push({
      label: `/${params.ciudad}/${params.etiqueta}`,
      metadata: await badgeMetadata({ params: Promise.resolve(params) }),
    });
  }
  for (const params of await fuelYearParams()) {
    pages.push({
      label: `/etiqueta-dgt/${params.combustible}/${params.anio}`,
      metadata: await fuelYearMetadata({ params: Promise.resolve(params) }),
    });
  }
  return pages;
}

describe('metadatos SEO de todas las páginas', () => {
  it('se recorren portada, directorios, legales, ciudades, etiquetas y combustible/año', async () => {
    const pages = await seoAllPages();
    assert.ok(pages.length >= MIN_EXPECTED_PAGES, `solo ${pages.length} páginas`);
  });

  it('títulos: con marca una sola vez y como máximo 65 caracteres', async () => {
    for (const { label, metadata } of await seoAllPages()) {
      const title = seoRenderedTitle(metadata);
      assert.ok(title.length <= TITLE_MAX_LENGTH, `${label}: ${title.length} caracteres: ${title}`);
      assert.ok(title.endsWith(` | ${BRAND}`), `${label}: sin marca al final: ${title}`);
      assert.equal(title.split(BRAND).length - 1, 1, `${label}: marca duplicada: ${title}`);
    }
  });

  it('títulos: únicos', async () => {
    const seen = new Map<string, string>();
    for (const { label, metadata } of await seoAllPages()) {
      const title = seoRenderedTitle(metadata);
      assert.ok(!seen.has(title), `${label} repite el título de ${seen.get(title)}: ${title}`);
      seen.set(title, label);
    }
  });

  it('descripciones: entre 120 y 160 caracteres en las páginas indexables', async () => {
    for (const { label, metadata } of (await seoAllPages()).filter((page) => seoIsIndexable(page.metadata))) {
      const length = String(metadata.description).length;
      assert.ok(
        length >= DESCRIPTION_MIN_LENGTH && length <= DESCRIPTION_MAX_LENGTH,
        `${label}: ${length} caracteres: ${metadata.description}`,
      );
    }
  });

  it('descripciones: nunca superan 160 y son únicas en todas las páginas', async () => {
    const seen = new Map<string, string>();
    for (const { label, metadata } of await seoAllPages()) {
      const description = String(metadata.description);
      assert.ok(description.length <= DESCRIPTION_MAX_LENGTH, `${label}: ${description.length} caracteres`);
      assert.ok(!seen.has(description), `${label} repite la descripción de ${seen.get(description)}`);
      seen.set(description, label);
    }
  });

  it('imagen OG absoluta con la ruta base y twitter summary_large_image en todas las páginas', async () => {
    assert.equal(OG_IMAGE_PATH, '/brand/ododex-og.png');
    for (const { label, metadata } of await seoAllPages()) {
      const openGraph = metadata.openGraph as
        | { images?: { url: string; width: number; height: number }[] }
        | null
        | undefined;
      const image = openGraph?.images?.[0];
      assert.ok(image, `${label}: sin imagen OG`);
      assert.ok(image.url.startsWith('http') && image.url.endsWith(EXPECTED_OG_IMAGE_SUFFIX), `${label}: ${image.url}`);
      assert.deepEqual([image.width, image.height], [OG_WIDTH, OG_HEIGHT], label);
      const twitter = metadata.twitter as { card?: string; images?: string[] } | null | undefined;
      assert.equal(twitter?.card, 'summary_large_image', label);
      assert.deepEqual(twitter?.images, [image.url], label);
    }
  });

  it('las páginas legales siguen con noindex y las de etiqueta conservan su regla de indexación', async () => {
    for (const metadata of [avisoMetadata, cookiesMetadata, privacidadMetadata]) {
      assert.equal(seoIsIndexable(metadata), false);
    }
    const pages = await seoAllPages();
    const badgePages = pages.filter(
      (page) => page.label.split('/').length === BADGE_PAGE_SEGMENTS && !page.label.startsWith('/etiqueta-dgt'),
    );
    assert.ok(badgePages.some((page) => !seoIsIndexable(page.metadata)), 'debe haber páginas de etiqueta con noindex');
    assert.ok(badgePages.some((page) => seoIsIndexable(page.metadata)), 'debe haber páginas de etiqueta indexables');
  });
});

describe('fitTitle y fitDescription', () => {
  it('fitTitle prefiere la primera variante que cabe en 60, luego en 65, y nunca trunca', () => {
    const brandLength = titleWithBrand('').length;
    const exact = 'x'.repeat(TITLE_TARGET_LENGTH - brandLength);
    const longer = 'y'.repeat(TITLE_MAX_LENGTH - brandLength);
    assert.equal(fitTitle([longer, exact]), titleWithBrand(exact));
    assert.equal(fitTitle([longer]), titleWithBrand(longer));
    assert.throws(() => fitTitle(['z'.repeat(TITLE_MAX_LENGTH)]), /variante más corta/);
  });

  it('fitDescription elige el primer candidato entre 120 y 160 y falla si ninguno sirve', () => {
    const tooShort = 'a'.repeat(DESCRIPTION_MIN_LENGTH - 1);
    const fits = 'b'.repeat(DESCRIPTION_MIN_LENGTH);
    const tooLong = 'c'.repeat(DESCRIPTION_MAX_LENGTH + 1);
    assert.equal(fitDescription([tooLong, tooShort, fits]), fits);
    assert.throws(() => fitDescription([tooShort, tooLong]), /candidato intermedio/);
  });
});
