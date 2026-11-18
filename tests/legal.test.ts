import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { camposPendientes, FECHA_TEXTOS_LEGALES, ficheroTitular, getTitular, valorOPendiente, type Titular } from '../lib/legal.ts';

const LEGAL_TITULAR_COMPLETO: Titular = {
  tipo: 'persona-fisica',
  nombre: 'Titular de prueba',
  nif: 'placeholder',
  domicilio: 'Calle de prueba 1',
  email: 'prueba@example.com',
  registroMercantil: ''
};

test('getTitular lee el fichero real con la forma esperada', () => {
  const titular = getTitular();
  assert.ok(['persona-fisica', 'empresa'].includes(titular.tipo));
  for (const campo of ['nombre', 'nif', 'domicilio', 'email', 'registroMercantil'] as const) {
    assert.equal(typeof titular[campo], 'string');
  }
});

test('camposPendientes: persona física ignora registroMercantil', () => {
  assert.deepEqual(camposPendientes(LEGAL_TITULAR_COMPLETO), []);
  const vacio: Titular = { ...LEGAL_TITULAR_COMPLETO, nombre: '', email: '  ' };
  assert.deepEqual(camposPendientes(vacio), ['nombre', 'email']);
});

test('camposPendientes: empresa exige registroMercantil', () => {
  const empresa: Titular = { ...LEGAL_TITULAR_COMPLETO, tipo: 'empresa' };
  assert.deepEqual(camposPendientes(empresa), ['registroMercantil']);
  assert.deepEqual(camposPendientes({ ...empresa, registroMercantil: 'Tomo 1' }), []);
});

test('valorOPendiente devuelve el valor o el marcador', () => {
  assert.equal(valorOPendiente(LEGAL_TITULAR_COMPLETO, 'nombre'), 'Titular de prueba');
  assert.equal(valorOPendiente(LEGAL_TITULAR_COMPLETO, 'registroMercantil'), '[pendiente: registroMercantil]');
});

test('FECHA_TEXTOS_LEGALES es una fecha ISO', () => {
  assert.match(FECHA_TEXTOS_LEGALES, /^\d{4}-\d{2}-\d{2}$/);
});

function legalDirectorioConfig(ficheros: Record<string, unknown>): string {
  const base = mkdtempSync(join(tmpdir(), 'legal-test-'));
  mkdirSync(join(base, 'config'));
  for (const [nombre, contenido] of Object.entries(ficheros)) {
    writeFileSync(join(base, 'config', nombre), JSON.stringify(contenido));
  }
  return base;
}

const LEGAL_PLANTILLA_VACIA = { tipo: 'persona-fisica', nombre: '', nif: '', domicilio: '', email: '', registroMercantil: '' };

test('getTitular usa la plantilla cuando no existe config/titular.json', () => {
  const base = legalDirectorioConfig({ 'titular.example.json': LEGAL_PLANTILLA_VACIA });
  assert.equal(ficheroTitular(base), join('config', 'titular.example.json'));
  assert.deepEqual(camposPendientes(getTitular(base)), ['nombre', 'nif', 'domicilio', 'email']);
});

test('getTitular prefiere config/titular.json a la plantilla', () => {
  const base = legalDirectorioConfig({
    'titular.example.json': LEGAL_PLANTILLA_VACIA,
    'titular.json': { ...LEGAL_TITULAR_COMPLETO }
  });
  assert.equal(getTitular(base).nombre, 'Titular de prueba');
});

test('getTitular nombra el fichero cuando el tipo no es válido', () => {
  const base = legalDirectorioConfig({ 'titular.json': { ...LEGAL_PLANTILLA_VACIA, tipo: 'autonomo' } });
  assert.throws(() => getTitular(base), /config.titular\.json: el campo "tipo"/);
});
