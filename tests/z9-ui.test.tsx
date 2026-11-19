import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EnforcementNotice } from '../components/EnforcementNotice.tsx';
import { ZbeCalendar } from '../components/ZbeCalendar.tsx';
import { Footer } from '../components/Footer.tsx';
import type { AtlasEnforcement, MitecoEnforcement } from '../lib/cities-repository.ts';
import type { CalendarEntry } from '../lib/atlas-zbe.ts';

const Z9_IMPORTED_ON = '2026-11-19';
const Z9_OFFICIAL_URL = 'https://example.org/zbe';

const Z9_ATLAS: AtlasEnforcement = {
  source: 'atlaszbe',
  state: 'sanciona',
  label: 'Se multa',
  sentence: 'Las restricciones están en vigor y se multa desde el 1 de enero de 2025.',
  finesFrom: '2025-01-01',
  warningUntil: null,
  nextChange: null,
  confidence: 'alta',
  verifiedOn: '2026-10-01',
  officialUrl: Z9_OFFICIAL_URL,
  earlyPaymentAmount: 100,
  importedOn: Z9_IMPORTED_ON,
  mainZoneName: 'Madrid ZBE',
  calendar: [],
};

const Z9_MITECO: MitecoEnforcement = {
  source: 'miteco',
  state: 'en_tramite',
  label: 'En tramitación',
  sentence: 'Gijón tiene la ZBE en tramitación: todavía no hay restricciones de acceso por etiqueta.',
  inventoryUpdated: '2026-09-30',
  importedOn: Z9_IMPORTED_ON,
};

const Z9_ENTRIES: CalendarEntry[] = [
  { date: '2025-01-01', text: 'Los turismos sin etiqueta no pueden circular.', badges: ['SIN_ETIQUETA'] },
  { date: '2025-06-01', text: 'Empiezan las multas.', badges: [] },
  { date: '2027-01-01', text: 'Los turismos con etiqueta B no pueden circular.', badges: ['B'] },
];

test('EnforcementNotice atlaszbe: etiqueta, frase, verificación y enlace oficial', () => {
  const html = renderToStaticMarkup(<EnforcementNotice enforcement={Z9_ATLAS} cityName="Madrid" verified />);
  assert.match(html, /Se multa/);
  assert.match(html, /se multa desde el 1 de enero de 2025/);
  assert.match(html, /Verificado el 1 de octubre de 2026 con fuentes oficiales/);
  assert.match(html, /href="https:\/\/example\.org\/zbe"/);
  assert.match(html, /rel="nofollow noopener noreferrer"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /border-negative-line/);
});

test('EnforcementNotice atlaszbe no verificada: dice que está pendiente de confirmar', () => {
  const html = renderToStaticMarkup(<EnforcementNotice enforcement={Z9_ATLAS} cityName="Madrid" verified={false} />);
  assert.match(html, /Datos de Atlas ZBE comprobados el 1 de octubre de 2026; pendientes de confirmar con el ayuntamiento/);
  assert.doesNotMatch(html, /con fuentes oficiales/);
});

test('EnforcementNotice atlaszbe en aviso: color de aviso', () => {
  const warning = { ...Z9_ATLAS, state: 'aviso' as const, label: 'Periodo de aviso' };
  const html = renderToStaticMarkup(<EnforcementNotice enforcement={warning} cityName="Madrid" verified />);
  assert.match(html, /border-warning-line/);
});

test('EnforcementNotice atlaszbe sin verificación ni URL: no muestra ni fecha ni enlace', () => {
  const bare = { ...Z9_ATLAS, verifiedOn: null, officialUrl: null };
  const html = renderToStaticMarkup(<EnforcementNotice enforcement={bare} cityName="Madrid" verified />);
  assert.doesNotMatch(html, /Verificado el/);
  assert.doesNotMatch(html, /<a /);
});

test('EnforcementNotice miteco: cita el inventario y no enlaza', () => {
  const html = renderToStaticMarkup(<EnforcementNotice enforcement={Z9_MITECO} cityName="Gijón" verified />);
  assert.match(html, /En tramitación/);
  assert.match(html, /Según el inventario de ZBE del MITECO \(actualizado el 30 de septiembre de 2026\)/);
  assert.match(html, /border-positive-line/);
  assert.doesNotMatch(html, /<a /);
});

test('EnforcementNotice sin enforcement: no renderiza nada', () => {
  assert.equal(renderToStaticMarkup(<EnforcementNotice enforcement={null} cityName="Madrid" verified />), '');
  assert.equal(renderToStaticMarkup(<EnforcementNotice enforcement={undefined} cityName="Madrid" verified />), '');
});

test('ZbeCalendar: título, orden recibido y marca Próximamente solo en fechas futuras', () => {
  const html = renderToStaticMarkup(
    <ZbeCalendar entries={Z9_ENTRIES} cityName="Madrid" importedOn={Z9_IMPORTED_ON} />,
  );
  assert.match(html, /Calendario de la ZBE de Madrid/);
  assert.match(html, /<ol/);
  assert.match(html, /<time dateTime="2025-01-01"[^>]*>1 de enero de 2025<\/time>/);
  assert.ok(html.indexOf('2025-01-01') < html.indexOf('2025-06-01'));
  assert.ok(html.indexOf('2025-06-01') < html.indexOf('2027-01-01'));
  assert.equal(html.match(/Próximamente/g)?.length, 1);
  assert.ok(html.indexOf('Próximamente') > html.indexOf('2027-01-01'));
});

test('ZbeCalendar: una entrada con la fecha de importación no es próxima', () => {
  const today: CalendarEntry[] = [{ date: Z9_IMPORTED_ON, text: 'Hoy.', badges: [] }];
  const html = renderToStaticMarkup(<ZbeCalendar entries={today} cityName="Madrid" importedOn={Z9_IMPORTED_ON} />);
  assert.doesNotMatch(html, /Próximamente/);
});

test('ZbeCalendar con etiqueta: solo entradas generales o de esa etiqueta y título del grupo', () => {
  const html = renderToStaticMarkup(
    <ZbeCalendar
      entries={Z9_ENTRIES}
      cityName="Madrid"
      importedOn={Z9_IMPORTED_ON}
      badge="B"
      badgeTitle="Coches con etiqueta B"
    />,
  );
  assert.match(html, /Calendario para coches con etiqueta B en Madrid/);
  assert.match(html, /Empiezan las multas/);
  assert.match(html, /etiqueta B no pueden circular/);
  assert.doesNotMatch(html, /sin etiqueta no pueden circular/);
});

test('ZbeCalendar sin entradas, o sin entradas para la etiqueta: no renderiza nada', () => {
  assert.equal(renderToStaticMarkup(<ZbeCalendar entries={[]} cityName="Madrid" importedOn={Z9_IMPORTED_ON} />), '');
  const onlyOther: CalendarEntry[] = [Z9_ENTRIES[0]];
  assert.equal(
    renderToStaticMarkup(
      <ZbeCalendar entries={onlyOther} cityName="Madrid" importedOn={Z9_IMPORTED_ON} badge="CERO" badgeTitle="Coches con etiqueta 0 CERO" />,
    ),
    '',
  );
});

test('Footer: atribución a Atlas ZBE con enlaces a su web y a la licencia', () => {
  const html = renderToStaticMarkup(<Footer />);
  assert.match(html, /Datos de las ZBE:/);
  assert.match(html, /href="https:\/\/atlaszbe\.es"[^>]*>Atlas ZBE</);
  assert.match(html, /href="https:\/\/opendatacommons\.org\/licenses\/odbl\/1-0\/"[^>]*>ODbL 1\.0</);
  assert.match(html, /DGT, MITECO y ayuntamientos\./);
});

test('Footer: los enlaces de atribución abren en pestaña nueva con rel seguro', () => {
  const html = renderToStaticMarkup(<Footer />);
  const hrefs = ['https://atlaszbe.es', 'https://opendatacommons.org/licenses/odbl/1-0/'];
  for (const href of hrefs) {
    const anchor = html.split('<a ').find((piece) => piece.includes('href="' + href + '"'));
    assert.ok(anchor, href);
    assert.match(anchor, /target="_blank"/);
    assert.match(anchor, /rel="noopener noreferrer"/);
  }
});
