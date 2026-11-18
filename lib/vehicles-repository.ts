import vehiclesJson from '../data/reference-vehicles.json' with { type: 'json' };
import type { VehicleRecord } from './zbe-engine.ts';

const vehicles: VehicleRecord[] = vehiclesJson as unknown as VehicleRecord[];

export function getAllReferenceVehicles(): VehicleRecord[] {
  return vehicles;
}

export function getVehicleById(id: string): VehicleRecord | undefined {
  return vehicles.find((v) => v.id === id);
}

export function getEcoCandidates(): VehicleRecord[] {
  return vehicles.filter((v) => v.dgtBadge === 'ECO' || v.dgtBadge === 'CERO');
}
