import { DgtBadgeType } from '@/lib/zbe-engine';
import { prisma } from '@/lib/prisma';

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
  confidence: 'official' | 'high_estimation' | 'provincial_vintage';
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

/**
 * Consulta de matrícula y deducción de distintivo ambiental oficial DGT
 * con soporte para tipo de combustible
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
    const sampleOldCar = await prisma.vehicle.findFirst({
      where: { dgtBadge: 'SIN_ETIQUETA' },
    });

    return {
      plate: cleaned,
      formattedPlate: formatted,
      badge: 'SIN_ETIQUETA',
      estimatedYear: 1998,
      badgeLabel: 'Sin Etiqueta (Categoría A)',
      fuelType,
      fuelLabel: getFuelLabel(fuelType),
      explanation: 'Matrícula provincial (anterior a septiembre de 2000). Al no cumplir la norma Euro 3 de gasolina ni Euro 4 de diésel, no tiene derecho a distintivo ambiental oficial de la DGT.',
      confidence: 'provincial_vintage',
      matchedVehicle: sampleOldCar,
    };
  }

  // 2. Matrícula moderna (4 números + 3 letras)
  const numbers = cleaned.slice(0, 4);
  const letters = cleaned.slice(4);
  const formattedPlate = `${numbers} ${letters}`;
  const estimatedYear = estimateYearFromModernPlate(letters);

  let deducedBadge: DgtBadgeType = 'C';
  let badgeLabel = 'Etiqueta C (Verde)';
  let explanation = '';

  // Reglas oficiales DGT según combustible y año de matriculación
  if (fuelType === 'electrico') {
    deducedBadge = 'CERO';
    badgeLabel = 'Etiqueta 0 CERO (Azul)';
    explanation = `Matrícula asignada hacia ${estimatedYear}. Por ser vehículo 100% Eléctrico (BEV) o Híbrido Enchufable (PHEV) con autonomía ≥40 km, le corresponde el distintivo 0 CERO oficial.`;
  } else if (fuelType === 'hibrido') {
    deducedBadge = 'ECO';
    badgeLabel = 'Etiqueta ECO (Azul/Verde)';
    explanation = `Matrícula de ${estimatedYear}. Por incorporar tecnología Híbrida (HEV/MHEV), gas GLP o GNC, le corresponde el distintivo ECO oficial de la DGT.`;
  } else if (fuelType === 'diesel') {
    if (estimatedYear >= 2016) {
      deducedBadge = 'C';
      badgeLabel = 'Etiqueta C (Verde)';
      explanation = `Vehículo Diésel matriculado en ${estimatedYear} (serie ${letters}). Al ser posterior a septiembre de 2015, cumple la homologación Euro 6 y le corresponde Etiqueta C.`;
    } else if (estimatedYear >= 2006 && estimatedYear <= 2015) {
      deducedBadge = 'B';
      badgeLabel = 'Etiqueta B (Amarilla)';
      explanation = `Vehículo Diésel matriculado en ${estimatedYear} (serie ${letters}). Cumple las normativas Euro 4 o Euro 5, por lo que la DGT le otorga la Etiqueta B.`;
    } else {
      deducedBadge = 'SIN_ETIQUETA';
      badgeLabel = 'Sin Etiqueta (Categoría A)';
      explanation = `Vehículo Diésel matriculado en ${estimatedYear} (anterior a 2006). Al ser Euro 3 o anterior, carece de distintivo ambiental oficial.`;
    }
  } else {
    // Gasolina (o 'auto' por defecto)
    if (estimatedYear >= 2006) {
      deducedBadge = 'C';
      badgeLabel = 'Etiqueta C (Verde)';
      explanation = `Vehículo Gasolina matriculado en ${estimatedYear} (serie ${letters}). Cumple la normativa Euro 4, Euro 5 o Euro 6, correspondiéndole la Etiqueta C.`;
    } else if (estimatedYear >= 2001 && estimatedYear <= 2005) {
      deducedBadge = 'B';
      badgeLabel = 'Etiqueta B (Amarilla)';
      explanation = `Vehículo Gasolina matriculado en ${estimatedYear} (serie ${letters}). Cumple la homologación Euro 3, correspondiéndole la Etiqueta B.`;
    } else {
      deducedBadge = 'SIN_ETIQUETA';
      badgeLabel = 'Sin Etiqueta (Categoría A)';
      explanation = `Vehículo Gasolina matriculado en ${estimatedYear} (anterior a 2001). Al ser Euro 2 o anterior, no le corresponde distintivo ambiental.`;
    }
  }

  // Buscar un coche representativo en la BD con la MISMA etiqueta calculada
  const matchedVehicle = await prisma.vehicle.findFirst({
    where: {
      dgtBadge: deducedBadge,
    },
    orderBy: { year: 'desc' },
  });

  return {
    plate: cleaned,
    formattedPlate,
    badge: deducedBadge,
    estimatedYear,
    badgeLabel,
    fuelType,
    fuelLabel: getFuelLabel(fuelType),
    explanation,
    confidence: 'high_estimation',
    matchedVehicle: matchedVehicle || null,
  };
}

function getFuelLabel(fuel: FuelType): string {
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
      return 'Combustión';
  }
}
