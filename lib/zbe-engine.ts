/**
 * Motor ZBE de Ododex
 * Lógica oficial de deducción de Distintivo Ambiental DGT y evaluación de acceso municipal.
 */

export type DgtBadgeType = 'CERO' | 'ECO' | 'C' | 'B' | 'SIN_ETIQUETA';

export type ZbeAccessStatus = 'allowed' | 'restricted' | 'banned';

export interface VehicleDgtInput {
  propulsionCode: string;
  euroNorm?: string | null;
  registrationYear?: number | null;
  registrationDate?: string | Date | null;
  electricRangeKm?: number | null;
}

export interface DgtBadgeResult {
  badge: DgtBadgeType;
  badgeLabel: string;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
  explanation: string;
  euroStandard: string;
}

export interface CityEvaluationResult {
  cityId: string;
  cityName: string;
  slug: string;
  province: string;
  region: string;
  lat: number;
  lng: number;
  status: ZbeAccessStatus;
  statusLabel: string;
  statusColor: string;
  reason: string;
  fineAmount: number;
  schedule: string;
  summary: string;
  parkingCondition?: string | null;
  exemptions: string[];
  perimeterName?: string | null;
  areaKm2?: number | null;
  polygon?: [number, number][] | null;
  streets?: string[] | null;
  geoJSON?: any;
  sourceUrl?: string | null;
  sourceName?: string | null;
  verificationStatus?: 'verified' | 'pending' | null;
  lastVerified?: string | null;
}

export interface VehicleRecord {
  id: string;
  brand: string;
  model: string;
  version: string;
  year: number;
  propulsionCode: string;
  euroNorm: string;
  dgtBadge: string;
  electricRangeKm?: number | null;
  co2Emissions?: number | null;
  powerKw: number;
  powerCv: number;
  bodyType: string;
  wheelbaseMm: number;
  slug: string;
}

/**
 * Deducción exacta del distintivo ambiental oficial de la DGT
 */
export function calculateDgtBadge(vehicle: VehicleDgtInput): DgtBadgeResult {
  const propulsion = (vehicle.propulsionCode || '').toUpperCase().trim();
  const euro = (vehicle.euroNorm || '').toUpperCase().trim();
  const range = vehicle.electricRangeKm ?? 0;

  let year = vehicle.registrationYear;
  if (!year && vehicle.registrationDate) {
    const d = new Date(vehicle.registrationDate);
    if (!isNaN(d.getFullYear())) {
      year = d.getFullYear();
    }
  }

  const euroNumberMatch = euro.match(/EURO\s*([0-9]+)/i);
  const euroNumber = euroNumberMatch ? parseInt(euroNumberMatch[1], 10) : null;

  // 1. CERO EMISIONES
  const isElectricPure =
    propulsion.includes('BEV') ||
    propulsion.includes('ELECTR') ||
    propulsion === '03000' ||
    propulsion.includes('FCEV') ||
    propulsion.includes('HIDROGENO');

  const isPhev = propulsion.includes('PHEV') || propulsion.includes('ENCHUFABLE');

  if (isElectricPure) {
    return {
      badge: 'CERO',
      badgeLabel: '0 Emisiones',
      badgeColor: '#008ece',
      badgeBg: 'bg-sky-500',
      badgeBorder: 'border-sky-400',
      explanation: 'Vehículo 100% eléctrico (BEV). Libre circulación y estacionamiento bonificado sin límites.',
      euroStandard: euro || 'Cero Emisiones',
    };
  }

  if (isPhev) {
    if (range >= 40 || range === 0) {
      return {
        badge: 'CERO',
        badgeLabel: '0 Emisiones',
        badgeColor: '#008ece',
        badgeBg: 'bg-sky-500',
        badgeBorder: 'border-sky-400',
        explanation: 'Híbrido enchufable (PHEV) con autonomía eléctrica oficial igual o superior a 40 km.',
        euroStandard: euro || 'Euro 6',
      };
    } else {
      return {
        badge: 'ECO',
        badgeLabel: 'ECO',
        badgeColor: '#00a651',
        badgeBg: 'bg-emerald-600',
        badgeBorder: 'border-emerald-500',
        explanation: 'Híbrido enchufable (PHEV) con autonomía eléctrica inferior a 40 km.',
        euroStandard: euro || 'Euro 6',
      };
    }
  }

  // 2. ECO
  const isEcoGasOrHybrid =
    propulsion.includes('HEV') ||
    propulsion.includes('MHEV') ||
    propulsion.includes('HIBRID') ||
    propulsion.includes('GLP') ||
    propulsion.includes('GNC') ||
    propulsion.includes('GAS');

  if (isEcoGasOrHybrid) {
    return {
      badge: 'ECO',
      badgeLabel: 'ECO',
      badgeColor: '#00a651',
      badgeBg: 'bg-emerald-600',
      badgeBorder: 'border-emerald-500',
      explanation: 'Vehículo híbrido no enchufable (HEV/MHEV) o impulsado por gas (GLP/GNC).',
      euroStandard: euro || (euroNumber ? `Euro ${euroNumber}` : 'Euro 6'),
    };
  }

  // 3. COMBUSTIÓN
  const isDiesel = propulsion.includes('DIESEL') || propulsion.includes('GASOLEO');
  const isPetrol = propulsion.includes('GASOLINA') || (!isDiesel && !isElectricPure);

  // Gasolina
  if (isPetrol) {
    if (euroNumber !== null) {
      if (euroNumber >= 4) {
        return {
          badge: 'C',
          badgeLabel: 'C (Verde)',
          badgeColor: '#10b981',
          badgeBg: 'bg-emerald-500',
          badgeBorder: 'border-emerald-400',
          explanation: `Turismo gasolina Euro ${euroNumber} (Euro 4 o superior).`,
          euroStandard: `Euro ${euroNumber}`,
        };
      } else if (euroNumber === 3) {
        return {
          badge: 'B',
          badgeLabel: 'B (Amarillo)',
          badgeColor: '#eab308',
          badgeBg: 'bg-yellow-500',
          badgeBorder: 'border-yellow-400',
          explanation: 'Turismo gasolina Euro 3 (matriculado habitualmente entre 2001 y 2005).',
          euroStandard: 'Euro 3',
        };
      } else {
        return {
          badge: 'SIN_ETIQUETA',
          badgeLabel: 'Sin Distintivo (A)',
          badgeColor: '#ef4444',
          badgeBg: 'bg-red-600',
          badgeBorder: 'border-red-500',
          explanation: `Turismo gasolina anterior a Euro 3 (Euro ${euroNumber}). Categoría ambiental A.`,
          euroStandard: `Euro ${euroNumber}`,
        };
      }
    }

    if (year !== null && year !== undefined) {
      if (year >= 2006) {
        return {
          badge: 'C',
          badgeLabel: 'C (Verde)',
          badgeColor: '#10b981',
          badgeBg: 'bg-emerald-500',
          badgeBorder: 'border-emerald-400',
          explanation: `Turismo gasolina matriculado en ${year} (normativa Euro 4/5/6).`,
          euroStandard: year >= 2015 ? 'Euro 6' : year >= 2011 ? 'Euro 5' : 'Euro 4',
        };
      } else if (year >= 2001) {
        return {
          badge: 'B',
          badgeLabel: 'B (Amarillo)',
          badgeColor: '#eab308',
          badgeBg: 'bg-yellow-500',
          badgeBorder: 'border-yellow-400',
          explanation: `Turismo gasolina matriculado en ${year} (criterio DGT 2001-2005).`,
          euroStandard: 'Euro 3',
        };
      } else {
        return {
          badge: 'SIN_ETIQUETA',
          badgeLabel: 'Sin Distintivo (A)',
          badgeColor: '#ef4444',
          badgeBg: 'bg-red-600',
          badgeBorder: 'border-red-500',
          explanation: `Turismo gasolina matriculado en ${year} (anterior a 2001). Sin derecho a distintivo ambiental.`,
          euroStandard: 'Euro 1 / Euro 2',
        };
      }
    }
  }

  // Diésel
  if (isDiesel) {
    if (euroNumber !== null) {
      if (euroNumber >= 6) {
        return {
          badge: 'C',
          badgeLabel: 'C (Verde)',
          badgeColor: '#10b981',
          badgeBg: 'bg-emerald-500',
          badgeBorder: 'border-emerald-400',
          explanation: `Turismo diésel Euro ${euroNumber} (Euro 6).`,
          euroStandard: `Euro ${euroNumber}`,
        };
      } else if (euroNumber === 4 || euroNumber === 5) {
        return {
          badge: 'B',
          badgeLabel: 'B (Amarillo)',
          badgeColor: '#eab308',
          badgeBg: 'bg-yellow-500',
          badgeBorder: 'border-yellow-400',
          explanation: `Turismo diésel Euro ${euroNumber} (Euro 4 o Euro 5).`,
          euroStandard: `Euro ${euroNumber}`,
        };
      } else {
        return {
          badge: 'SIN_ETIQUETA',
          badgeLabel: 'Sin Distintivo (A)',
          badgeColor: '#ef4444',
          badgeBg: 'bg-red-600',
          badgeBorder: 'border-red-500',
          explanation: `Turismo diésel anterior a Euro 4 (Euro ${euroNumber}). Categoría ambiental A.`,
          euroStandard: `Euro ${euroNumber}`,
        };
      }
    }

    if (year !== null && year !== undefined) {
      if (year >= 2016 || (year === 2015 && vehicle.registrationDate && new Date(vehicle.registrationDate).getMonth() >= 8)) {
        return {
          badge: 'C',
          badgeLabel: 'C (Verde)',
          badgeColor: '#10b981',
          badgeBg: 'bg-emerald-500',
          badgeBorder: 'border-emerald-400',
          explanation: `Turismo diésel matriculado a partir de septiembre 2015 (${year}), normativa Euro 6.`,
          euroStandard: 'Euro 6',
        };
      } else if (year >= 2006) {
        return {
          badge: 'B',
          badgeLabel: 'B (Amarillo)',
          badgeColor: '#eab308',
          badgeBg: 'bg-yellow-500',
          badgeBorder: 'border-yellow-400',
          explanation: `Turismo diésel matriculado en ${year} (criterio DGT 2006 a agosto 2015, Euro 4/5).`,
          euroStandard: year >= 2011 ? 'Euro 5' : 'Euro 4',
        };
      } else {
        return {
          badge: 'SIN_ETIQUETA',
          badgeLabel: 'Sin Distintivo (A)',
          badgeColor: '#ef4444',
          badgeBg: 'bg-red-600',
          badgeBorder: 'border-red-500',
          explanation: `Turismo diésel matriculado en ${year} (anterior a 2006). Sin derecho a distintivo ambiental.`,
          euroStandard: 'Euro 1 / Euro 2 / Euro 3',
        };
      }
    }
  }

  return {
    badge: 'SIN_ETIQUETA',
    badgeLabel: 'Sin Distintivo (A)',
    badgeColor: '#ef4444',
    badgeBg: 'bg-red-600',
    badgeBorder: 'border-red-500',
    explanation: 'Vehículo que no cumple los umbrales de emisiones del Plan Nacional de Calidad del Aire.',
    euroStandard: 'No catalogado',
  };
}

/**
 * Obtener metadatos estáticos de un distintivo
 */
export function getBadgeMetadata(badge: DgtBadgeType) {
  switch (badge) {
    case 'CERO':
      return {
        name: '0 Emisiones',
        color: '#008ece',
        bgClass: 'bg-sky-500',
        textClass: 'text-sky-400',
        borderClass: 'border-sky-500',
      };
    case 'ECO':
      return {
        name: 'ECO',
        color: '#00a651',
        bgClass: 'bg-emerald-600',
        textClass: 'text-emerald-400',
        borderClass: 'border-emerald-500',
      };
    case 'C':
      return {
        name: 'C (Verde)',
        color: '#10b981',
        bgClass: 'bg-emerald-500',
        textClass: 'text-emerald-400',
        borderClass: 'border-emerald-500',
      };
    case 'B':
      return {
        name: 'B (Amarillo)',
        color: '#eab308',
        bgClass: 'bg-yellow-500',
        textClass: 'text-yellow-400',
        borderClass: 'border-yellow-500',
      };
    case 'SIN_ETIQUETA':
      return {
        name: 'Sin Etiqueta (A)',
        color: '#ef4444',
        bgClass: 'bg-red-600',
        textClass: 'text-red-400',
        borderClass: 'border-red-500',
      };
  }
}

/**
 * Presentación visual del estado de acceso
 */
export function getAccessStatusPresentation(status: ZbeAccessStatus) {
  switch (status) {
    case 'allowed':
      return {
        label: 'Acceso Libre',
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
        dotColor: '#10b981',
        textClass: 'text-emerald-400',
        cardBorder: 'border-emerald-500/20 hover:border-emerald-500/40',
      };
    case 'restricted':
      return {
        label: 'Acceso Restringido / Parking',
        badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
        dotColor: '#f59e0b',
        textClass: 'text-amber-400',
        cardBorder: 'border-amber-500/20 hover:border-amber-500/40',
      };
    case 'banned':
      return {
        label: 'Acceso Prohibido',
        badgeClass: 'bg-red-500/15 text-red-400 border border-red-500/30',
        dotColor: '#ef4444',
        textClass: 'text-red-400',
        cardBorder: 'border-red-500/20 hover:border-red-500/40',
      };
  }
}

/**
 * Evalúa una lista de ciudades para un distintivo ambiental dado
 */
export function evaluateCitiesForBadge(
  badge: DgtBadgeType,
  cities: Array<{
    id: string;
    slug: string;
    name: string;
    province: string;
    region: string;
    lat: number;
    lng: number;
    fineAmount: number;
    schedule: string;
    summary: string;
    parkingCondition?: string | null;
    exemptions: string | string[];
    perimeterName?: string | null;
    areaKm2?: number | null;
    polygon?: any;
    streets?: any;
    geoJSON?: any;
    rules?: any;
    sourceUrl?: string | null;
    sourceName?: string | null;
    verificationStatus?: 'verified' | 'pending' | null;
    lastVerified?: string | null;
  }>
): CityEvaluationResult[] {
  return cities.map((city) => {
    let status: ZbeAccessStatus = 'allowed';
    let reason = 'Circulación permitida sin restricciones.';

    if (city.rules) {
      if (Array.isArray(city.rules)) {
        const rule = city.rules.find((r) => r.dgtBadge === badge);
        if (rule) {
          status = rule.accessStatus as ZbeAccessStatus;
          reason = rule.reason;
        }
      } else if (typeof city.rules === 'object' && (city.rules as any)[badge]) {
        const rule = (city.rules as any)[badge];
        status = (rule.status || rule.accessStatus) as ZbeAccessStatus;
        reason = rule.reason;
      }
    }

    const pres = getAccessStatusPresentation(status);
    let parsedExemptions: string[] = [];
    if (typeof city.exemptions === 'string') {
      try {
        parsedExemptions = JSON.parse(city.exemptions);
      } catch {
        parsedExemptions = [city.exemptions];
      }
    } else if (Array.isArray(city.exemptions)) {
      parsedExemptions = city.exemptions;
    }

    let parsedPolygon: [number, number][] | null = null;
    if (city.polygon) {
      if (typeof city.polygon === 'string') {
        try {
          parsedPolygon = JSON.parse(city.polygon);
        } catch {
          parsedPolygon = null;
        }
      } else if (Array.isArray(city.polygon)) {
        parsedPolygon = city.polygon;
      }
    }

    let parsedStreets: string[] | null = null;
    if (city.streets) {
      if (typeof city.streets === 'string') {
        try {
          parsedStreets = JSON.parse(city.streets);
        } catch {
          parsedStreets = [city.streets];
        }
      } else if (Array.isArray(city.streets)) {
        parsedStreets = city.streets;
      }
    }

    let parsedGeoJSON: any = null;
    if (city.geoJSON) {
      if (typeof city.geoJSON === 'string') {
        try {
          parsedGeoJSON = JSON.parse(city.geoJSON);
        } catch {
          parsedGeoJSON = null;
        }
      } else if (typeof city.geoJSON === 'object') {
        parsedGeoJSON = city.geoJSON;
      }
    }

    return {
      cityId: city.id,
      cityName: city.name,
      slug: city.slug,
      province: city.province,
      region: city.region,
      lat: city.lat,
      lng: city.lng,
      status,
      statusLabel: pres.label,
      statusColor: pres.dotColor,
      reason,
      fineAmount: city.fineAmount,
      schedule: city.schedule,
      summary: city.summary,
      parkingCondition: city.parkingCondition,
      exemptions: parsedExemptions,
      perimeterName: city.perimeterName || `Zona ZBE ${city.name}`,
      areaKm2: city.areaKm2 || 2.5,
      polygon: parsedPolygon,
      streets: parsedStreets,
      geoJSON: parsedGeoJSON,
      sourceUrl: city.sourceUrl ?? null,
      sourceName: city.sourceName ?? null,
      verificationStatus: city.verificationStatus ?? null,
      lastVerified: city.lastVerified ?? null,
    };
  });
}

/**
 * Motor de recomendación de coches equivalentes con etiqueta ECO o CERO
 * Filtra por:
 * 1. Misma carrocería (bodyType)
 * 2. Batalla similar (±100 mm)
 * 3. Potencia similar (±20% kW)
 * 4. Distintivo ECO o CERO
 */
export function findEquivalentEcoCars(
  target: {
    id?: string;
    bodyType: string;
    wheelbaseMm: number;
    powerKw: number;
  },
  candidates: VehicleRecord[]
): VehicleRecord[] {
  const ecoCandidates = candidates.filter(
    (c) => (c.dgtBadge === 'ECO' || c.dgtBadge === 'CERO') && c.id !== target.id
  );

  // Intento 1: Coincidencia estricta (Misma carrocería, ±100 mm batalla, ±20% kW)
  let matches = ecoCandidates.filter((c) => {
    const bodyMatch = c.bodyType.toLowerCase() === target.bodyType.toLowerCase();
    const wheelbaseDiff = Math.abs(c.wheelbaseMm - target.wheelbaseMm);
    const powerMin = target.powerKw * 0.8;
    const powerMax = target.powerKw * 1.25;
    const powerMatch = c.powerKw >= powerMin && c.powerKw <= powerMax;

    return bodyMatch && wheelbaseDiff <= 100 && powerMatch;
  });

  // Intento 2: Relajar a ±150 mm y ±35% kW si no hay suficientes
  if (matches.length < 3) {
    const existingIds = new Set(matches.map((m) => m.id));
    const relaxed = ecoCandidates.filter((c) => {
      if (existingIds.has(c.id)) return false;
      const bodyMatch = c.bodyType.toLowerCase() === target.bodyType.toLowerCase();
      const wheelbaseDiff = Math.abs(c.wheelbaseMm - target.wheelbaseMm);
      const powerMin = target.powerKw * 0.65;
      const powerMax = target.powerKw * 1.45;
      const powerMatch = c.powerKw >= powerMin && c.powerKw <= powerMax;

      return bodyMatch && (wheelbaseDiff <= 150 || powerMatch);
    });
    matches = [...matches, ...relaxed];
  }

  // Intento 3: Si aún hay menos de 3, añadir cualquier ECO/CERO de la misma categoría de carrocería
  if (matches.length < 3) {
    const existingIds = new Set(matches.map((m) => m.id));
    const fallback = ecoCandidates.filter(
      (c) => !existingIds.has(c.id) && c.bodyType.toLowerCase() === target.bodyType.toLowerCase()
    );
    matches = [...matches, ...fallback];
  }

  // Intento 4: Si todavía falta, rellenar con los ECO/CERO más populares
  if (matches.length < 3) {
    const existingIds = new Set(matches.map((m) => m.id));
    const ultimateFallback = ecoCandidates.filter((c) => !existingIds.has(c.id));
    matches = [...matches, ...ultimateFallback];
  }

  return matches.slice(0, 3);
}
