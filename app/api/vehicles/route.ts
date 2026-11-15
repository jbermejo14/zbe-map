import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const brand = searchParams.get('brand');
    const model = searchParams.get('model');
    const query = searchParams.get('search');

    // 1. Búsqueda rápida de marcas
    if (action === 'brands') {
      const vehicles = await prisma.vehicle.findMany({
        select: { brand: true },
        distinct: ['brand'],
        orderBy: { brand: 'asc' },
      });
      return NextResponse.json({ brands: vehicles.map((v) => v.brand) });
    }

    // 2. Modelos para una marca dada
    if (action === 'models' && brand) {
      const vehicles = await prisma.vehicle.findMany({
        where: { brand: { equals: brand } },
        select: { model: true },
        distinct: ['model'],
        orderBy: { model: 'asc' },
      });
      return NextResponse.json({ models: vehicles.map((v) => v.model) });
    }

    // 3. Versiones para marca y modelo dados
    if (action === 'versions' && brand && model) {
      const vehicles = await prisma.vehicle.findMany({
        where: {
          brand: { equals: brand },
          model: { equals: model },
        },
        orderBy: [{ year: 'desc' }, { powerCv: 'desc' }],
      });
      return NextResponse.json({ versions: vehicles });
    }

    // 4. Búsqueda libre por texto
    if (query && query.trim().length > 1) {
      const q = query.trim();
      const results = await prisma.vehicle.findMany({
        where: {
          OR: [
            { brand: { contains: q } },
            { model: { contains: q } },
            { version: { contains: q } },
          ],
        },
        take: 15,
        orderBy: { year: 'desc' },
      });
      return NextResponse.json({ results });
    }

    // Listado general de los más populares
    const popularVehicles = await prisma.vehicle.findMany({
      take: 20,
      orderBy: { year: 'desc' },
    });

    return NextResponse.json({ vehicles: popularVehicles });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json({ error: 'Error al consultar vehículos' }, { status: 500 });
  }
}
