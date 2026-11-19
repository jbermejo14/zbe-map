import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const MAX_VERTICES_PER_CITY = 800;
const SPAIN_LAT_RANGE = [27, 44];
const SPAIN_LNG_RANGE = [-19, 5];
const OFFICIAL_SLUGS = ['barcelona', 'valencia', 'zaragoza', 'malaga'];

const cities: any[] = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/zbe-cities.json'), 'utf8'));

function cityBySlug(slug: string): any {
  const city = cities.find((candidate) => candidate.slug === slug);
  assert.ok(city, `No existe la ciudad ${slug}`);
  return city;
}

function collectPositions(coordinates: any): number[][] {
  if (typeof coordinates[0] === 'number') return [coordinates];
  return coordinates.flatMap(collectPositions);
}

function cityPositions(city: any): number[][] {
  return city.geoJSON.features.flatMap((feature: any) => collectPositions(feature.geometry.coordinates));
}

describe('Perímetros oficiales (Z8)', () => {
  it('las cuatro ciudades tienen perimeterSource', () => {
    for (const slug of OFFICIAL_SLUGS) {
      const source = cityBySlug(slug).perimeterSource;
      assert.ok(source?.name && source.url && source.retrieved, `Falta perimeterSource en ${slug}`);
    }
  });

  it('el área de cada ciudad coincide con la capa oficial', () => {
    const expectedRanges: Record<string, [number, number]> = {
      barcelona: [76, 79],
      valencia: [26, 29],
      malaga: [3.5, 4.5],
    };
    for (const [slug, [min, max]] of Object.entries(expectedRanges)) {
      const area = cityBySlug(slug).areaKm2;
      assert.ok(area >= min && area <= max, `${slug}: areaKm2 ${area} fuera de ${min}-${max}`);
    }
  });

  it('Zaragoza tiene 2 entidades y Málaga 4', () => {
    assert.equal(cityBySlug('zaragoza').geoJSON.features.length, 2);
    assert.equal(cityBySlug('malaga').geoJSON.features.length, 4);
  });

  it('Zaragoza tiene área positiva y un polígono cerrado', () => {
    const zaragoza = cityBySlug('zaragoza');
    assert.ok(zaragoza.areaKm2 > 0, `areaKm2 ${zaragoza.areaKm2}`);
    assert.deepEqual(zaragoza.polygon[0], zaragoza.polygon[zaragoza.polygon.length - 1]);
  });

  it('ninguna ciudad pasa de 800 vértices', () => {
    for (const slug of OFFICIAL_SLUGS) {
      const count = cityPositions(cityBySlug(slug)).length;
      assert.ok(count <= MAX_VERTICES_PER_CITY, `${slug} tiene ${count} vértices`);
    }
  });

  it('todas las coordenadas están dentro de España', () => {
    for (const slug of OFFICIAL_SLUGS) {
      for (const [lng, lat] of cityPositions(cityBySlug(slug))) {
        assert.ok(lat >= SPAIN_LAT_RANGE[0] && lat <= SPAIN_LAT_RANGE[1], `${slug}: lat ${lat}`);
        assert.ok(lng >= SPAIN_LNG_RANGE[0] && lng <= SPAIN_LNG_RANGE[1], `${slug}: lng ${lng}`);
      }
    }
  });
});
