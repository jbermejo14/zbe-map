/**
 * Normativa Oficial de Distintivos Ambientales de la Dirección General de Tráfico (DGT).
 * 
 * Fuentes oficiales verificadas:
 * - Resolución de 13 de abril de 2016, de la Dirección General de Tráfico, por la que se crea el distintivo ambiental (BOE núm. 96, de 21 de abril de 2016).
 *   https://www.boe.es/eli/es/res/2016/04/13/(2)
 * - Real Decreto 2822/1998, de 23 de diciembre, por el que se aprueba el Reglamento General de Vehículos (Anexo II, Definiciones y Categorías).
 * - Portal de consulta de distintivo ambiental de la DGT: https://sede.dgt.gob.es/es/vehiculos/distintivo-ambiental/
 */

export type DgtBadge = 'CERO' | 'ECO' | 'C' | 'B' | 'SIN_ETIQUETA';

export type VehicleCategory = 'M1' | 'N1' | 'L' | 'M2_M3_N2_N3';

export type FuelCategory =
  | 'gasolina'
  | 'diesel'
  | 'hibrido'
  | 'hibrido-enchufable'
  | 'electrico'
  | 'glp-gnc';

export interface VehicleEvaluationInput {
  fuel: FuelCategory | string;
  year: number;
  month?: number; // 1-12 (crítico para Diésel 2015: sep 2015 en adelante Euro 6)
  euroNorm?: number | string | null;
  electricRangeKm?: number | null;
  category?: VehicleCategory;
}

export interface DgtBadgeEvaluation {
  badge: DgtBadge;
  badgeName: string;
  badgeColorHex: string;
  euroStandard: string;
  description: string;
  legalSource: string;
  legalSourceUrl: string;
}

export const DGT_LEGAL_SOURCE = {
  name: 'Resolución de 13 de abril de 2016 de la DGT (BOE núm. 96)',
  url: 'https://www.boe.es/eli/es/res/2016/04/13/(2)',
  dgtPortalUrl: 'https://sede.dgt.gob.es/es/vehiculos/distintivo-ambiental/',
};

/**
 * Normaliza el combustible a la categoría estándar
 */
export function normalizeFuel(input: string): FuelCategory {
  const s = input.toLowerCase().trim();
  if (s.includes('electr') || s.includes('bev') || s === '03000' || s.includes('fcev')) {
    return 'electrico';
  }
  if (s.includes('enchufable') || s.includes('phev')) {
    return 'hibrido-enchufable';
  }
  if (s.includes('hibrid') || s.includes('hev') || s.includes('mhev')) {
    return 'hibrido';
  }
  if (s.includes('gasolina') || s === 'petrol' || s === 'benzin') {
    return 'gasolina';
  }
  if (s.includes('diesel') || s.includes('gasoleo') || s.includes('gasóleo')) {
    return 'diesel';
  }
  if (s.includes('glp') || s.includes('gnc') || s.includes('gnl') || /\bgas\b/.test(s)) {
    return 'glp-gnc';
  }
  return 'gasolina';
}

/**
 * Calcula el distintivo ambiental DGT según normativa oficial publicada en BOE.
 */
export function getOfficialDgtBadge(input: VehicleEvaluationInput): DgtBadgeEvaluation {
  const fuel = normalizeFuel(input.fuel);
  const year = input.year;
  const month = input.month ?? 6; // Si no se especifica mes, mitad de año
  const range = input.electricRangeKm ?? 0;

  // 1. ELÉCTRICO PURO
  if (fuel === 'electrico') {
    return {
      badge: 'CERO',
      badgeName: '0 CERO Emisiones',
      badgeColorHex: '#008ece',
      euroStandard: 'Cero Emisiones locales',
      description: 'Vehículo 100% eléctrico de batería (BEV), de autonomía extendida (REEV) o de pila de combustible de hidrógeno (FCEV).',
      legalSource: DGT_LEGAL_SOURCE.name,
      legalSourceUrl: DGT_LEGAL_SOURCE.url,
    };
  }

  // 2. HÍBRIDO ENCHUFABLE (PHEV)
  if (fuel === 'hibrido-enchufable') {
    if (range >= 40 || range === 0) {
      // Por defecto un PHEV moderno homologa >= 40 km salvo especificación contraria
      return {
        badge: 'CERO',
        badgeName: '0 CERO Emisiones',
        badgeColorHex: '#008ece',
        euroStandard: 'Euro 6',
        description: 'Vehículo híbrido enchufable (PHEV) con una autonomía mínima de 40 km en modo exclusivamente eléctrico.',
        legalSource: DGT_LEGAL_SOURCE.name,
        legalSourceUrl: DGT_LEGAL_SOURCE.url,
      };
    } else {
      return {
        badge: 'ECO',
        badgeName: 'ECO',
        badgeColorHex: '#00a651',
        euroStandard: 'Euro 6',
        description: 'Vehículo híbrido enchufable (PHEV) con una autonomía eléctrica oficial inferior a 40 km.',
        legalSource: DGT_LEGAL_SOURCE.name,
        legalSourceUrl: DGT_LEGAL_SOURCE.url,
      };
    }
  }

  // 3. HÍBRIDO NO ENCHUFABLE (HEV / MHEV)
  if (fuel === 'hibrido') {
    return {
      badge: 'ECO',
      badgeName: 'ECO',
      badgeColorHex: '#00a651',
      euroStandard: 'Euro 6 / Euro 5',
      description: 'Vehículo híbrido no enchufable (HEV) o microhíbrido (MHEV).',
      legalSource: DGT_LEGAL_SOURCE.name,
      legalSourceUrl: DGT_LEGAL_SOURCE.url,
    };
  }

  // 4. GAS (GLP / GNC / GNL)
  if (fuel === 'glp-gnc') {
    // La DGT exige que además cumplan los requisitos de la etiqueta C o B (gasolina >= 2006 o Euro 4)
    if (year >= 2006) {
      return {
        badge: 'ECO',
        badgeName: 'ECO',
        badgeColorHex: '#00a651',
        euroStandard: 'Euro 4 / 5 / 6 + Gas',
        description: 'Vehículo propulsado por Gas Licuado de Petróleo (GLP) o Gas Natural (GNC/GNL) que cumple los umbrales de emisiones Euro 4 o superior.',
        legalSource: DGT_LEGAL_SOURCE.name,
        legalSourceUrl: DGT_LEGAL_SOURCE.url,
      };
    } else {
      return {
        badge: 'SIN_ETIQUETA',
        badgeName: 'Sin Distintivo (Categoría A)',
        badgeColorHex: '#6b7280',
        euroStandard: 'Euro 3 o anterior',
        description: 'Vehículo a gas anterior a 2006. La normativa DGT no le otorga distintivo por no alcanzar la homologación Euro 4.',
        legalSource: DGT_LEGAL_SOURCE.name,
        legalSourceUrl: DGT_LEGAL_SOURCE.url,
      };
    }
  }

  // 5. DIÉSEL
  if (fuel === 'diesel') {
    // Criterio frontera DGT: septiembre de 2015 (Euro 6)
    const isEuro6 = year > 2015 || (year === 2015 && month >= 9);
    // Criterio frontera DGT B: 2006 a agosto de 2015 (Euro 4 o 5)
    const isEuro4Or5 = year >= 2006 && !isEuro6;

    if (isEuro6) {
      return {
        badge: 'C',
        badgeName: 'Etiqueta C (Verde)',
        badgeColorHex: '#10b981',
        euroStandard: 'Euro 6',
        description: 'Turismo o comercial ligero diésel matriculado a partir de septiembre de 2015, bajo homologación Euro 6.',
        legalSource: DGT_LEGAL_SOURCE.name,
        legalSourceUrl: DGT_LEGAL_SOURCE.url,
      };
    } else if (isEuro4Or5) {
      return {
        badge: 'B',
        badgeName: 'Etiqueta B (Amarilla)',
        badgeColorHex: '#eab308',
        euroStandard: year >= 2011 ? 'Euro 5' : 'Euro 4',
        description: 'Turismo o comercial ligero diésel matriculado entre enero de 2006 y agosto de 2015, bajo homologación Euro 4 o Euro 5.',
        legalSource: DGT_LEGAL_SOURCE.name,
        legalSourceUrl: DGT_LEGAL_SOURCE.url,
      };
    } else {
      return {
        badge: 'SIN_ETIQUETA',
        badgeName: 'Sin Distintivo (Categoría A)',
        badgeColorHex: '#6b7280',
        euroStandard: 'Euro 1 / Euro 2 / Euro 3',
        description: 'Turismo o comercial ligero diésel matriculado antes de 2006. No cumple los requisitos mínimos de emisiones para obtener distintivo ambiental.',
        legalSource: DGT_LEGAL_SOURCE.name,
        legalSourceUrl: DGT_LEGAL_SOURCE.url,
      };
    }
  }

  // 6. GASOLINA
  if (year >= 2006) {
    return {
      badge: 'C',
      badgeName: 'Etiqueta C (Verde)',
      badgeColorHex: '#10b981',
      euroStandard: year >= 2015 ? 'Euro 6' : year >= 2011 ? 'Euro 5' : 'Euro 4',
      description: 'Turismo o comercial ligero de gasolina matriculado a partir de enero de 2006, bajo homologación Euro 4, Euro 5 o Euro 6.',
      legalSource: DGT_LEGAL_SOURCE.name,
      legalSourceUrl: DGT_LEGAL_SOURCE.url,
    };
  } else if (year >= 2001 && year <= 2005) {
    return {
      badge: 'B',
      badgeName: 'Etiqueta B (Amarilla)',
      badgeColorHex: '#eab308',
      euroStandard: 'Euro 3',
      description: 'Turismo o comercial ligero de gasolina matriculado entre enero de 2001 y diciembre de 2005, bajo homologación Euro 3.',
      legalSource: DGT_LEGAL_SOURCE.name,
      legalSourceUrl: DGT_LEGAL_SOURCE.url,
    };
  } else {
    return {
      badge: 'SIN_ETIQUETA',
      badgeName: 'Sin Distintivo (Categoría A)',
      badgeColorHex: '#6b7280',
      euroStandard: 'Euro 0 / Euro 1 / Euro 2',
      description: 'Turismo o comercial ligero de gasolina matriculado antes del 1 de enero de 2001. No cumple los requisitos mínimos para obtener distintivo ambiental.',
      legalSource: DGT_LEGAL_SOURCE.name,
      legalSourceUrl: DGT_LEGAL_SOURCE.url,
    };
  }
}

/**
 * Alias de compatibilidad para cálculo de distintivo DGT
 */
export function calculateDgtBadge(input: {
  fuel: FuelCategory | string;
  registrationYear?: number | null;
  year?: number;
  month?: number;
  euroNorm?: number | string | null;
  electricRangeKm?: number | null;
  category?: VehicleCategory;
}): DgtBadgeEvaluation {
  return getOfficialDgtBadge({
    fuel: input.fuel,
    year: input.year ?? input.registrationYear ?? 2024,
    month: input.month,
    euroNorm: input.euroNorm,
    electricRangeKm: input.electricRangeKm,
    category: input.category,
  });
}
