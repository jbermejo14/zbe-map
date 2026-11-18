import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AvisoLegalPage, { metadata as avisoMetadata } from '../app/aviso-legal/page.tsx';
import PrivacidadPage, { metadata as privacidadMetadata } from '../app/privacidad/page.tsx';
import CookiesPage, { metadata as cookiesMetadata } from '../app/cookies/page.tsx';
import sitemap from '../app/sitemap.ts';
import { AdSenseScript } from '../components/AdSenseScript.tsx';
import { Footer } from '../components/Footer.tsx';
import { getTitular, valorOPendiente } from '../lib/legal.ts';

const TEST_ADSENSE_CLIENT = 'ca-pub-0000000000000000';
const LEGAL_ROUTES = ['/aviso-legal', '/privacidad', '/cookies'];

function legalConAdSense(valor: string | undefined, prueba: () => void): void {
  const previo = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (valor === undefined) delete process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  else process.env.NEXT_PUBLIC_ADSENSE_CLIENT = valor;
  try {
    prueba();
  } finally {
    if (previo === undefined) delete process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
    else process.env.NEXT_PUBLIC_ADSENSE_CLIENT = previo;
  }
}

test('aviso legal: muestra nombre del titular o marcador, y no se indexa', () => {
  const html = renderToStaticMarkup(<AvisoLegalPage />);
  assert.ok(html.includes(valorOPendiente(getTitular(), 'nombre')));
  assert.ok(html.includes('LSSI'));
  assert.deepEqual(avisoMetadata.robots, { index: false, follow: true });
});

test('privacidad: muestra el titular y menciona a la AEPD', () => {
  const html = renderToStaticMarkup(<PrivacidadPage />);
  assert.ok(html.includes(valorOPendiente(getTitular(), 'nombre')));
  assert.ok(html.includes('AEPD'));
});

test('cookies: documenta ododex-theme y el enlace de Google', () => {
  const html = renderToStaticMarkup(<CookiesPage />);
  assert.ok(html.includes('ododex-theme'));
  assert.ok(html.includes('https://policies.google.com/technologies/cookies?hl=es'));
});

test('las tres páginas legales no se indexan pero siguen sus enlaces', () => {
  for (const metadata of [avisoMetadata, privacidadMetadata, cookiesMetadata]) {
    assert.deepEqual(metadata.robots, { index: false, follow: true });
  }
});

test('las páginas legales no están en el sitemap', () => {
  const urls = sitemap().map((route) => route.url);
  for (const route of LEGAL_ROUTES) {
    assert.ok(!urls.some((url) => url.endsWith(route)), `${route} no debe estar en el sitemap`);
  }
});

test('aviso legal: sitio no oficial de la DGT ni de los ayuntamientos, sin restos de otras webs', () => {
  const aviso = renderToStaticMarkup(<AvisoLegalPage />);
  assert.match(aviso, /no es una web oficial/i);
  assert.ok(aviso.includes('DGT'));
  assert.match(aviso, /ordenanza municipal/i);
  for (const html of [aviso, renderToStaticMarkup(<PrivacidadPage />), renderToStaticMarkup(<CookiesPage />)]) {
    assert.doesNotMatch(html, /impuesto|AEAT|Hacienda|radar/i);
  }
});

test('privacidad: vehículo y ubicación solo en el navegador, matrícula solo en el navegador; teselas de OpenStreetMap y Esri; AdSense con consentimiento', () => {
  const html = renderToStaticMarkup(<PrivacidadPage />);
  assert.match(html, /vehículo que eliges[^<]*se procesan solo en tu navegador/);
  assert.match(html, /«Mi ubicación»[^<]*no se envía a ningún servidor ni se guarda/);
  assert.match(html, /matrícula, si la escribes[^<]*no se envían a ningún servidor ni se guardan/);
  assert.match(html, /tile\.openstreetmap\.org/);
  assert.match(html, /services\.arcgisonline\.com/);
  assert.match(html, /AdSense[^<]*solo si das tu consentimiento/);
});

test('AdSenseScript no renderiza nada sin variable o con valor inválido', () => {
  legalConAdSense(undefined, () => assert.equal(AdSenseScript(), null));
  legalConAdSense('', () => assert.equal(AdSenseScript(), null));
  legalConAdSense('ca-pub-123', () => assert.equal(AdSenseScript(), null));
});

test('AdSenseScript renderiza el script con un ca-pub válido', () => {
  legalConAdSense(TEST_ADSENSE_CLIENT, () => {
    const element = AdSenseScript();
    assert.ok(element);
    assert.equal(
      element.props.src,
      `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${TEST_ADSENSE_CLIENT}`
    );
    assert.equal(element.props.strategy, 'afterInteractive');
    assert.equal(element.props.crossOrigin, 'anonymous');
  });
});

test('Footer: enlaces legales siempre; botón de cookies solo si se pide', () => {
  const sin = renderToStaticMarkup(<Footer />);
  for (const ruta of LEGAL_ROUTES) {
    assert.ok(sin.includes(`href="${ruta}"`), `Falta ${ruta}`);
  }
  assert.ok(!sin.includes('Configurar cookies'));
  assert.ok(renderToStaticMarkup(<Footer mostrarConsentimiento />).includes('Configurar cookies'));
});

test('Footer: fuentes (DGT, BOE, ordenanzas) y aviso de sitio no oficial', () => {
  const html = renderToStaticMarkup(<Footer />);
  assert.ok(html.includes('sede.dgt.gob.es'));
  assert.ok(html.includes('boe.es'));
  assert.match(html, /Ordenanzas municipales/);
  assert.match(html, /no es una web oficial de la DGT/);
});
