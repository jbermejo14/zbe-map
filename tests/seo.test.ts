import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cityMetaDescription, cityMetaTitle } from '../lib/seo.ts';
import { META_DESCRIPTION_MAX_LENGTH } from '../lib/badge-page-insights.ts';
import { TITLE_MAX_LENGTH } from '../lib/seo-metadata.ts';
import type { CityEnforcement } from '../lib/cities-repository.ts';

type SeoTestCity = Parameters<typeof cityMetaDescription>[0];

const SEO_YEAR = 2026;
const SEO_DEFAULT_SCHEDULE = 'Todos los días a todas horas';

function seoAtlas(state: 'sanciona' | 'aviso' | 'sin_verificar', label: string): CityEnforcement {
  return {
    source: 'atlaszbe',
    state,
    label,
    sentence: 'x',
    finesFrom: null,
    warningUntil: null,
    nextChange: null,
    confidence: 'alta',
    verifiedOn: null,
    officialUrl: null,
    earlyPaymentAmount: null,
    importedOn: '2026-11-19',
    mainZoneName: 'Z',
    calendar: [],
  };
}

function seoCity(enforcement: CityEnforcement | null, schedule = SEO_DEFAULT_SCHEDULE): SeoTestCity {
  return { name: 'Lugo', province: 'Lugo', schedule, fineAmount: 200, enforcement };
}

describe('cityMetaDescription', () => {
  it('sin enforcement y verificada: texto actual con multa, recortado al máximo', () => {
    const text = cityMetaDescription(seoCity(null), true);
    assert.ok(text.length <= META_DESCRIPTION_MAX_LENGTH);
    assert.ok(text.startsWith('Normativa y restricciones de la Zona de Bajas Emisiones en Lugo (Lugo). Horario (Todos los días a todas horas), multa de 200 €,'));
  });

  it('sin enforcement y no verificada: texto orientativo', () => {
    assert.match(cityMetaDescription(seoCity(null), false), /^Normas orientativas de la Zona/);
  });

  it('sanciona y sin_verificar conservan el texto actual', () => {
    for (const state of ['sanciona', 'sin_verificar'] as const) {
      assert.match(cityMetaDescription(seoCity(seoAtlas(state, 'x')), true), /multa de 200 €/, state);
    }
  });

  it('atlaszbe sin multa: label en minúscula y horario', () => {
    assert.equal(
      cityMetaDescription(seoCity(seoAtlas('aviso', 'Periodo de aviso')), true),
      'Zona de Bajas Emisiones de Lugo (Lugo): periodo de aviso. Horario: Todos los días a todas horas. Exenciones y acceso por etiqueta DGT.',
    );
  });

  it('atlaszbe sin restricciones: omite el horario', () => {
    const text = cityMetaDescription(seoCity(seoAtlas('aviso', 'Suspendida'), 'Sin restricciones en vigor'), true);
    assert.equal(text, 'Zona de Bajas Emisiones de Lugo (Lugo): suspendida. Exenciones y acceso por etiqueta DGT, con el mapa y la normativa de la zona.');
  });

  it('miteco: texto de acceso con cierre largo para llegar a 120 caracteres', () => {
    const miteco: CityEnforcement = {
      source: 'miteco',
      state: 'en_tramite',
      label: 'En tramitación',
      sentence: 'x',
      inventoryUpdated: '2026-09-30',
      importedOn: '2026-11-19',
    };
    assert.equal(
      cityMetaDescription(seoCity(miteco), true),
      'Zona de Bajas Emisiones de Lugo (Lugo): en tramitación. Consulta el acceso por etiqueta DGT, las exenciones y el mapa de la zona.',
    );
  });

  it('nunca supera el máximo', () => {
    const long = seoCity(seoAtlas('aviso', 'Periodo de aviso'), 'x '.repeat(100).trim());
    assert.ok(cityMetaDescription(long, true).length <= META_DESCRIPTION_MAX_LENGTH);
  });
});

describe('cityMetaTitle', () => {
  it('con multa dice Multas', () => {
    assert.match(cityMetaTitle(seoCity(null), true, SEO_YEAR), /Multas/);
    assert.match(cityMetaTitle(seoCity(seoAtlas('sanciona', 'x')), true, SEO_YEAR), /Multas/);
  });

  it('sin multa usa la variante neutra', () => {
    const title = cityMetaTitle(seoCity(seoAtlas('aviso', 'x')), true, SEO_YEAR);
    assert.equal(title, 'ZBE Lugo 2026: Mapa, Horarios y Normativa DGT | Ododex');
  });

  it('cede variantes en vez de truncar cuando el nombre es largo', () => {
    const long = { ...seoCity(null), name: 'San Vicente del Raspeig de la Frontera' };
    const title = cityMetaTitle(long, true, SEO_YEAR);
    assert.ok(title.length <= TITLE_MAX_LENGTH, title);
    assert.ok(title.startsWith('ZBE San Vicente del Raspeig de la Frontera 2026'), title);
    assert.ok(title.endsWith(' | Ododex'), title);
  });

  it('no verificada no menciona multas', () => {
    assert.doesNotMatch(cityMetaTitle(seoCity(null), false, SEO_YEAR), /Multas/);
  });
});
