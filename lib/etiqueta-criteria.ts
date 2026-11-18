/**
 * Criterios de cada etiqueta ambiental para la página índice /etiqueta-dgt.
 * Reflejan las reglas de lib/dgt-rules.ts (Resolución de 13 de abril de 2016, BOE núm. 96).
 */
import type { DgtBadgeType } from './zbe-engine.ts';

export interface EtiquetaCriteria {
  badge: DgtBadgeType;
  title: string;
  /** Un criterio por línea: combustible, años y norma Euro. */
  rules: string[];
}

export const ETIQUETA_CRITERIA: EtiquetaCriteria[] = [
  {
    badge: 'CERO',
    title: 'Etiqueta 0 Emisiones',
    rules: [
      'Eléctricos de batería (BEV), de autonomía extendida (REEV) y de pila de hidrógeno.',
      'Híbridos enchufables (PHEV) con una autonomía eléctrica oficial de 40 km o más.',
    ],
  },
  {
    badge: 'ECO',
    title: 'Etiqueta ECO',
    rules: [
      'Híbridos no enchufables (HEV) y microhíbridos (MHEV).',
      'Híbridos enchufables con menos de 40 km de autonomía eléctrica.',
      'Vehículos de gas (GLP o GNC) matriculados desde 2006, con norma Euro 4 o superior.',
    ],
  },
  {
    badge: 'C',
    title: 'Etiqueta C (verde)',
    rules: [
      'Gasolina matriculada desde enero de 2006 (Euro 4, 5 o 6).',
      'Diésel matriculado desde septiembre de 2015 (Euro 6).',
    ],
  },
  {
    badge: 'B',
    title: 'Etiqueta B (amarilla)',
    rules: [
      'Gasolina matriculada entre enero de 2001 y diciembre de 2005 (Euro 3).',
      'Diésel matriculado entre enero de 2006 y agosto de 2015 (Euro 4 o 5).',
    ],
  },
  {
    badge: 'SIN_ETIQUETA',
    title: 'Sin etiqueta',
    rules: [
      'Gasolina matriculada antes de 2001 (Euro 2 o anterior).',
      'Diésel y gas matriculados antes de 2006 (Euro 3 o anterior).',
    ],
  },
];
