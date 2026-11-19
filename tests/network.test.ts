import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NETWORK_FILE_VARIABLE, getNetworkSections, loadNetwork } from '../lib/network.ts';
import { BASE_PATH } from '../lib/site.ts';

const OTHER_ROUTE = '/es/gasolineras';

const NETWORK = {
  version: 1,
  generado: '2026-11-19T18:00:00.000Z',
  secciones: [
    { ruta: BASE_PATH, nombre: 'Propia', descripcion: 'La propia web.' },
    { ruta: OTHER_ROUTE, nombre: 'Gasolineras', descripcion: 'Precios.' },
  ],
  enlaces: {},
};

function temporaryFile(name: string, content: string): string {
  const file = join(mkdtempSync(join(tmpdir(), 'network-')), name);
  writeFileSync(file, content);
  return file;
}

test('sin variable de entorno ni ruta, devuelve null sin error', () => {
  const previous = process.env[NETWORK_FILE_VARIABLE];
  delete process.env[NETWORK_FILE_VARIABLE];
  try {
    assert.equal(loadNetwork(), null);
    assert.equal(getNetworkSections(), null);
  } finally {
    if (previous !== undefined) process.env[NETWORK_FILE_VARIABLE] = previous;
  }
});

test('fichero inexistente devuelve null sin error', () => {
  assert.equal(loadNetwork(join(tmpdir(), 'no-existe-red-enlaces.json')), null);
});

test('JSON roto lanza un error claro en español', () => {
  const file = temporaryFile('roto.json', '{ no es json');
  assert.throws(() => loadNetwork(file), /no es válido: no es JSON/);
});

test('versión distinta de 1 lanza un error claro', () => {
  const file = temporaryFile('version.json', JSON.stringify({ ...NETWORK, version: 2 }));
  assert.throws(() => loadNetwork(file), /se esperaba version 1/);
});

test('las secciones excluyen la propia', () => {
  const file = temporaryFile('red.json', JSON.stringify(NETWORK));
  const sections = getNetworkSections(BASE_PATH, file);
  assert.deepEqual(sections?.map((section) => section.ruta), [OTHER_ROUTE]);
});
