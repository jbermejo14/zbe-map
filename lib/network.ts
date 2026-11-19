import fs from 'node:fs';
import { BASE_PATH } from './site.ts';

/** Variable de entorno con la ruta absoluta de config/red-enlaces.json de ododex-sitio. */
export const NETWORK_FILE_VARIABLE = 'ODODEX_RED_ENLACES';

const NETWORK_FORMAT_VERSION = 1;

/** Sección (otra web) de la red de Ododex. */
export interface NetworkSection {
  ruta: string;
  nombre: string;
  descripcion: string;
}

export interface NetworkData {
  version: number;
  secciones: NetworkSection[];
  enlaces: Record<string, unknown>;
}

// El fichero pesa más de 1 MB: se lee una sola vez por ruta durante la compilación.
const networkCache = new Map<string, NetworkData>();

function networkFileError(filePath: string, reason: string): Error {
  return new Error(
    `El fichero de red de Ododex (${filePath}) no es válido: ${reason}. Regenéralo con npm run red en ododex-sitio.`,
  );
}

function parseNetwork(filePath: string, text: string): NetworkData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw networkFileError(filePath, 'no es JSON');
  }
  const data = raw as Partial<NetworkData> | null;
  if (data === null || typeof data !== 'object' || data.version !== NETWORK_FORMAT_VERSION) {
    throw networkFileError(filePath, `se esperaba version ${NETWORK_FORMAT_VERSION}`);
  }
  if (!Array.isArray(data.secciones) || typeof data.enlaces !== 'object' || data.enlaces === null) {
    throw networkFileError(filePath, 'faltan "secciones" o "enlaces"');
  }
  return data as NetworkData;
}

/**
 * Lee el JSON de la red (solo en compilación, usa fs) con caché por ruta.
 * Sin variable de entorno o sin fichero devuelve null: desarrollo local, sin enlaces de red.
 * Lanza Error si el JSON es inválido o su versión no es la 1.
 *
 * @param filePath Ruta alternativa; existe para las pruebas. Por defecto, la variable ODODEX_RED_ENLACES.
 */
export function loadNetwork(filePath: string | undefined = process.env[NETWORK_FILE_VARIABLE]): NetworkData | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const cached = networkCache.get(filePath);
  if (cached) return cached;
  const data = parseNetwork(filePath, fs.readFileSync(filePath, 'utf8'));
  networkCache.set(filePath, data);
  return data;
}

/** Secciones de la red sin la propia (para el pie). null si no hay red. */
export function getNetworkSections(ownRoute: string = BASE_PATH, filePath?: string): NetworkSection[] | null {
  const network = loadNetwork(filePath);
  if (network === null) return null;
  return network.secciones.filter((section) => section.ruta !== ownRoute);
}
