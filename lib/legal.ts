import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type TipoTitular = 'persona-fisica' | 'empresa';

export interface Titular {
  tipo: TipoTitular;
  nombre: string;
  nif: string;
  domicilio: string;
  email: string;
  registroMercantil: string;
}

/** Fecha de la última revisión de los textos legales, ISO. */
export const FECHA_TEXTOS_LEGALES = '2026-11-17';

const TIPOS_TITULAR: readonly TipoTitular[] = ['persona-fisica', 'empresa'];
const CAMPOS_TEXTO = ['nombre', 'nif', 'domicilio', 'email', 'registroMercantil'] as const;
const CAMPOS_OBLIGATORIOS = ['nombre', 'nif', 'domicilio', 'email'] as const;

const FICHERO_TITULAR = join('config', 'titular.json');
// Plantilla versionada con los campos vacíos. titular.json no está en git porque
// contiene datos personales; sin él, las páginas muestran los marcadores pendientes.
const FICHERO_TITULAR_EJEMPLO = join('config', 'titular.example.json');

/** Ruta relativa del fichero de titular que se usará: el real si existe, si no la plantilla. */
export function ficheroTitular(directorioBase: string = process.cwd()): string {
  return existsSync(join(directorioBase, FICHERO_TITULAR)) ? FICHERO_TITULAR : FICHERO_TITULAR_EJEMPLO;
}

/**
 * Lee y valida config/titular.json (o config/titular.example.json si el primero
 * no existe). Lanza Error con el fichero, el campo y el motivo si falta una clave
 * o el tipo no es válido.
 */
export function getTitular(directorioBase: string = process.cwd()): Titular {
  const fichero = ficheroTitular(directorioBase);
  const datos = JSON.parse(readFileSync(join(directorioBase, fichero), 'utf8')) as Record<string, unknown>;
  const tipo = datos.tipo;
  if (typeof tipo !== 'string' || !TIPOS_TITULAR.includes(tipo as TipoTitular)) {
    throw new Error(
      `${fichero}: el campo "tipo" debe ser "persona-fisica" o "empresa" (valor actual: ${JSON.stringify(tipo)}).`
    );
  }
  for (const campo of CAMPOS_TEXTO) {
    if (typeof datos[campo] !== 'string') {
      throw new Error(`${fichero}: falta el campo "${campo}" o no es una cadena de texto.`);
    }
  }
  return {
    tipo: tipo as TipoTitular,
    nombre: datos.nombre as string,
    nif: datos.nif as string,
    domicilio: datos.domicilio as string,
    email: datos.email as string,
    registroMercantil: datos.registroMercantil as string
  };
}

function legalEstaVacio(valor: string): boolean {
  return valor.trim() === '';
}

/** Nombres de los campos obligatorios vacíos (registroMercantil solo cuenta para empresa). */
export function camposPendientes(titular: Titular): string[] {
  const campos: Array<keyof Titular> = [...CAMPOS_OBLIGATORIOS];
  if (titular.tipo === 'empresa') campos.push('registroMercantil');
  return campos.filter(campo => legalEstaVacio(titular[campo]));
}

/** Valor del campo o el marcador visible "[pendiente: <campo>]". */
export function valorOPendiente(titular: Titular, campo: keyof Titular): string {
  const valor = titular[campo];
  return legalEstaVacio(valor) ? `[pendiente: ${campo}]` : valor;
}
