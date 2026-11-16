import vehiclesJson from '../data/reference-vehicles.json' with { type: 'json' };
import type { VehicleRecord } from './zbe-engine.ts';

const vehicles: VehicleRecord[] = vehiclesJson as unknown as VehicleRecord[];

export function getAllReferenceVehicles(): VehicleRecord[] {
  return vehicles;
}

export function getBrands(): string[] {
  const brandsSet = new Set<string>();
  for (const v of vehicles) {
    if (v.brand) brandsSet.add(v.brand);
  }
  return Array.from(brandsSet).sort();
}

export function getModelsByBrand(brand: string): string[] {
  const modelsSet = new Set<string>();
  const brandLower = brand.toLowerCase();
  for (const v of vehicles) {
    if (v.brand.toLowerCase() === brandLower) {
      modelsSet.add(v.model);
    }
  }
  return Array.from(modelsSet).sort();
}

export function getVersionsByModel(brand: string, model: string): VehicleRecord[] {
  const brandLower = brand.toLowerCase();
  const modelLower = model.toLowerCase();
  return vehicles.filter(
    (v) => v.brand.toLowerCase() === brandLower && v.model.toLowerCase() === modelLower
  );
}

export function searchVehicles(query: string, limit = 15): VehicleRecord[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return vehicles
    .filter(
      (v) =>
        v.brand.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        (v.version && v.version.toLowerCase().includes(q))
    )
    .slice(0, limit);
}

export function getVehicleById(id: string): VehicleRecord | undefined {
  return vehicles.find((v) => v.id === id);
}

export function getEcoCandidates(): VehicleRecord[] {
  return vehicles.filter((v) => v.dgtBadge === 'ECO' || v.dgtBadge === 'CERO');
}
