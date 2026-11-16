import { NextRequest, NextResponse } from 'next/server';
import {
  getBrands,
  getModelsByBrand,
  getVersionsByModel,
  searchVehicles,
  getAllReferenceVehicles,
} from '@/lib/vehicles-repository';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const brand = searchParams.get('brand');
    const model = searchParams.get('model');
    const query = searchParams.get('search');

    // 1. Marcas
    if (action === 'brands') {
      return NextResponse.json({ brands: getBrands() });
    }

    // 2. Modelos para una marca dada
    if (action === 'models' && brand) {
      return NextResponse.json({ models: getModelsByBrand(brand) });
    }

    // 3. Versiones para marca y modelo
    if (action === 'versions' && brand && model) {
      return NextResponse.json({ versions: getVersionsByModel(brand, model) });
    }

    // 4. Búsqueda libre
    if (query && query.trim().length > 1) {
      return NextResponse.json({ results: searchVehicles(query.trim()) });
    }

    // Listado general
    return NextResponse.json({ vehicles: getAllReferenceVehicles().slice(0, 20) });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json({ error: 'Error al consultar vehículos' }, { status: 500 });
  }
}
