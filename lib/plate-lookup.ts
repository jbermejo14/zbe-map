import { DgtBadgeType } from '@/lib/zbe-engine.ts';
import { calculateDgtBadge, normalizeFuel } from '@/lib/dgt-rules.ts';

export type FuelType = 'gasolina' | 'diesel' | 'hibrido' | 'electrico' | 'auto';

export interface PlateLookupResult {
  plate: string;
  formattedPlate: string;
  badge: DgtBadgeType;
  estimatedYear: number;
  badgeLabel: string;
  fuelType: FuelType;
  fuelLabel: string;
  explanation: string;
  confidence: 'estimation' | 'provincial_vintage';
  officialDgtUrl: string;
  matchedVehicle?: any;
}

/**
 * Normaliza y valida una matrícula española.
 * Formatos admitidos:
 * - Sistema post-2000: 4 dígitos + 3 consonantes (ej. 1234BBB, 5678-LMN)
 * - Sistema provincial: 1 o 2 letras + hasta 4 dígitos + 1 o 2 letras (ej. M1234AB, B-5678-CD, SE1234A)
 */
export function cleanPlate(input: string): string {
  return input.toUpperCase().replace(/[\s\-_.]/g, '').trim();
}

export function isValidSpanishPlate(plate: string): boolean {
  const cleaned = cleanPlate(plate);
  // Post-2000 (sin vocales, sin Ñ ni Q): 0000BBB a 9999ZZZ
  const modernRegex = /^[0-9]{4}[BCDFGHJKLMNPRSTVWXYZ]{3}$/;
  // Provincial: M1234AB, B123456, etc.
  const provincialRegex = /^[A-Z]{1,2}[0-9]{4,6}[A-Z]{0,2}$/;
  return modernRegex.test(cleaned) || provincialRegex.test(cleaned);
}

/**
 * Tabla cronológica de series de matriculación en España (sistema post-septiembre 2000)
 */
export function estimateYearFromModernPlate(letters: string): number {
  const l = letters.toUpperCase();
  const first = l[0];

  switch (first) {
    case 'B': // Septiembre 2000 - Noviembre 2002
      return l < 'BRR' ? 2001 : 2002;
    case 'C': // Noviembre 2002 - Septiembre 2004
      return l < 'CMD' ? 2003 : 2004;
    case 'D': // Septiembre 2004 - Mayo 2006
      return l < 'DPP' ? 2005 : 2006;
    case 'F': // Mayo 2006 - Febrero 2008
      return l < 'FPP' ? 2007 : 2008;
    case 'G': // Febrero 2008 - Mayo 2010
      return l < 'GPP' ? 2009 : 2010;
    case 'H': // Mayo 2010 - Noviembre 2014
      if (l < 'HFX') return 2011;
      if (l < 'HLD') return 2012;
      if (l < 'HRT') return 2013;
      return 2014;
    case 'J': // Noviembre 2014 - Junio 2017
      if (l < 'JGW') return 2015;
      if (l < 'JPW') return 2016;
      return 2017;
    case 'K': // Junio 2017 - Septiembre 2019
      if (l < 'KNP') return 2018;
      return 2019;
    case 'L': // Septiembre 2019 - Septiembre 2022
      if (l < 'LLC') return 2020;
      if (l < 'LTF') return 2021;
      return 2022;
    case 'M': // Septiembre 2022 - 2026+
      if (l < 'MJZ') return 2023;
      if (l < 'MMD') return 2024;
      if (l < 'MRR') return 2025;
      return 2026;
    default:
      return 2024;
  }
}

const OFFICIAL_DGT_URL = 'https://sede.dgt.gob.es/es/vehiculos/distintivo-ambiental/';

/**
 * Consulta de matrícula y estimación de distintivo ambiental según reglas DGT
 */
export async function lookupPlate(
  rawPlate: string,
  fuelType: FuelType = 'gasolina'
): Promise<PlateLookupResult> {
  const cleaned = cleanPlate(rawPlate);

  if (!isValidSpanishPlate(cleaned)) {
    throw new Error('Formato de matrícula española no válido. Ejemplos: 1234 LMN o M 1234 AB.');
  }

  const isModern = /^[0-9]{4}[BCDFGHJKLMNPRSTVWXYZ]{3}$/.test(cleaned);

  // 1. Matrículas del sistema provincial (pre-septiembre 2000)
  if (!isModern) {
    const formatted = `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    return {
      plate: cleaned,
      formattedPlate: formatted,
      badge: 'SIN_ETIQUETA',
      estimatedYear: 1998,
      badgeLabel: 'Sin Distintivo (Categoría A)',
      fuelType,
      fuelLabel: getFuelLabel(fuelType),
      explanation:
        'Estimación: Matrícula provincial (anterior a septiembre de 2000). Al ser anterior a las normas Euro 3 de gasolina y Euro 4 de diésel, no le corresponde distintivo ambiental.',
      confidence: 'provincial_vintage',
      officialDgtUrl: OFFICIAL_DGT_URL,
    };
  }

  // 2. Matrícula moderna (4 números + 3 letras)
  const numbers = cleaned.slice(0, 4);
  const letters = cleaned.slice(4);
  const formattedPlate = `${numbers} ${letters}`;
  const estimatedYear = estimateYearFromModernPlate(letters);

  // Mapear FuelType a la clasificación de dgt-rules
  const dgtFuel =
    fuelType === 'electrico'
      ? 'electrico'
      : fuelType === 'hibrido'
      ? 'hibrido'
      : fuelType === 'diesel'
      ? 'diesel'
      : 'gasolina';

  const dgtResult = calculateDgtBadge({
    fuel: dgtFuel,
    registrationYear: estimatedYear,
  });

  return {
    plate: cleaned,
    formattedPlate,
    badge: dgtResult.badge,
    estimatedYear,
    badgeLabel: dgtResult.badgeName,
    fuelType,
    fuelLabel: getFuelLabel(fuelType),
    explanation: `Estimación: Serie ${letters} matriculada aproximadamente en ${estimatedYear}. ${dgtResult.description}`,
    confidence: 'estimation',
    officialDgtUrl: OFFICIAL_DGT_URL,
  };
}

export function getFuelLabel(fuel: FuelType): string {
  switch (fuel) {
    case 'gasolina':
      return 'Gasolina';
    case 'diesel':
      return 'Diésel';
    case 'hibrido':
      return 'Híbrido / GLP';
    case 'electrico':
      return '100% Eléctrico / PHEV';
    default:
      return 'Gasolina';
  }
}
