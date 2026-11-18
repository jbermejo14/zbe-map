import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { AdSlot } from '../components/AdSlot.tsx';
import { Header } from '../components/Header.tsx';
import { RecommendationsSection } from '../components/RecommendationsSection.tsx';
import EtiquetaDgtPage from '../app/etiqueta-dgt/page.tsx';
import sitemap from '../app/sitemap.ts';
import { getOfficialDgtBadge } from '../lib/dgt-rules.ts';
import { evaluateVehicleSelection, EMPTY_VEHICLE_SELECTION } from '../lib/vehicle-selection.ts';
import { absoluteUrl } from '../lib/site.ts';

const TEST_CLIENT = 'ca-pub-0000000000000000';
const TEST_SLOT = '0000000000';
const MAX_ADS_PER_PAGE = 3;
const ENV_NAMES = [
  'NEXT_PUBLIC_ADSENSE_CLIENT',
  'NEXT_PUBLIC_ADSENSE_SLOT',
  'NEXT_PUBLIC_AFFILIATE_CLICARS_TAG',
  'NEXT_PUBLIC_AFFILIATE_RENTING_TAG',
  'NEXT_PUBLIC_AFFILIATE_TASACION_TAG',
] as const;

/** Ejecuta la prueba con exactamente las variables indicadas definidas. */
function z6WithEnv(values: Partial<Record<(typeof ENV_NAMES)[number], string>>, run: () => void): void {
  const previous = ENV_NAMES.map((name) => process.env[name]);
  for (const name of ENV_NAMES) {
    const value = values[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  try {
    run();
  } finally {
    ENV_NAMES.forEach((name, index) => {
      const old = previous[index];
      if (old === undefined) delete process.env[name];
      else process.env[name] = old;
    });
  }
}

function z6Read(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf-8');
}

test('AdSlot: sin cliente, sin unidad o con valores inválidos no renderiza nada', () => {
  const cases = [
    {},
    { NEXT_PUBLIC_ADSENSE_CLIENT: TEST_CLIENT },
    { NEXT_PUBLIC_ADSENSE_SLOT: TEST_SLOT },
    { NEXT_PUBLIC_ADSENSE_CLIENT: 'invalido', NEXT_PUBLIC_ADSENSE_SLOT: TEST_SLOT },
    { NEXT_PUBLIC_ADSENSE_CLIENT: TEST_CLIENT, NEXT_PUBLIC_ADSENSE_SLOT: '123' },
  ];
  for (const env of cases) {
    z6WithEnv(env, () => assert.equal(renderToStaticMarkup(<AdSlot />), ''));
  }
});

test('AdSlot: con valores válidos renderiza la unidad y el texto Publicidad', () => {
  z6WithEnv({ NEXT_PUBLIC_ADSENSE_CLIENT: TEST_CLIENT, NEXT_PUBLIC_ADSENSE_SLOT: TEST_SLOT }, () => {
    const html = renderToStaticMarkup(<AdSlot />);
    assert.match(html, /<ins class="adsbygoogle"/);
    assert.ok(html.includes(`data-ad-client="${TEST_CLIENT}"`));
    assert.ok(html.includes(`data-ad-slot="${TEST_SLOT}"`));
    assert.ok(html.includes('data-ad-format="auto"'));
    assert.ok(html.includes('Publicidad'));
  });
});

test('AdSlot: ninguna página legal ni la 404 lo importan', () => {
  for (const page of ['aviso-legal', 'privacidad', 'cookies']) {
    assert.doesNotMatch(z6Read(`app/${page}/page.tsx`), /AdSlot/);
  }
  assert.equal(existsSync(path.join(process.cwd(), 'app', 'not-found.tsx')), false);
});

test('AdSlot: ninguna página pasa de 3 huecos, contando sus componentes', () => {
  const pages = [
    'app/page.tsx',
    'app/ciudades/page.tsx',
    'app/[ciudad]/page.tsx',
    'app/[ciudad]/[etiqueta]/page.tsx',
    'app/etiqueta-dgt/page.tsx',
    'app/etiqueta-dgt/[combustible]/[anio]/page.tsx',
  ];
  for (const page of pages) {
    const source = z6Read(page);
    const componentNames = [...source.matchAll(/from '@\/components\/(\w+)'/g)].map((match) => match[1]);
    const componentSources = componentNames.map((name) => z6Read(`components/${name}.tsx`));
    const nested = componentSources.flatMap((text) =>
      [...text.matchAll(/from '\.\/(\w+)'/g)].map((match) => z6Read(`components/${match[1]}.tsx`))
    );
    const total = [source, ...componentSources, ...nested].join('\n').match(/<AdSlot\b/g)?.length ?? 0;
    assert.ok(total >= 1 && total <= MAX_ADS_PER_PAGE, `${page}: ${total} huecos`);
  }
});

test('afiliados: sin códigos, las recomendaciones no muestran tasación ni enlaces a #', () => {
  z6WithEnv({}, () => {
    const html = renderToStaticMarkup(<RecommendationsSection currentBadge="B" vehicleTitle="Tu coche" />);
    assert.ok(html.includes('Modelos equivalentes'));
    assert.doesNotMatch(html, /Tasación/);
    assert.doesNotMatch(html, /href="#"/);
    assert.doesNotMatch(html, /Segunda mano|renting/);
  });
});

test('afiliados: con código de tasación aparece la tarjeta con su enlace', () => {
  z6WithEnv({ NEXT_PUBLIC_AFFILIATE_TASACION_TAG: 'placeholder' }, () => {
    const html = renderToStaticMarkup(<RecommendationsSection currentBadge="B" vehicleTitle="Tu coche" />);
    assert.match(html, /Tasación de tu coche actual/);
    assert.ok(html.includes('compramostucoche.es/?tag=placeholder'));
  });
});

test('/etiqueta-dgt: renderiza las cinco etiquetas, su JSON-LD y está en el sitemap', () => {
  const html = renderToStaticMarkup(<EtiquetaDgtPage />);
  for (const title of ['Etiqueta 0 Emisiones', 'Etiqueta ECO', 'Etiqueta C', 'Etiqueta B', 'Sin etiqueta']) {
    assert.ok(html.includes(title), `Falta ${title}`);
  }
  assert.ok(html.includes('Etiqueta ambiental de la DGT: qué etiqueta tiene tu coche'));
  assert.ok(html.includes('href="/etiqueta-dgt/gasolina/2018"'));
  assert.match(html, /BreadcrumbList/);
  assert.ok(sitemap().some((route) => route.url === absoluteUrl('/etiqueta-dgt')));
});

test('la cabecera enlaza a /etiqueta-dgt', () => {
  assert.ok(renderToStaticMarkup(<Header />).includes('href="/etiqueta-dgt"'));
});

test('calculadora rápida: da la misma etiqueta que getOfficialDgtBadge', () => {
  const dieselSeptember = evaluateVehicleSelection({ ...EMPTY_VEHICLE_SELECTION, fuel: 'diesel', year: 2015, month: 9 });
  assert.equal(dieselSeptember?.badge, getOfficialDgtBadge({ fuel: 'diesel', year: 2015, month: 9 }).badge);
  const plugin = evaluateVehicleSelection({
    ...EMPTY_VEHICLE_SELECTION,
    fuel: 'hibrido-enchufable',
    year: 2022,
    electricRangeKm: 39,
  });
  assert.equal(plugin?.badge, getOfficialDgtBadge({ fuel: 'hibrido-enchufable', year: 2022, electricRangeKm: 39 }).badge);
});
