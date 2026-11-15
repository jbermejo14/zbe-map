import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findEquivalentEcoCars, VehicleRecord } from '@/lib/zbe-engine';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');
    const bodyTypeParam = searchParams.get('bodyType');
    const wheelbaseParam = searchParams.get('wheelbaseMm');
    const powerKwParam = searchParams.get('powerKw');

    let target = {
      id: vehicleId || undefined,
      bodyType: bodyTypeParam || 'Compacto',
      wheelbaseMm: wheelbaseParam ? parseInt(wheelbaseParam, 10) : 2650,
      powerKw: powerKwParam ? parseFloat(powerKwParam) : 100,
    };

    if (vehicleId) {
      const v = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
      if (v) {
        target = {
          id: v.id,
          bodyType: v.bodyType,
          wheelbaseMm: v.wheelbaseMm,
          powerKw: v.powerKw,
        };
      }
    }

    // Obtener candidatos ECO / CERO de la base de datos
    const candidates = await prisma.vehicle.findMany({
      where: {
        dgtBadge: { in: ['ECO', 'CERO'] },
      },
    });

    const recommendations = findEquivalentEcoCars(target, candidates as VehicleRecord[]);

    // Generar enlaces de afiliación comerciales simulados
    const enriched = recommendations.map((rec) => {
      const slugSearch = `${rec.brand}-${rec.model}`.toLowerCase();
      return {
        ...rec,
        affiliateDeals: {
          segundaMano: {
            platform: 'Clicars / Coches.net',
            label: `Comprar ${rec.brand} ${rec.model} de ocasión garantizado`,
            url: `https://www.clicars.com/coches-segunda-mano?search=${encodeURIComponent(rec.brand + ' ' + rec.model)}&tag=afiliado_zbe`,
            priceEstimate: rec.dgtBadge === 'CERO' ? 'Desde 24.900 €' : 'Desde 18.500 €',
          },
          renting: {
            platform: 'Renting Finders / Arval',
            label: `Renting sin entrada para particulares`,
            url: `https://rentingfinders.com/coches/?search=${encodeURIComponent(rec.brand + ' ' + rec.model)}&ref=radar_zbe`,
            cuotaEstimate: rec.dgtBadge === 'CERO' ? 'Desde 379 €/mes' : 'Desde 295 €/mes',
          },
          tasacion: {
            platform: 'Compramostucoche / Auto1',
            label: `Tasación online inmediata de tu coche actual`,
            url: `https://www.compramostucoche.es/?utm_source=radar_zbe&badge=ECO`,
          },
        },
      };
    });

    return NextResponse.json({
      target,
      recommendations: enriched,
    });
  } catch (error) {
    console.error('Error in recommendations:', error);
    return NextResponse.json({ error: 'Error al generar recomendaciones' }, { status: 500 });
  }
}
