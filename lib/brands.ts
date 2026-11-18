import brandsJson from '../data/brands.json' with { type: 'json' };

/** Última opción de la lista de marcas, para vehículos que no aparecen en ella. */
export const OTHER_BRAND = 'Otra marca';

const brandsFile = brandsJson as unknown as { fuente: string; marcas: string[] };

/** Marcas para el selector, en orden alfabético y con "Otra marca" al final. */
export function getVehicleBrands(): string[] {
  return brandsFile.marcas;
}
