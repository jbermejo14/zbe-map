/**
 * Parser de microdatos de la Dirección General de Tráfico (DGT)
 * Soporta ficheros de ancho fijo estándar MATRABA (matriculaciones) y TRANSRABA (transferencias)
 * con codificación ISO-8859-1.
 */

import { calculateDgtBadge, DgtBadgeResult } from './zbe-engine';

export interface RawDgtRecord {
  vin: string;
  registrationDate: Date | null;
  registrationYear: number;
  brand: string;
  model: string;
  version: string;
  propulsionCode: string;
  euroNorm: string;
  powerKw: number;
  powerCv: number;
  co2Emissions: number | null;
  wheelbaseMm: number;
  bodyType: string;
  electricRangeKm: number | null;
}

export interface ParsedVehicleRecord extends RawDgtRecord {
  dgtBadge: DgtBadgeResult;
  slug: string;
}

/**
 * Especificación de campos de ancho fijo de ficheros DGT
 */
export const DGT_FIELD_SPEC = {
  VIN: { start: 0, length: 17 },
  REGISTRATION_DATE: { start: 17, length: 8 }, // YYYYMMDD
  BRAND: { start: 25, length: 30 },
  MODEL: { start: 55, length: 50 },
  PROPULSION: { start: 105, length: 10 },
  EURO_NORM: { start: 115, length: 15 },
  POWER_KW: { start: 130, length: 8 },
  CO2: { start: 138, length: 8 },
  WHEELBASE_MM: { start: 146, length: 8 },
  BODY_TYPE: { start: 154, length: 20 },
  ELECTRIC_RANGE: { start: 174, length: 6 },
  VERSION: { start: 180, length: 60 },
};

/**
 * Función para crear slug amigable a SEO
 */
export function generateSlug(brand: string, model: string, version?: string): string {
  const text = `${brand} ${model} ${version || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres no alfanuméricos por guión
    .replace(/^-+|-+$/g, ''); // Trim de guiones

  return text;
}

/**
 * Parsea una línea de texto de ancho fijo de la DGT
 */
export function parseDgtFixedWidthLine(line: string): ParsedVehicleRecord | null {
  if (!line || line.trim().length < 50) return null;

  const extract = (spec: { start: number; length: number }) => {
    return line.slice(spec.start, spec.start + spec.length).trim();
  };

  const rawVin = extract(DGT_FIELD_SPEC.VIN);
  const rawDate = extract(DGT_FIELD_SPEC.REGISTRATION_DATE);
  const brand = extract(DGT_FIELD_SPEC.BRAND);
  const model = extract(DGT_FIELD_SPEC.MODEL);
  const propulsion = extract(DGT_FIELD_SPEC.PROPULSION);
  const euro = extract(DGT_FIELD_SPEC.EURO_NORM);
  const rawKw = extract(DGT_FIELD_SPEC.POWER_KW);
  const rawCo2 = extract(DGT_FIELD_SPEC.CO2);
  const rawWheelbase = extract(DGT_FIELD_SPEC.WHEELBASE_MM);
  const bodyType = extract(DGT_FIELD_SPEC.BODY_TYPE) || 'Compacto';
  const rawRange = extract(DGT_FIELD_SPEC.ELECTRIC_RANGE);
  const version = extract(DGT_FIELD_SPEC.VERSION) || `${model} ${propulsion}`;

  if (!brand || !model) return null;

  // Fechas
  let regDate: Date | null = null;
  let year = new Date().getFullYear();
  if (rawDate && rawDate.length === 8) {
    const y = parseInt(rawDate.substring(0, 4), 10);
    const m = parseInt(rawDate.substring(4, 6), 10) - 1;
    const d = parseInt(rawDate.substring(6, 8), 10);
    regDate = new Date(Date.UTC(y, m, d));
    if (!isNaN(y)) year = y;
  }

  const powerKw = parseFloat(rawKw) || 85;
  const powerCv = Math.round(powerKw * 1.35962 * 10) / 10;
  const co2 = rawCo2 ? parseFloat(rawCo2) : null;
  const wheelbaseMm = parseInt(rawWheelbase, 10) || 2600;
  const electricRangeKm = rawRange ? parseInt(rawRange, 10) : null;

  // Calcular Distintivo DGT
  const dgtBadge = calculateDgtBadge({
    propulsionCode: propulsion,
    euroNorm: euro,
    registrationYear: year,
    registrationDate: regDate,
    electricRangeKm,
  });

  const slug = generateSlug(brand, model, version);

  return {
    vin: rawVin,
    registrationDate: regDate,
    registrationYear: year,
    brand,
    model,
    version,
    propulsionCode: propulsion,
    euroNorm: euro || dgtBadge.euroStandard,
    powerKw,
    powerCv,
    co2Emissions: co2,
    wheelbaseMm,
    bodyType,
    electricRangeKm,
    dgtBadge,
    slug,
  };
}

/**
 * Formateador de línea a ancho fijo (usado para generar ficheros TXT idénticos a los de la DGT)
 */
export function formatDgtFixedWidthLine(record: {
  vin: string;
  registrationDate: string; // YYYYMMDD
  brand: string;
  model: string;
  propulsion: string;
  euroNorm: string;
  powerKw: number;
  co2Emissions: number;
  wheelbaseMm: number;
  bodyType: string;
  electricRangeKm: number;
  version: string;
}): string {
  const pad = (str: string, len: number) => (str || '').padEnd(len, ' ').slice(0, len);
  const padNum = (num: number, len: number, decimals: number = 0) => {
    const val = decimals > 0 ? num.toFixed(decimals) : String(num);
    return val.padStart(len, '0').slice(0, len);
  };

  return (
    pad(record.vin, 17) +
    pad(record.registrationDate, 8) +
    pad(record.brand, 30) +
    pad(record.model, 50) +
    pad(record.propulsion, 10) +
    pad(record.euroNorm, 15) +
    padNum(record.powerKw, 8, 2) +
    padNum(record.co2Emissions, 8, 1) +
    padNum(record.wheelbaseMm, 8) +
    pad(record.bodyType, 20) +
    padNum(record.electricRangeKm, 6) +
    pad(record.version, 60)
  );
}
