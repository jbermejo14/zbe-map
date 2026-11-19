import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { CityData } from '../lib/cities-repository.ts';

const CITIES_FILE = path.join(process.cwd(), 'data/zbe-cities.json');
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CITIES_WITHOUT_MUNICIPALITY = ['torrent', 'portugalete', 'santurtzi', 'manacor', 'teruel', 'tudela', 'calahorra'];
const FORBIDDEN_REASON_TEXT = /undefined|null/;

const cities = JSON.parse(fs.readFileSync(CITIES_FILE, 'utf8')) as CityData[];

function cityBySlug(slug: string): CityData {
  const city = cities.find((candidate) => candidate.slug === slug);
  assert.ok(city, `no existe la ciudad ${slug}`);
  return city;
}

describe('Datos importados de Atlas ZBE', () => {
  it('Madrid multa y prohíbe a los vehículos sin etiqueta', () => {
    const madrid = cityBySlug('madrid');
    assert.equal(madrid.enforcement?.state, 'sanciona');
    assert.equal(madrid.rules.SIN_ETIQUETA.status, 'banned');
  });

  it('las ciudades del inventario del MITECO no tienen polígono ni restricciones', () => {
    const miteco = cities.filter((city) => city.enforcement?.source === 'miteco');
    assert.ok(miteco.length > 0, 'se esperaban ciudades del inventario del MITECO');
    for (const city of miteco) {
      assert.ok(!city.polygon, `${city.name} no debe tener polygon`);
      assert.ok(!city.geoJSON, `${city.name} no debe tener geoJSON`);
      for (const rule of Object.values(city.rules)) {
        assert.equal(rule.status, 'allowed', `${city.name} no debe tener restricciones`);
      }
    }
  });

  it('las ciudades sin municipio en Atlas ZBE tienen enforcement null', () => {
    for (const slug of CITIES_WITHOUT_MUNICIPALITY) {
      assert.equal(cityBySlug(slug).enforcement, null, `${slug} debe tener enforcement null`);
    }
  });

  it('ningún motivo de las reglas contiene "undefined" ni "null"', () => {
    for (const city of cities) {
      for (const [badge, rule] of Object.entries(city.rules)) {
        assert.doesNotMatch(rule.reason, FORBIDDEN_REASON_TEXT, `${city.name} (${badge}): ${rule.reason}`);
      }
    }
  });

  it('todas las fechas del calendario son ISO válidas', () => {
    for (const city of cities) {
      if (city.enforcement?.source !== 'atlaszbe') continue;
      for (const entry of city.enforcement.calendar) {
        assert.match(entry.date, ISO_DATE, `${city.name}: fecha ${entry.date}`);
        assert.ok(!Number.isNaN(Date.parse(entry.date)), `${city.name}: fecha inválida ${entry.date}`);
      }
    }
  });

  it('las cuatro ciudades con perímetro oficial de Z8 conservan su geometría', () => {
    for (const slug of ['barcelona', 'valencia', 'zaragoza', 'malaga']) {
      const city = cityBySlug(slug);
      assert.ok(city.polygon && city.polygon.length > 0, `${slug} perdió su polígono`);
      assert.notEqual(city.perimeterSource?.name, 'Atlas ZBE (geometría oficial)', `${slug} debe usar la fuente de Z8`);
      assert.equal(city.enforcement?.source, 'atlaszbe');
    }
  });
});

describe('Cobertura de enforcement y estado por zona más severa', () => {
  it('solo las 7 ciudades sin municipio tienen enforcement null', () => {
    const withoutEnforcement = cities.filter((city) => city.enforcement === null).map((city) => city.slug);
    assert.deepEqual(withoutEnforcement.sort(), [...CITIES_WITHOUT_MUNICIPALITY].sort());
    assert.ok(cities.every((city) => city.enforcement !== undefined));
  });

  it('Zaragoza multa aunque su zona mayor no restrinja y restringe a los sin etiqueta', () => {
    const zaragoza = cityBySlug('zaragoza');
    assert.equal(zaragoza.enforcement?.state, 'sanciona');
    assert.equal(zaragoza.status, 'activa');
    assert.equal(zaragoza.rules.SIN_ETIQUETA.status, 'restricted');
  });

  it('Salamanca multa y no se queda en allowed por tener una zona mayor sin restricciones', () => {
    const salamanca = cityBySlug('salamanca');
    assert.equal(salamanca.enforcement?.state, 'sanciona');
    assert.notEqual(salamanca.rules.SIN_ETIQUETA.status, 'allowed');
  });

  it('las ciudades con enforcement tienen los textos antiguos limpiados', () => {
    for (const city of cities.filter((candidate) => candidate.enforcement?.source === 'atlaszbe' && candidate.enforcement.state !== 'sin_verificar')) {
      assert.equal(city.noticePeriod, null, `${city.slug}: noticePeriod`);
      assert.equal(city.parkingCondition, null, `${city.slug}: parkingCondition`);
    }
  });
});

const APPROXIMATE_SOURCE_NAME = 'Atlas ZBE (contorno de la DGT)';
const APPROXIMATE_CITIES_COUNT = 49;
const MAX_VERTICES_PER_CITY = 800;
/** Estado de las ZBE sin verificar antes de importar su geometría: reglas y textos no deben cambiar. */
const UNVERIFIED_CITIES_WITH_GEOMETRY: Record<string, { status: string; schedule: string }> = {
  'rivas-vaciamadrid': { status: 'activa', schedule: 'De lunes a viernes de 08:30 a 09:15 y de 13:30 a 14:15, excepto festivos' },
  majadahonda: { status: 'en_tramitacion', schedule: 'Todos los días a todas horas' },
  estepona: { status: 'activa', schedule: 'Todos los días de 08:00 a 21:00' },
};


describe('Perímetros aproximados de Atlas ZBE (Z9.5)', () => {
  it('las ciudades con perímetro aproximado lo marcan con precision y nombre de fuente', () => {
    const approximate = cities.filter((city) => city.perimeterSource?.precision === 'aproximada');
    assert.equal(approximate.length, APPROXIMATE_CITIES_COUNT);
    for (const city of approximate) {
      assert.ok(city.polygon && city.polygon.length > 0, `${city.slug} debe tener polygon`);
      assert.equal(city.perimeterSource?.name, APPROXIMATE_SOURCE_NAME, city.slug);
    }
  });

  it('las cuatro ciudades de Z8 tienen precision oficial', () => {
    for (const slug of ['barcelona', 'valencia', 'zaragoza', 'malaga']) {
      assert.equal(cityBySlug(slug).perimeterSource?.precision, 'oficial', slug);
    }
  });

  it('toda ciudad de Atlas ZBE tiene polygon', () => {
    const withoutPolygon = cities
      .filter((city) => city.enforcement?.source === 'atlaszbe' && !city.polygon)
      .map((city) => city.slug);
    assert.deepEqual(withoutPolygon, []);
  });

  it('ninguna ciudad supera los 800 vértices', () => {
    for (const city of cities) {
      assert.ok((city.polygon?.length ?? 0) <= MAX_VERTICES_PER_CITY, `${city.slug}: ${city.polygon?.length} vértices`);
    }
  });
});

describe('ZBE sin verificar con geometría', () => {
  it('reciben polígono y conservan sus reglas y textos anteriores', () => {
    for (const [slug, expected] of Object.entries(UNVERIFIED_CITIES_WITH_GEOMETRY)) {
      const city = cityBySlug(slug);
      assert.equal(city.enforcement?.state, 'sin_verificar', slug);
      assert.ok(city.polygon && city.polygon.length > 0, slug + ' debe tener polygon');
      assert.equal(city.status, expected.status, slug);
      assert.equal(city.schedule, expected.schedule, slug);
      assert.equal(city.rules.SIN_ETIQUETA.status, 'banned', slug);
      assert.match(city.rules.SIN_ETIQUETA.reason, /^Prohibido el acceso y circulación en la ZBE de /, slug);
      assert.equal(city.sourceName, 'ZBE ' + city.name + ' (fuente oficial, vía Atlas ZBE)', slug);
    }
  });
});
