import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { CityData, CityEnforcement } from '../lib/cities-repository.ts';
import { getAllCities } from '../lib/cities-repository.ts';
import type { DgtBadgeType, ZbeAccessStatus } from '../lib/zbe-engine.ts';
import {
  META_DESCRIPTION_MAX_LENGTH,
  META_TITLE_MAX_LENGTH,
  SAME_REGION_LIMIT,
  badgeAccessCounts,
  badgeFaqs,
  badgeMetaDescription,
  badgeMetaTitle,
  badgeNationalSentence,
  isBadgePageNoIndex,
  regionSentence,
  sameRegionCities,
} from '../lib/badge-page-insights.ts';
import { getMunicipalityLinks } from '../lib/municipality-links.ts';
import linksJson from '../data/municipality-links.json' with { type: 'json' };

const BADGES: DgtBadgeType[] = ['CERO', 'ECO', 'C', 'B', 'SIN_ETIQUETA'];
const SUBJECT = 'un coche con etiqueta B';
const SUBJECTS: Record<DgtBadgeType, string> = {
  CERO: 'un coche con etiqueta 0 CERO',
  ECO: 'un coche con etiqueta ECO',
  C: 'un coche con etiqueta C',
  B: 'un coche con etiqueta B',
  SIN_ETIQUETA: 'un coche sin etiqueta',
};
const MIN_FUEL_LINKS = 145;
const MIN_CHARGING_LINKS = 140;

function makeCity(slug: string, name: string, region: string, status: ZbeAccessStatus): CityData {
  return {
    slug,
    name,
    region,
    rules: { B: { status, reason: 'x' } },
  } as unknown as CityData;
}

describe('Recuentos y frase nacional', () => {
  const mixed = [
    makeCity('a', 'A', 'R', 'allowed'),
    makeCity('b', 'B', 'R', 'restricted'),
    makeCity('c', 'C', 'R', 'restricted'),
    makeCity('d', 'D', 'R', 'banned'),
  ];

  it('cuenta cada estado', () => {
    assert.deepEqual(badgeAccessCounts('B', mixed), { allowed: 1, restricted: 2, banned: 1, total: 4 });
  });

  it('usa allowed cuando falta la regla', () => {
    const city = { slug: 'z', name: 'Z', region: 'R', rules: {} } as unknown as CityData;
    assert.equal(badgeAccessCounts('B', [city]).allowed, 1);
  });

  it('nombra varias categorías', () => {
    assert.equal(
      badgeNationalSentence('B', mixed, SUBJECT),
      'De las 4 ZBE de España, un coche con etiqueta B puede entrar sin restricciones en 1, tiene restricciones en 2 y tiene prohibido el acceso en 1.',
    );
  });

  it('omite las categorías a cero', () => {
    const two = [makeCity('a', 'A', 'R', 'allowed'), makeCity('b', 'B', 'R', 'banned')];
    assert.equal(
      badgeNationalSentence('B', two, SUBJECT),
      'De las 2 ZBE de España, un coche con etiqueta B puede entrar sin restricciones en 1 y tiene prohibido el acceso en 1.',
    );
  });

  it('usa la forma corta si todas son de un estado', () => {
    const all = [makeCity('a', 'A', 'R', 'allowed'), makeCity('b', 'B', 'R', 'allowed')];
    assert.equal(
      badgeNationalSentence('B', all, SUBJECT),
      'Un coche con etiqueta B puede entrar sin restricciones en las 2 ZBE de España.',
    );
  });
});

describe('Comunidad', () => {
  const madrid = makeCity('madrid', 'Madrid', 'Comunidad de Madrid', 'restricted');
  const others = [
    makeCity('zeta', 'Zeta', 'Comunidad de Madrid', 'restricted'),
    makeCity('alfa', 'Álamo', 'Comunidad de Madrid', 'allowed'),
    makeCity('otra', 'Otra', 'Galicia', 'restricted'),
  ];

  it('excluye la propia, ordena por nombre y filtra por comunidad', () => {
    const result = sameRegionCities(madrid, [madrid, ...others], 'B');
    assert.deepEqual(result.map((c) => c.slug), ['alfa', 'zeta']);
    assert.equal(result[0].status, 'allowed');
  });

  it('respeta el límite', () => {
    const many = Array.from({ length: SAME_REGION_LIMIT + 3 }, (_, i) =>
      makeCity(`c${i}`, `Ciudad ${i}`, 'Comunidad de Madrid', 'allowed'),
    );
    assert.equal(sameRegionCities(madrid, [madrid, ...many], 'B').length, SAME_REGION_LIMIT);
    assert.equal(sameRegionCities(madrid, [madrid, ...many], 'B', 2).length, 2);
  });

  it('unifica las variantes de la comunidad', () => {
    const a = makeCity('a', 'A', 'Comunidad Valenciana', 'allowed');
    const b = makeCity('b', 'B', 'Comunitat Valenciana', 'allowed');
    assert.equal(sameRegionCities(a, [a, b], 'B').length, 1);
  });

  it('devuelve null si es la única', () => {
    assert.equal(regionSentence(madrid, [madrid, others[2]], 'B', SUBJECT), null);
  });

  it('cuenta las que comparten estado', () => {
    const list = [madrid, others[0], others[1], makeCity('x', 'X', 'Comunidad de Madrid', 'restricted')];
    assert.equal(
      regionSentence(madrid, list, 'B', SUBJECT),
      'En Comunidad de Madrid hay 4 ZBE en el mapa. En 2 de las otras 3, un coche con etiqueta B tiene restricciones, igual que en Madrid.',
    );
  });

  it('dice "ninguna"', () => {
    const list = [
      madrid,
      makeCity('p', 'P', 'Comunidad de Madrid', 'allowed'),
      makeCity('q', 'Q', 'Comunidad de Madrid', 'banned'),
    ];
    assert.equal(
      regionSentence(madrid, list, 'B', SUBJECT),
      'En Comunidad de Madrid hay 3 ZBE en el mapa. En ninguna de las otras 2, un coche con etiqueta B tiene restricciones como en Madrid.',
    );
  });

  it('dice "todas"', () => {
    const list = [madrid, others[0], makeCity('x', 'X', 'Comunidad de Madrid', 'restricted')];
    assert.equal(
      regionSentence(madrid, list, 'B', SUBJECT),
      'En Comunidad de Madrid hay 3 ZBE en el mapa. En todas las demás, un coche con etiqueta B tiene restricciones, igual que en Madrid.',
    );
  });

  it('trata el caso de una sola ciudad más', () => {
    assert.equal(
      regionSentence(madrid, [madrid, others[0]], 'B', SUBJECT),
      'En Comunidad de Madrid hay 2 ZBE en el mapa. En la otra ZBE de la comunidad, Zeta, un coche con etiqueta B también tiene restricciones.',
    );
    assert.equal(
      regionSentence(madrid, [madrid, others[1]], 'B', SUBJECT),
      'En Comunidad de Madrid hay 2 ZBE en el mapa. En la otra ZBE de la comunidad, Álamo, un coche con etiqueta B no tiene restricciones.',
    );
  });
});

describe('Título y descripción', () => {
  it('usa el formato completo si cabe', () => {
    assert.equal(badgeMetaTitle('Etiqueta B', 'Madrid', 2026), 'Etiqueta B en la ZBE de Madrid: ¿puede entrar? (2026)');
  });

  it('quita el año si no cabe', () => {
    const title = badgeMetaTitle('Etiqueta B', 'Alcalá de Henares', 2026);
    assert.equal(title, 'Etiqueta B en la ZBE de Alcalá de Henares: ¿puede entrar?');
    assert.ok(title.length <= META_TITLE_MAX_LENGTH);
  });

  it('queda en la forma mínima si aún no cabe', () => {
    assert.equal(
      badgeMetaTitle('Sin etiqueta', 'San Vicente del Raspeig', 2026),
      'Sin etiqueta en la ZBE de San Vicente del Raspeig',
    );
  });

  it('compone el veredicto y la multa si está verificada', () => {
    const text = badgeMetaDescription({ subject: SUBJECT, cityName: 'Madrid', status: 'allowed', fineAmount: 200, verified: true });
    assert.equal(text, 'Un coche con etiqueta B puede entrar sin restricciones en la ZBE de Madrid. Multa: 200 €. Horario, excepciones y mapa.');
  });

  it('dice que no hay multa si fineApplies es false', () => {
    const text = badgeMetaDescription({ subject: SUBJECT, cityName: 'Gijón', status: 'allowed', fineAmount: 200, verified: true, fineApplies: false });
    assert.equal(text, 'Un coche con etiqueta B puede entrar sin restricciones en la ZBE de Gijón. Sin multa por ahora. Horario, excepciones y mapa.');
  });

  it('marca como orientativa si no está verificada', () => {
    const text = badgeMetaDescription({ subject: SUBJECT, cityName: 'Madrid', status: 'banned', fineAmount: 200, verified: false });
    assert.equal(text, 'Un coche con etiqueta B no puede entrar en la ZBE de Madrid. Normas orientativas: horario, excepciones y mapa.');
  });

  it('recorta en el último espacio y añade puntos suspensivos', () => {
    const input = {
      subject: SUBJECT,
      cityName: 'Ciudad '.repeat(30).trim(),
      status: 'restricted' as const,
      fineAmount: 90,
      verified: true,
    };
    const text = badgeMetaDescription(input);
    assert.ok(text.length <= META_DESCRIPTION_MAX_LENGTH);
    assert.ok(text.endsWith('…'));
    assert.ok(!text.endsWith(' …'));
    const full = `Un coche con etiqueta B puede entrar con condiciones en la ZBE de ${input.cityName}. Multa: 90 €. Horario, excepciones y mapa.`;
    assert.ok(full.startsWith(text.slice(0, -1)));
    assert.equal(full[text.length - 1], ' ');
  });

  it('no supera el límite con los datos reales ni contiene "undefined"', () => {
    for (const city of getAllCities()) {
      for (const badge of BADGES) {
        for (const verified of [true, false]) {
          const text = badgeMetaDescription({
            subject: SUBJECTS[badge],
            cityName: city.name,
            status: city.rules[badge]?.status ?? 'allowed',
            fineAmount: city.fineAmount,
            verified,
          });
          const context = `${city.slug}/${badge}/${verified}: ${text}`;
          assert.ok(text.length <= META_DESCRIPTION_MAX_LENGTH, context);
          assert.ok(!text.includes('undefined'), context);
          assert.ok(!text.includes(' …'), context);
        }
      }
    }
  });
});

describe('Enlaces a gasolineras y puntos de recarga', () => {
  it('Madrid tiene los dos enlaces', () => {
    assert.deepEqual(getMunicipalityLinks('madrid'), {
      fuelHref: '/es/gasolineras/provincia/madrid/madrid',
      chargingHref: '/es/puntos-recarga/provincia/madrid/madrid',
    });
  });

  it('un slug inexistente o heredado del prototipo devuelve null', () => {
    const expected = { fuelHref: null, chargingHref: null };
    assert.deepEqual(getMunicipalityLinks('no-existe'), expected);
    assert.deepEqual(getMunicipalityLinks('constructor'), expected);
  });

  it('todas las rutas tienen dos segmentos tras la sección', () => {
    const fuelPattern = /^\/es\/gasolineras\/provincia\/[^/]+\/[^/]+$/;
    const chargingPattern = /^\/es\/puntos-recarga\/provincia\/[^/]+\/[^/]+$/;
    for (const city of getAllCities()) {
      const { fuelHref, chargingHref } = getMunicipalityLinks(city.slug);
      if (fuelHref) assert.match(fuelHref, fuelPattern, city.slug);
      if (chargingHref) assert.match(chargingHref, chargingPattern, city.slug);
    }
  });

  it('viladecans tiene gasolineras pero no puntos de recarga', () => {
    const links = getMunicipalityLinks('viladecans');
    assert.ok(links.fuelHref);
    assert.equal(links.chargingHref, null);
  });

  it('las claves del JSON coinciden con los slugs de las ciudades', () => {
    const expected = getAllCities().map((c) => c.slug).sort();
    assert.deepEqual(Object.keys(linksJson).sort(), expected);
  });

  it('el JSON cubre todas las ciudades con suficientes enlaces', () => {
    const entries = Object.values(linksJson as Record<string, { fuel: string | null; charging: string | null }>);
    assert.ok(entries.filter((e) => e.fuel).length >= MIN_FUEL_LINKS);
    assert.ok(entries.filter((e) => e.charging).length >= MIN_CHARGING_LINKS);
  });
});

describe('Gramática de los textos', () => {
  const FORBIDDEN = ['la 0 CERO', 'la Sin', 'la ECO', 'la Etiqueta'];

  it('ninguna frase ni descripción usa "la" delante de la etiqueta', () => {
    const cities = getAllCities();
    for (const city of cities) {
      for (const badge of BADGES) {
        const subject = SUBJECTS[badge];
        const texts = [
          badgeNationalSentence(badge, cities, subject),
          regionSentence(city, cities, badge, subject) ?? '',
          badgeMetaDescription({
            subject,
            cityName: city.name,
            status: city.rules[badge]?.status ?? 'allowed',
            fineAmount: city.fineAmount,
            verified: true,
          }),
        ];
        for (const text of texts) {
          for (const forbidden of FORBIDDEN) {
            assert.ok(!text.includes(forbidden), `${city.slug}/${badge}: "${forbidden}" en "${text}"`);
          }
        }
      }
    }
  });

  it('la frase nacional de un solo estado empieza en mayúscula', () => {
    const all = [makeCity('a', 'A', 'R', 'allowed')];
    assert.ok(badgeNationalSentence('B', all, SUBJECTS.CERO).startsWith('Un coche con etiqueta 0 CERO'));
  });
});

describe('badgeFaqs', () => {
  const base = {
    cityName: 'Madrid',
    badgeLabel: 'Etiqueta B',
    accessStatus: 'restricted' as ZbeAccessStatus,
    reason: 'Motivo.',
    verified: true,
    schedule: 'Todos los días a todas horas',
    fineAmount: 200,
    enforcement: null as CityEnforcement | null,
  };
  const atlas = (state: 'sanciona' | 'aviso' | 'sin_restricciones', sentence: string, early: number | null): CityEnforcement => ({
    source: 'atlaszbe',
    state,
    label: 'L',
    sentence,
    finesFrom: null,
    warningUntil: null,
    nextChange: null,
    confidence: 'alta',
    verifiedOn: null,
    officialUrl: null,
    earlyPaymentAmount: early,
    importedOn: '2026-11-19',
    mainZoneName: 'Z',
    calendar: [],
  });

  it('madrid: multa con pronto pago y acceso condicionado', () => {
    const faqs = badgeFaqs({ ...base, enforcement: atlas('sanciona', 'Se multa.', 100) });
    assert.equal(faqs[0].answer, 'El acceso está condicionado en la ZBE de Madrid: Motivo.');
    assert.equal(faqs[1].answer, 'El horario de restricción fijado por el Ayuntamiento de Madrid es: Todos los días a todas horas.');
    assert.equal(faqs[2].answer, 'La sanción general en Madrid es de 200 € (100 € con pronto pago).');
  });

  it('madrid sin pronto pago: no menciona el 50 %', () => {
    const faqs = badgeFaqs({ ...base, enforcement: atlas('sanciona', 'Se multa.', null) });
    assert.equal(faqs[2].answer, 'La sanción general en Madrid es de 200 €.');
  });

  it('lugo (aviso): permitido con frase del estado y multa explicada', () => {
    const sentence = 'Hay restricciones, pero en periodo de aviso: todavía no se multa.';
    const faqs = badgeFaqs({ ...base, cityName: 'Lugo', accessStatus: 'allowed', enforcement: atlas('aviso', sentence, null) });
    assert.equal(faqs[0].answer, 'Sí, ahora mismo puede entrar. ' + sentence);
    assert.equal(faqs[2].answer, sentence);
  });

  it('malaga (suspendida): sin horario de restricción', () => {
    const sentence = 'La ZBE está anulada o suspendida: ahora no hay restricciones.';
    const faqs = badgeFaqs({
      ...base,
      cityName: 'Málaga',
      accessStatus: 'allowed',
      schedule: 'Sin restricciones en vigor',
      enforcement: atlas('sin_restricciones', sentence, null),
    });
    assert.equal(faqs[1].answer, 'Ahora no hay horario de restricción en Málaga: ' + sentence);
  });

  it('gijon (miteco): usa la frase del inventario y no dice normas orientativas si está verificada', () => {
    const sentence = 'Gijón tiene la ZBE en tramitación.';
    const miteco: CityEnforcement = { source: 'miteco', state: 'en_tramite', label: 'L', sentence, inventoryUpdated: '2026-09-30', importedOn: '2026-11-19' };
    const faqs = badgeFaqs({ ...base, cityName: 'Gijón', accessStatus: 'banned', schedule: 'Sin restricciones en vigor', enforcement: miteco });
    assert.ok(!faqs[0].answer.includes('orientativas'));
    assert.equal(faqs[2].answer, sentence);
  });

  it('ciudad sin verificar: respuestas orientativas', () => {
    const faqs = badgeFaqs({ ...base, accessStatus: 'banned', verified: false });
    assert.ok(faqs[0].answer.includes('según las normas orientativas'));
    assert.ok(faqs[1].answer.startsWith('Horario orientativo'));
    assert.ok(faqs[2].answer.startsWith('Sanción orientativa de 200 €'));
  });
});

describe('isBadgePageNoIndex (Estrategia anti-canibalización)', () => {
  const cities = getAllCities();

  it('ciudades con ZBE activa (Madrid, Barcelona) indexan todas las etiquetas', () => {
    const madrid = cities.find((c) => c.slug === 'madrid')!;
    assert.equal(isBadgePageNoIndex(madrid, 'cero'), false);
    assert.equal(isBadgePageNoIndex(madrid, 'eco'), false);
    assert.equal(isBadgePageNoIndex(madrid, 'b'), false);
    assert.equal(isBadgePageNoIndex(madrid, 'c'), false);
    assert.equal(isBadgePageNoIndex(madrid, 'sin-etiqueta'), false);
  });

  it('ciudades en tramitación marcan noindex solo en CERO y ECO', () => {
    const lasPalmas = cities.find((c) => c.slug === 'las-palmas')!;
    assert.equal(isBadgePageNoIndex(lasPalmas, 'cero'), true);
    assert.equal(isBadgePageNoIndex(lasPalmas, 'eco'), true);
    assert.equal(isBadgePageNoIndex(lasPalmas, 'b'), false);
    assert.equal(isBadgePageNoIndex(lasPalmas, 'c'), false);
    assert.equal(isBadgePageNoIndex(lasPalmas, 'sin-etiqueta'), false);
  });

  it('protege exactamente 102 páginas CERO y ECO de las 51 ciudades en tramitación', () => {
    let noIndexCount = 0;
    const badgeSlugs = ['cero', 'eco', 'c', 'b', 'sin-etiqueta'];
    for (const city of cities) {
      for (const b of badgeSlugs) {
        if (isBadgePageNoIndex(city, b)) {
          noIndexCount++;
        }
      }
    }
    assert.equal(noIndexCount, 102, `Se esperaban 102 páginas con noindex (51 x 2), obtenidas: ${noIndexCount}`);
  });
});
