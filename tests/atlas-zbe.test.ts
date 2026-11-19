import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  badgeAccessFromAtlas,
  calendarEntries,
  enforcementSummary,
  exemptionsFromZone,
  formatSpanishDate,
  inventorySummary,
  isRuleActive,
  matchCityToMunicipality,
  pickMainZone,
  ruleSentence,
  scheduleText,
  zonesSummary,
  cityEnforcementZone,
  groupedRuleTexts,
  zoneNameForRule,
  ATLAS_INE_OVERRIDES,
} from '../lib/atlas-zbe.ts';
import type { AtlasMunicipality, AtlasRule, AtlasSanctionState, AtlasZone } from '../lib/atlas-zbe.ts';

const ALL_DAY = { dias: 'L-D' as const, tramos: [{ desde: '00:00', hasta: '24:00' }], festivos: true };
const ON_DATE = '2026-11-19';

function makeRule(overrides: Partial<AtlasRule> = {}): AtlasRule {
  return {
    acceso: 'prohibido',
    alcance: 'zona',
    etiquetas: ['A'],
    perfil: 'todos',
    vehiculos: 'todos',
    condicion: 'siempre',
    sanciona: true,
    desde: '2025-01-01',
    hasta: null,
    horario: ALL_DAY,
    nota: null,
    ...overrides,
  };
}

function makeSquare(sizeDegrees: number) {
  const ring = [[0, 0], [sizeDegrees, 0], [sizeDegrees, sizeDegrees], [0, sizeDegrees], [0, 0]];
  return { type: 'Polygon' as const, coordinates: [ring] };
}

function makeZone(overrides: Partial<AtlasZone> = {}): AtlasZone {
  return {
    id: 'zona',
    nombre: 'Zona principal',
    municipioIne: '00000',
    municipio: 'Ciudad',
    estado: 'activa',
    estadoSancion: 'sanciona',
    fechas: { multasDesde: null, avisosHasta: null, proximoCambio: null },
    confianza: 'alta',
    reglas: [],
    editorial: null,
    urlOficial: null,
    verificadoEl: null,
    geometria: makeSquare(1),
    geometriaPrecision: 'oficial',
    ...overrides,
  };
}

function makeMunicipality(ine: string, nombre: string): AtlasMunicipality {
  return { ine, nombre, provincia: 'P', ccaa: 'C', estadoInventario: 'vigente', zonas: [], inventarioActualizado: '2026-10-01' };
}

describe('matchCityToMunicipality', () => {
  const municipalities = [
    makeMunicipality('03009', 'Alcoi/Alcoy'),
    makeMunicipality('04029', 'Ejido, El'),
    makeMunicipality('07040', 'Palma'),
    makeMunicipality('20069', 'Donostia/San Sebastián'),
  ];

  it('empareja "Alcoy / Alcoi" con "Alcoi/Alcoy"', () => {
    const found = matchCityToMunicipality({ slug: 'alcoy', name: 'Alcoy / Alcoi' }, municipalities, {});
    assert.equal(found?.ine, '03009');
  });

  it('empareja "El Ejido" con "Ejido, El"', () => {
    const found = matchCityToMunicipality({ slug: 'el-ejido', name: 'El Ejido' }, municipalities, {});
    assert.equal(found?.ine, '04029');
  });

  it('empareja por una parte separada por " - " y sin tildes', () => {
    const found = matchCityToMunicipality({ slug: 'san-sebastian', name: 'San Sebastian - Donostia' }, municipalities, {});
    assert.equal(found?.ine, '20069');
  });

  it('el override por slug tiene prioridad sobre el nombre', () => {
    const found = matchCityToMunicipality({ slug: 'palma', name: 'Palma de Mallorca' }, municipalities, ATLAS_INE_OVERRIDES);
    assert.equal(found?.ine, '07040');
    const other = matchCityToMunicipality({ slug: 'alcoy', name: 'Alcoy' }, municipalities, { alcoy: '04029' });
    assert.equal(other?.ine, '04029');
  });

  it('devuelve null si no hay coincidencia', () => {
    assert.equal(matchCityToMunicipality({ slug: 'teruel', name: 'Teruel' }, municipalities, {}), null);
  });
});

describe('isRuleActive', () => {
  it('desde y hasta son inclusivos (hasta es el último día en vigor)', () => {
    const rule = makeRule({ desde: '2026-11-19', hasta: '2026-12-01' });
    assert.equal(isRuleActive(rule, '2026-11-18'), false);
    assert.equal(isRuleActive(rule, '2026-11-19'), true);
    assert.equal(isRuleActive(rule, '2026-11-30'), true);
    assert.equal(isRuleActive(rule, '2026-12-01'), true);
    assert.equal(isRuleActive(rule, '2026-12-02'), false);
  });

  it('fechas null no limitan', () => {
    assert.equal(isRuleActive(makeRule({ desde: null, hasta: null }), ON_DATE), true);
  });

  it('una fecha con hora cuenta como su día', () => {
    assert.equal(isRuleActive(makeRule({ desde: '2025-02-15T02:00:00.000+01:00' }), '2025-02-15'), true);
  });
});

describe('pickMainZone', () => {
  it('elige la de mayor área y, en empate, la primera', () => {
    const small = makeZone({ id: 'small', geometria: makeSquare(0.1) });
    const big = makeZone({ id: 'big', geometria: makeSquare(0.5) });
    const equalBig = makeZone({ id: 'equal', geometria: makeSquare(0.5) });
    assert.equal(pickMainZone([small, big, equalBig]).id, 'big');
  });

  it('suma los anillos de un MultiPolygon', () => {
    const ring = (size: number) => [[[0, 0], [size, 0], [size, size], [0, size], [0, 0]]];
    const multi = makeZone({
      id: 'multi',
      geometria: { type: 'MultiPolygon', coordinates: [ring(0.3), ring(0.3)] },
    });
    const single = makeZone({ id: 'single', geometria: makeSquare(0.35) });
    assert.equal(pickMainZone([single, multi]).id, 'multi');
  });
});

describe('badgeAccessFromAtlas', () => {
  it('banned si la zona principal prohíbe a todos en toda la zona', () => {
    const main = makeZone({ reglas: [makeRule()] });
    const result = badgeAccessFromAtlas('SIN_ETIQUETA', [main], main, ON_DATE);
    assert.equal(result.status, 'banned');
    assert.equal(result.rules.length, 1);
  });

  it('no_domiciliados también es banned', () => {
    const main = makeZone({ reglas: [makeRule({ perfil: 'no_domiciliados' })] });
    assert.equal(badgeAccessFromAtlas('SIN_ETIQUETA', [main], main, ON_DATE).status, 'banned');
  });

  it('restricted si la prohibición está en una subzona', () => {
    const main = makeZone({ reglas: [] });
    const subzone = makeZone({ id: 'sub', geometria: makeSquare(0.1), reglas: [makeRule()] });
    const result = badgeAccessFromAtlas('SIN_ETIQUETA', [main, subzone], main, ON_DATE);
    assert.equal(result.status, 'restricted');
    assert.equal(result.rules.length, 1);
  });

  it('restricted por solo_aparcamiento', () => {
    const main = makeZone({ reglas: [makeRule({ acceso: 'solo_aparcamiento', etiquetas: ['B', 'C'] })] });
    assert.equal(badgeAccessFromAtlas('B', [main], main, ON_DATE).status, 'restricted');
  });

  it('restricted por perfil domiciliados o calles señalizadas', () => {
    const domiciled = makeZone({ reglas: [makeRule({ perfil: 'domiciliados' })] });
    assert.equal(badgeAccessFromAtlas('SIN_ETIQUETA', [domiciled], domiciled, ON_DATE).status, 'restricted');
    const streets = makeZone({ reglas: [makeRule({ alcance: 'calles_senalizadas' })] });
    assert.equal(badgeAccessFromAtlas('SIN_ETIQUETA', [streets], streets, ON_DATE).status, 'restricted');
  });

  it('allowed si la regla es de episodios de contaminación', () => {
    const main = makeZone({ reglas: [makeRule({ condicion: 'episodio_contaminacion' })] });
    assert.equal(badgeAccessFromAtlas('SIN_ETIQUETA', [main], main, ON_DATE).status, 'allowed');
  });

  it('allowed si la regla empieza en el futuro o la etiqueta no está incluida', () => {
    const main = makeZone({ reglas: [makeRule({ desde: '2030-01-01' })] });
    assert.equal(badgeAccessFromAtlas('SIN_ETIQUETA', [main], main, ON_DATE).status, 'allowed');
    const other = makeZone({ reglas: [makeRule({ etiquetas: ['B'] })] });
    assert.equal(badgeAccessFromAtlas('ECO', [other], other, ON_DATE).status, 'allowed');
  });

  it('una regla sin etiquetas (null) afecta a todas, pero solo restringe', () => {
    const main = makeZone({ reglas: [makeRule({ etiquetas: null, acceso: 'solo_autorizados' })] });
    assert.equal(badgeAccessFromAtlas('CERO', [main], main, ON_DATE).status, 'restricted');
  });
});

describe('ruleSentence', () => {
  const ctx = { cityName: 'Madrid', zoneName: null };

  it('redacta el ejemplo de Madrid', () => {
    const rule = makeRule({ vehiculos: { tipos: ['turismo'] }, perfil: 'no_domiciliados' });
    assert.equal(
      ruleSentence(rule, ctx),
      'Desde el 1 de enero de 2025, los turismos sin etiqueta no domiciliados en Madrid no pueden circular, todos los días a todas horas.',
    );
  });

  it('usa plurales de tipos y etiquetas compartiendo "con etiqueta"', () => {
    const rule = makeRule({
      desde: null,
      etiquetas: ['C', 'B', 'A'],
      vehiculos: { tipos: ['turismo', 'furgoneta', 'camion'], combustible: 'diesel' },
      acceso: 'condicionado',
    });
    assert.equal(
      ruleSentence(rule, ctx),
      'Los turismos, camiones y furgonetas diésel sin etiqueta y con etiqueta B y C pueden entrar con condiciones, todos los días a todas horas.',
    );
  });

  it('menciona la zona, el combustible y la etiqueta 0', () => {
    const rule = makeRule({
      desde: null,
      etiquetas: ['0', 'ECO'],
      vehiculos: { combustible: 'gasolina' },
      acceso: 'solo_autorizados',
      perfil: 'domiciliados',
    });
    assert.equal(
      ruleSentence(rule, { cityName: 'Madrid', zoneName: 'Distrito Centro' }),
      'Los vehículos de gasolina con etiqueta ECO y 0 CERO domiciliados en Madrid solo pueden entrar con autorización en Distrito Centro, todos los días a todas horas.',
    );
  });

  it('añade calles señalizadas, residentes en la zona y el aviso', () => {
    const rule = makeRule({
      desde: '2025-09-15',
      alcance: 'calles_senalizadas',
      perfil: 'residentes_zona',
      sanciona: false,
      horario: { dias: 'L-V', tramos: [{ desde: '07:00', hasta: '20:00' }], festivos: false },
    });
    assert.equal(
      ruleSentence(rule, ctx),
      'Desde el 15 de septiembre de 2025, los vehículos sin etiqueta que no residen en la zona no pueden circular en las calles señalizadas, de lunes a viernes de 07:00 a 20:00, excepto festivos (en periodo de aviso, sin multa).',
    );
  });
});

describe('scheduleText y formatSpanishDate', () => {
  it('cubre los días, los tramos y los festivos', () => {
    assert.equal(scheduleText(ALL_DAY), 'Todos los días a todas horas');
    assert.equal(
      scheduleText({ dias: 'L-V', tramos: [{ desde: '07:00', hasta: '20:00' }], festivos: false }),
      'De lunes a viernes de 07:00 a 20:00, excepto festivos',
    );
    assert.equal(
      scheduleText({
        dias: 'L-S',
        tramos: [{ desde: '07:00', hasta: '10:00' }, { desde: '17:00', hasta: '20:00' }],
        festivos: true,
      }),
      'De lunes a sábado de 07:00 a 10:00 y de 17:00 a 20:00',
    );
    assert.equal(scheduleText(null), 'Horario no especificado');
  });

  it('formatea fechas en español', () => {
    assert.equal(formatSpanishDate('2025-01-01'), '1 de enero de 2025');
    assert.equal(formatSpanishDate('2026-12-31'), '31 de diciembre de 2026');
    assert.throws(() => formatSpanishDate('01/01/2025'), /Fecha ISO no válida/);
  });
});

describe('enforcementSummary e inventorySummary', () => {
  function summaryFor(state: AtlasSanctionState, fechas: Partial<AtlasZone['fechas']> = {}) {
    const zone = makeZone({
      estadoSancion: state,
      fechas: { multasDesde: null, avisosHasta: null, proximoCambio: null, ...fechas },
    });
    return enforcementSummary(zone);
  }

  it('redacta todos los estados', () => {
    assert.deepEqual(summaryFor('sanciona', { multasDesde: '2025-01-01' }), {
      state: 'sanciona',
      label: 'Se multa',
      sentence: 'Las restricciones están en vigor y se multa desde el 1 de enero de 2025.',
    });
    assert.equal(summaryFor('sanciona').sentence, 'Las restricciones están en vigor y se multa.');
    assert.equal(
      summaryFor('aviso', { avisosHasta: '2027-03-01' }).sentence,
      'Hay restricciones, pero en periodo de aviso: todavía no se multa. El aviso termina el 1 de marzo de 2027.',
    );
    assert.equal(summaryFor('aviso').label, 'Periodo de aviso');
    assert.equal(summaryFor('aviso').sentence, 'Hay restricciones, pero en periodo de aviso: todavía no se multa.');
    assert.equal(
      summaryFor('aprobada_sin_aplicar', { proximoCambio: { fecha: '2027-01-01' }, multasDesde: '2028-01-01' }).sentence,
      'La ZBE está aprobada, pero las restricciones empiezan más adelante, el 1 de enero de 2027.',
    );
    assert.equal(
      summaryFor('aprobada_sin_aplicar', { multasDesde: '2028-01-01' }).sentence,
      'La ZBE está aprobada, pero las restricciones empiezan más adelante, el 1 de enero de 2028.',
    );
    assert.equal(summaryFor('aprobada_sin_aplicar').sentence, 'La ZBE está aprobada, pero las restricciones empiezan más adelante.');
    assert.equal(summaryFor('solo_episodios').label, 'Solo en episodios');
    assert.equal(summaryFor('suspendida').sentence, 'La ZBE está anulada o suspendida: ahora no hay restricciones.');
    assert.equal(summaryFor('sin_restricciones').label, 'Sin restricciones');
    assert.equal(summaryFor('sin_verificar').sentence, 'El estado de esta ZBE no está confirmado.');
  });

  it('redacta el inventario del MITECO', () => {
    const inTransit = { ...makeMunicipality('1', 'Gijón'), estadoInventario: 'en_tramite' as const };
    assert.deepEqual(inventorySummary(inTransit), {
      state: 'en_tramite',
      label: 'En tramitación',
      sentence: 'Gijón tiene la ZBE en tramitación: todavía no hay restricciones de acceso por etiqueta.',
    });
    const pending = { ...makeMunicipality('2', 'Ejido, El'), estadoInventario: 'pendiente' as const };
    assert.equal(
      inventorySummary(pending, 'El Ejido').sentence,
      'El Ejido aún no ha aprobado su ZBE: todavía no hay restricciones de acceso por etiqueta.',
    );
    assert.equal(inventorySummary(pending).label, 'Pendiente');
    assert.throws(() => inventorySummary(makeMunicipality('3', 'Otra')), /solo admite/);
  });
});

describe('calendarEntries', () => {
  const main = makeZone({
    nombre: 'Zona principal',
    fechas: { multasDesde: '2025-06-01', avisosHasta: '2025-05-31', proximoCambio: { fecha: '2030-01-01' } },
    reglas: [
      makeRule({ desde: '2030-01-01', etiquetas: ['B'] }),
      makeRule({ desde: '2025-01-01', etiquetas: ['A'], vehiculos: { tipos: ['turismo'] } }),
      makeRule({ desde: null }),
    ],
  });
  const subzone = makeZone({
    id: 'sub',
    nombre: 'Distrito Centro',
    reglas: [makeRule({ desde: '2025-01-01', etiquetas: ['A'], vehiculos: { tipos: ['moto'] } })],
  });

  it('ordena por fecha y añade los hitos generales', () => {
    const entries = calendarEntries([main, subzone], main, 'Madrid');
    assert.deepEqual(
      entries.map((entry) => entry.date),
      ['2025-01-01', '2025-01-01', '2025-05-31', '2025-06-01', '2030-01-01', '2030-01-01'],
    );
    assert.equal(
      entries[0].text,
      'Los turismos sin etiqueta no pueden circular en Zona principal, todos los días a todas horas.',
    );
    assert.match(entries[1].text, /^Las motos sin etiqueta no pueden circular en Distrito Centro/);
    assert.deepEqual(entries[0].badges, ['SIN_ETIQUETA']);
    assert.equal(entries[2].text, 'Termina el periodo de aviso.');
    assert.deepEqual(entries[3], { date: '2025-06-01', text: 'Empiezan las multas.', badges: [] });
    assert.equal(entries.at(-1)?.text, 'Próximo cambio previsto en la ZBE.');
  });

  it('conserva las entradas por etiqueta para filtrarlas', () => {
    const entries = calendarEntries([main], main, 'Madrid');
    const forB = entries.filter((entry) => entry.badges.length === 0 || entry.badges.includes('B'));
    assert.equal(forB.some((entry) => entry.badges.includes('SIN_ETIQUETA')), false);
    assert.equal(forB.some((entry) => entry.badges.includes('B')), true);
  });

  it('agrupa las reglas repetidas en varias zonas y nombra solo las que las tienen', () => {
    const rule = () => makeRule({ desde: '2025-01-01' });
    const zones = [
      makeZone({ nombre: 'Zona 1', reglas: [rule()] }),
      makeZone({ nombre: 'Zona 2', reglas: [rule()] }),
      makeZone({ nombre: 'Zona 3', reglas: [] }),
    ];
    const entries = calendarEntries(zones, zones[0], 'Madrid').filter((entry) => entry.badges.length > 0);
    assert.equal(entries.length, 1);
    assert.match(entries[0].text, /en Zona 1 y Zona 2,/);
  });

  it('no nombra ninguna zona si la regla está en todas', () => {
    const rule = () => makeRule({ desde: '2025-01-01' });
    const zones = [makeZone({ nombre: 'Zona 1', reglas: [rule()] }), makeZone({ nombre: 'Zona 2', reglas: [rule()] })];
    const entries = calendarEntries(zones, zones[0], 'Madrid');
    assert.equal(entries.length, 1);
    assert.equal(entries[0].text, 'Los vehículos sin etiqueta no pueden circular, todos los días a todas horas.');
  });

  it('elimina duplicados exactos', () => {
    const duplicated = makeZone({
      reglas: [makeRule({ desde: '2025-01-01' }), makeRule({ desde: '2025-01-01' })],
    });
    assert.equal(calendarEntries([duplicated], duplicated, 'Madrid').length, 1);
  });
});

describe('reglas sin etiquetas (null)', () => {
  it('nunca producen banned, como mucho restricted', () => {
    const main = makeZone({ reglas: [makeRule({ etiquetas: null, acceso: 'solo_autorizados' })] });
    const result = badgeAccessFromAtlas('CERO', [main], main, ON_DATE);
    assert.equal(result.status, 'restricted');
    assert.equal(result.rules.length, 1);
  });

  it('una regla con etiquetas explícitas sigue dando banned junto a una null', () => {
    const main = makeZone({ reglas: [makeRule({ etiquetas: null }), makeRule({ etiquetas: ['A'] })] });
    assert.equal(badgeAccessFromAtlas('SIN_ETIQUETA', [main], main, ON_DATE).status, 'banned');
  });

  it('la frase dice "todos los vehículos, tengan la etiqueta que tengan,"', () => {
    const rule = makeRule({ etiquetas: null, desde: null, acceso: 'solo_autorizados', perfil: 'no_domiciliados' });
    assert.equal(
      ruleSentence(rule, { cityName: 'Alicante', zoneName: 'Casco histórico' }),
      'Todos los vehículos no domiciliados en Alicante, tengan la etiqueta que tengan, solo pueden entrar con autorización en Casco histórico, todos los días a todas horas.',
    );
  });
});

describe('exemptionsFromZone y zonesSummary', () => {
  it('traduce los tipos, sin duplicados, en orden y sin "otros"', () => {
    const zone = makeZone({
      editorial: { excepciones: [{ tipo: 'pmr' }, { tipo: 'otros' }, { tipo: 'residentes' }, { tipo: 'pmr' }] },
    });
    assert.deepEqual(exemptionsFromZone(zone), ['Personas con movilidad reducida (PMR)', 'Residentes de la zona']);
  });

  it('devuelve lista vacía sin editorial o sin excepciones', () => {
    assert.deepEqual(exemptionsFromZone(makeZone({ editorial: null })), []);
    assert.deepEqual(exemptionsFromZone(makeZone({ editorial: {} })), []);
  });

  it('resume una zona y varias zonas', () => {
    const one = makeZone({ nombre: 'ZBE Centro' });
    assert.equal(zonesSummary('Gijón', [one], 'Frase.'), 'Gijón tiene una zona de bajas emisiones: ZBE Centro. Frase.');
    const zones = [one, makeZone({ nombre: 'ZBE Norte' }), makeZone({ nombre: 'ZBE Sur' })];
    assert.equal(
      zonesSummary('Madrid', zones, 'Frase.'),
      'Madrid tiene 3 zonas de bajas emisiones: ZBE Centro, ZBE Norte y ZBE Sur. Frase.',
    );
  });
});

describe('concordancia de género en los vehículos', () => {
  const ctx = { cityName: 'Madrid', zoneName: null };

  it('pone los masculinos primero aunque la moto o la furgoneta vengan antes', () => {
    const withMoto = makeRule({ desde: null, vehiculos: { tipos: ['moto', 'camion'] } });
    assert.match(ruleSentence(withMoto, ctx), /^Los camiones y motos sin etiqueta/);
    const withVan = makeRule({ desde: null, vehiculos: { tipos: ['furgoneta', 'camion', 'autobus'] } });
    assert.match(ruleSentence(withVan, ctx), /^Los camiones, autobuses y furgonetas sin etiqueta/);
  });

  it('usa "las" si solo hay femeninos', () => {
    const rule = makeRule({ desde: null, vehiculos: { tipos: ['moto', 'furgoneta'] } });
    assert.match(ruleSentence(rule, ctx), /^Las motos y furgonetas sin etiqueta/);
    const anyBadge = makeRule({ desde: null, etiquetas: null, vehiculos: { tipos: ['moto'] } });
    assert.match(ruleSentence(anyBadge, ctx), /^Todas las motos, tengan la etiqueta que tengan, no pueden/);
  });

  it('falla y nombra el campo de vehículos que no entiende', () => {
    const rule = makeRule({ vehiculos: { tipos: ['camion'], mmaMinimaKg: 12000 } as AtlasRule['vehiculos'] });
    assert.throws(() => ruleSentence(rule, ctx), /mmaMinimaKg/);
  });

  it('ignora la nota de vehiculos', () => {
    const rule = makeRule({ desde: null, vehiculos: { tipos: ['turismo'], nota: 'texto' } as AtlasRule['vehiculos'] });
    assert.match(ruleSentence(rule, ctx), /^Los turismos sin etiqueta/);
  });
});

describe('horario null y errores', () => {
  it('una regla sin horario no añade nada a la frase', () => {
    const rule = makeRule({ desde: null, horario: null });
    assert.equal(ruleSentence(rule, { cityName: 'Madrid', zoneName: null }), 'Los vehículos sin etiqueta no pueden circular.');
  });

  it('pickMainZone([]) lanza error', () => {
    assert.throws(() => pickMainZone([]), /al menos una zona/);
  });

  it('formatSpanishDate rechaza fechas con mes inexistente', () => {
    assert.throws(() => formatSpanishDate('2025-13-01'), /Mes no válido/);
  });
});

describe('cityEnforcementZone', () => {
  it('elige la zona más severa aunque no sea la principal', () => {
    const big = makeZone({ id: 'big', geometria: makeSquare(0.5), estadoSancion: 'sin_restricciones' });
    const small = makeZone({ id: 'small', geometria: makeSquare(0.1), estadoSancion: 'sanciona' });
    assert.equal(cityEnforcementZone([big, small]).id, 'small');
  });

  it('en empate gana la principal y después la primera', () => {
    const first = makeZone({ id: 'first', geometria: makeSquare(0.1) });
    const big = makeZone({ id: 'big', geometria: makeSquare(0.5) });
    assert.equal(cityEnforcementZone([first, big]).id, 'big');
    const equalA = makeZone({ id: 'a' });
    const equalB = makeZone({ id: 'b' });
    assert.equal(cityEnforcementZone([equalA, equalB]).id, 'a');
  });

  it('sigue la prioridad aviso > aprobada > episodios > suspendida > sin verificar', () => {
    const states = ['sin_verificar', 'suspendida', 'solo_episodios', 'aprobada_sin_aplicar', 'aviso'] as const;
    const zones = states.map((state) => makeZone({ id: state, estadoSancion: state }));
    assert.equal(cityEnforcementZone(zones).id, 'aviso');
    assert.equal(cityEnforcementZone(zones.slice(0, 4)).id, 'aprobada_sin_aplicar');
    assert.equal(cityEnforcementZone(zones.slice(0, 2)).id, 'suspendida');
  });
});

describe('zoneNameForRule y groupedRuleTexts', () => {
  const ruleOne = makeRule({ desde: null });
  const ruleTwo = makeRule({ desde: null, nota: 'Nota.' });
  const zoneOne = makeZone({ nombre: 'Zona 1', reglas: [ruleOne] });
  const zoneTwo = makeZone({ nombre: 'Zona 2', reglas: [ruleTwo, makeRule({ desde: null })] });
  const zoneThree = makeZone({ nombre: 'Zona 3', reglas: [] });

  it('devuelve el nombre de la zona de la regla, o null con una sola zona', () => {
    assert.equal(zoneNameForRule(ruleTwo, [zoneOne, zoneTwo, zoneThree]), 'Zona 2');
    assert.equal(zoneNameForRule(ruleOne, [zoneOne]), null);
    assert.equal(zoneNameForRule(makeRule(), [zoneOne, zoneTwo, zoneThree]), null);
  });

  it('une las zonas de las reglas iguales y conserva las distintas por su nota', () => {
    const texts = groupedRuleTexts([...zoneOne.reglas, ...zoneTwo.reglas], [zoneOne, zoneTwo, zoneThree], 'Madrid');
    assert.equal(texts.length, 2);
    assert.match(texts[0], /en Zona 1 y Zona 2, todos los días/);
    assert.match(texts[1], /en Zona 2, todos los días a todas horas\. Nota\.$/);
  });
});
