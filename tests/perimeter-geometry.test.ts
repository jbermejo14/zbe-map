import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseGpkgGeometry,
  ringAreaKm2,
  roundCoordinate,
  simplifyRing,
  utmToWgs84,
} from '../lib/perimeter-geometry.ts';
import type { LngLatPoint } from '../lib/perimeter-geometry.ts';

const COORDINATE_TOLERANCE_DEGREES = 1e-6;
const GPKG_HEADER_BYTES = 8;
const WKB_POLYGON_TYPE = 3;
const WKB_MULTIPOLYGON_TYPE = 6;
const WKB_Z_OFFSET = 1000;
const WKB_SAMPLE_HEIGHT = 42;
const CIRCLE_POINT_COUNT = 20000;
const CIRCLE_RADIUS_DEGREES = 0.05;
const FLAGS_LITTLE_ENDIAN_NO_ENVELOPE = 0x01;
const FLAGS_LITTLE_ENDIAN_ENVELOPE_XY = 0x03;
const ENVELOPE_XY_BYTES = 32;

interface GpkgOptions {
  littleEndian?: boolean;
  flags?: number;
  envelopeBytes?: number;
  withZ?: boolean;
}

function writeWkbPolygon(view: DataView, start: number, rings: number[][][], options: GpkgOptions): number {
  const littleEndian = options.littleEndian ?? true;
  const pointBytes = options.withZ ? 24 : 16;
  let offset = start;
  view.setUint8(offset, littleEndian ? 1 : 0);
  view.setUint32(offset + 1, WKB_POLYGON_TYPE + (options.withZ ? WKB_Z_OFFSET : 0), littleEndian);
  view.setUint32(offset + 5, rings.length, littleEndian);
  offset += 9;
  for (const ring of rings) {
    view.setUint32(offset, ring.length, littleEndian);
    offset += 4;
    for (const [x, y] of ring) {
      view.setFloat64(offset, x, littleEndian);
      view.setFloat64(offset + 8, y, littleEndian);
      if (options.withZ) view.setFloat64(offset + 16, WKB_SAMPLE_HEIGHT, littleEndian);
      offset += pointBytes;
    }
  }
  return offset;
}

function polygonBytes(rings: number[][][], options: GpkgOptions): number {
  const pointBytes = options.withZ ? 24 : 16;
  const pointCount = rings.reduce((sum, ring) => sum + ring.length, 0);
  return 9 + rings.length * 4 + pointCount * pointBytes;
}

/** Construye un blob GeoPackage con un Polygon (un solo polígono) o un MultiPolygon (varios). */
function buildGpkg(polygons: number[][][][], options: GpkgOptions = {}, multi = false): Uint8Array {
  const littleEndian = options.littleEndian ?? true;
  const envelopeBytes = options.envelopeBytes ?? 0;
  const defaultFlags = littleEndian ? FLAGS_LITTLE_ENDIAN_NO_ENVELOPE : 0;
  const multiHeaderBytes = multi ? 9 : 0;
  const body = polygons.reduce((sum, rings) => sum + polygonBytes(rings, options), 0);
  const bytes = new Uint8Array(GPKG_HEADER_BYTES + envelopeBytes + multiHeaderBytes + body);
  const view = new DataView(bytes.buffer);
  bytes.set([0x47, 0x50, 0, options.flags ?? defaultFlags]);
  let offset = GPKG_HEADER_BYTES + envelopeBytes;
  if (multi) {
    view.setUint8(offset, littleEndian ? 1 : 0);
    view.setUint32(offset + 1, WKB_MULTIPOLYGON_TYPE, littleEndian);
    view.setUint32(offset + 5, polygons.length, littleEndian);
    offset += multiHeaderBytes;
  }
  for (const rings of polygons) offset = writeWkbPolygon(view, offset, rings, options);
  return bytes;
}

describe('utmToWgs84', () => {
  it('reproduce el primer vértice de Valencia (EPSG:25830 a EPSG:4326)', () => {
    const { lat, lng } = utmToWgs84(30, 729254.0972, 4372169.142);
    assert.ok(Math.abs(lat - 39.468590647) < COORDINATE_TOLERANCE_DEGREES, `lat ${lat}`);
    assert.ok(Math.abs(lng - -0.334989633) < COORDINATE_TOLERANCE_DEGREES, `lng ${lng}`);
  });
});

describe('parseGpkgGeometry', () => {
  const square = [
    [
      [1, 2],
      [3, 2],
      [3, 4],
      [1, 2],
    ],
  ];

  it('lee un Polygon WKB little-endian sin envoltura', () => {
    const blob = buildGpkg([square]);
    assert.deepEqual(parseGpkgGeometry(blob), [square]);
  });

  it('salta la envoltura indicada en los flags', () => {
    const blob = buildGpkg([square], { flags: FLAGS_LITTLE_ENDIAN_ENVELOPE_XY, envelopeBytes: ENVELOPE_XY_BYTES });
    assert.deepEqual(parseGpkgGeometry(blob), [square]);
  });

  it('lee un Polygon big-endian', () => {
    assert.deepEqual(parseGpkgGeometry(buildGpkg([square], { littleEndian: false })), [square]);
  });

  it('lee un MultiPolygon con dos Polygon', () => {
    const other = [
      [
        [5, 6],
        [7, 6],
        [7, 8],
        [5, 6],
      ],
    ];
    assert.deepEqual(parseGpkgGeometry(buildGpkg([square, other], {}, true)), [square, other]);
  });

  it('descarta la altura de un Polygon con Z', () => {
    assert.deepEqual(parseGpkgGeometry(buildGpkg([square], { withZ: true })), [square]);
  });

  it('lanza un error si el blob está truncado', () => {
    const blob = buildGpkg([square]);
    assert.throws(() => parseGpkgGeometry(blob.slice(0, blob.length - 4)), /truncada/);
    assert.throws(() => parseGpkgGeometry(new Uint8Array(2)), /truncada/);
  });

  it('lanza un error con una cabecera que no es GP', () => {
    const blob = buildGpkg([square]);
    blob.set([0x58, 0x58]);
    assert.throws(() => parseGpkgGeometry(blob), /XX/);
  });

  it('lanza un error con un tipo de geometría no admitido', () => {
    const blob = buildGpkg([square]);
    blob[GPKG_HEADER_BYTES + 1] = 1;
    assert.throws(() => parseGpkgGeometry(blob), /no admitido/);
  });
});

describe('simplifyRing', () => {
  it('quita un punto colineal y conserva el cierre', () => {
    const ring: LngLatPoint[] = [
      [0, 0],
      [0.005, 0],
      [0.01, 0],
      [0.01, 0.01],
      [0, 0.01],
      [0, 0],
    ];
    const result = simplifyRing(ring, 5);
    assert.equal(result.length, 5);
    assert.deepEqual(result[0], result[result.length - 1]);
  });

  it('simplifica un anillo de 20 000 puntos sin error y conserva el cierre', () => {
    const ring: LngLatPoint[] = [];
    for (let index = 0; index < CIRCLE_POINT_COUNT; index++) {
      const angle = (2 * Math.PI * index) / CIRCLE_POINT_COUNT;
      ring.push([CIRCLE_RADIUS_DEGREES * Math.cos(angle), CIRCLE_RADIUS_DEGREES * Math.sin(angle)]);
    }
    ring.push(ring[0]);
    const result = simplifyRing(ring, 5);
    assert.ok(result.length < ring.length);
    assert.deepEqual(result[0], result[result.length - 1]);
  });

  it('no devuelve menos de 4 puntos', () => {
    const ring: LngLatPoint[] = [
      [0, 0],
      [0.001, 0],
      [0.002, 0],
      [0, 0],
    ];
    assert.ok(simplifyRing(ring, 1000).length >= 4);
  });
});

describe('ringAreaKm2', () => {
  it('calcula el área de un cuadrado de 0,01 grados en el ecuador', () => {
    const ring: LngLatPoint[] = [
      [0, 0],
      [0.01, 0],
      [0.01, 0.01],
      [0, 0.01],
      [0, 0],
    ];
    const expectedKm2 = 1.2364;
    assert.ok(Math.abs(ringAreaKm2(ring) - expectedKm2) / expectedKm2 < 0.001);
  });
});

describe('roundCoordinate', () => {
  it('redondea a 6 decimales', () => {
    assert.equal(roundCoordinate(1.23456789), 1.234568);
  });
});
