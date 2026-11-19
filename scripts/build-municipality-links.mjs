// Genera data/municipality-links.json a partir de las carpetas exportadas de ododex-sitio.
// Uso: node scripts/build-municipality-links.mjs <dist-gasolineras> <dist-puntos-recarga>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CITIES_PATH = path.join(ROOT, 'data', 'zbe-cities.json');
const OUTPUT_PATH = path.join(ROOT, 'data', 'municipality-links.json');
const FUEL_SECTION_DIR = path.join('es', 'gasolineras', 'provincia');
const CHARGING_SECTION_DIR = path.join('es', 'puntos-recarga', 'provincia');
const JSON_INDENT = 2;
const EXPECTED_ARGUMENTS = 2;

const NO_PAGE = null;

const same = (value) => ({ fuel: value, charging: value });

/** slug de ciudad -> { fuel, charging } con "<provincia>/<municipio>" o null si no hay página. */
const MUNICIPALITY_LINK_OVERRIDES = {
  valencia: same('valencia-valencia/valencia'),
  alicante: { fuel: 'alicante/alicante-alacant', charging: 'alicante-alacant/alacant-alicante' },
  palma: { fuel: 'balears-illes/palma-de-mallorca', charging: 'balears-illes/palma' },
  'las-palmas': same('palmas-las/palmas-de-gran-canaria-las'),
  'san-sebastian': same('gipuzkoa/donostia-san-sebastian'),
  'a-coruna': same('coruna-a/coruna-a'),
  hospitalet: same('barcelona/hospitalet-de-llobregat-l'),
  pamplona: same('navarra/pamplona-iruna'),
  castellon: {
    fuel: 'castellon-castello/castellon-de-la-plana-castello-de-la-plana',
    charging: 'castellon-castello/castello-de-la-plana-castellon-de-la-plana',
  },
  elche: { fuel: 'alicante/elche-elx', charging: 'alicante-alacant/elx-elche' },
  'santa-cruz-tenerife': same('santa-cruz-de-tenerife/santa-cruz-de-tenerife'),
  logrono: same('rioja-la/logrono'),
  'las-rozas': same('madrid/rozas-de-madrid-las'),
  viladecans: { fuel: 'barcelona/viladecans', charging: NO_PAGE },
  'el-prat-de-llobregat': same('barcelona/prat-de-llobregat-el'),
  'el-puerto-de-santa-maria': same('cadiz/puerto-de-santa-maria-el'),
  'la-linea-de-la-concepcion': same('cadiz/linea-de-la-concepcion-la'),
  'el-ejido': same('almeria/ejido-el'),
  torrevieja: { fuel: 'alicante/torrevieja', charging: 'alicante-alacant/torrevieja' },
  orihuela: { fuel: 'alicante/orihuela', charging: 'alicante-alacant/orihuela' },
  torrent: same('valencia-valencia/torrent'),
  gandia: same('valencia-valencia/gandia'),
  paterna: same('valencia-valencia/paterna'),
  benidorm: { fuel: 'alicante/benidorm', charging: 'alicante-alacant/benidorm' },
  sagunto: { fuel: 'valencia-valencia/sagunto-sagunt', charging: 'valencia-valencia/sagunt-sagunto' },
  alcoy: { fuel: 'alicante/alcoy-alcoi', charging: 'alicante-alacant/alcoi-alcoy' },
  'san-vicente-del-raspeig': {
    fuel: 'alicante/san-vicente-del-raspeig-sant-vicent-del-raspeig',
    charging: 'alicante-alacant/sant-vicent-del-raspeig-san-vicente-del-raspeig',
  },
  elda: { fuel: 'alicante/elda', charging: 'alicante-alacant/elda' },
  villarreal: { fuel: 'castellon-castello/villarreal-vila-real', charging: 'castellon-castello/vila-real' },
  'vitoria-gasteiz': same('araba-alava/vitoria-gasteiz'),
  'santiago-de-compostela': same('coruna-a/santiago-de-compostela'),
  ferrol: same('coruna-a/ferrol'),
  'talavera-de-la-reina': { fuel: 'toledo/talavera-de-la-reina', charging: NO_PAGE },
  telde: same('palmas-las/telde'),
  'santa-lucia-de-tirajana': same('palmas-las/santa-lucia-de-tirajana'),
  arrecife: same('palmas-las/arrecife'),
  calvia: same('balears-illes/calvia'),
  ibiza: same('balears-illes/eivissa'),
  manacor: same('balears-illes/manacor'),
  calahorra: same('rioja-la/calahorra'),
  melilla: { fuel: 'melilla/melilla', charging: NO_PAGE },
};

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function candidatePath(city, kind) {
  const override = MUNICIPALITY_LINK_OVERRIDES[city.slug];
  if (override) return override[kind];
  return `${slugify(city.province)}/${city.slug}`;
}

function resolveLink(city, kind, distDir, sectionDir) {
  const candidate = candidatePath(city, kind);
  if (candidate === NO_PAGE) return NO_PAGE;
  const filePath = path.join(distDir, sectionDir, `${candidate}.html`);
  if (fs.existsSync(filePath)) return candidate;
  console.warn(`Sin página de ${kind} para "${city.slug}": no existe ${filePath}`);
  return NO_PAGE;
}

function countLinks(links, kind) {
  return Object.values(links).filter((entry) => entry[kind] !== NO_PAGE).length;
}

function main() {
  const [fuelDist, chargingDist] = process.argv.slice(2);
  if (process.argv.length - 2 !== EXPECTED_ARGUMENTS) {
    console.error('Uso: node scripts/build-municipality-links.mjs <dist-gasolineras> <dist-puntos-recarga>');
    process.exit(1);
  }

  for (const [distDir, sectionDir] of [[fuelDist, FUEL_SECTION_DIR], [chargingDist, CHARGING_SECTION_DIR]]) {
    const sectionPath = path.join(distDir, sectionDir);
    if (!fs.existsSync(sectionPath)) {
      console.error(`No existe la carpeta ${sectionPath}. Comprueba que has exportado la sección.`);
      process.exit(1);
    }
  }

  const cities = JSON.parse(fs.readFileSync(CITIES_PATH, 'utf8'));
  const links = {};
  for (const city of [...cities].sort((a, b) => a.slug.localeCompare(b.slug))) {
    links[city.slug] = {
      fuel: resolveLink(city, 'fuel', fuelDist, FUEL_SECTION_DIR),
      charging: resolveLink(city, 'charging', chargingDist, CHARGING_SECTION_DIR),
    };
  }

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(links, null, JSON_INDENT)}\n`);
  console.log(`Ciudades: ${cities.length}`);
  console.log(`Con gasolineras: ${countLinks(links, 'fuel')}`);
  console.log(`Con puntos de recarga: ${countLinks(links, 'charging')}`);
}

main();
