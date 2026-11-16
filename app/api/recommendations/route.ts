import { NextRequest, NextResponse } from 'next/server';
import { findEquivalentEcoCars, VehicleRecord } from '@/lib/zbe-engine';
import { getVehicleById, getEcoCandidates } from '@/lib/vehicles-repository';

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
      const v = getVehicleById(vehicleId);
      if (v) {
        target = {
          id: v.id,
          bodyType: v.bodyType,
          wheelbaseMm: v.wheelbaseMm,
          powerKw: v.powerKw,
        };
      }
    }

    // Obtener candidatos ECO / CERO del repositorio en memoria
    const candidates = getEcoCandidates();
    const recommendations = findEquivalentEcoCars(target, candidates);

    // Parámetros de afiliación configurables mediante variables de entorno (sin inventar tags)
    const clicarsTag = process.env.AFFILIATE_CLICARS_TAG;
    const rentingTag = process.env.AFFILIATE_RENTING_TAG;
    const tasacionTag = process.env.AFFILIATE_TASACION_TAG;

    const enriched = recommendations.map((rec) => {
      const query = encodeURIComponent(`${rec.brand} ${rec.model}`);

      // Construcción de URLs limpias sin parámetros ficticios
      let segundaManoUrl = `https://www.clicars.com/coches-segunda-mano?search=${query}`;
      if (clicarsTag) {
        segundaManoUrl += `&tag=${encodeURIComponent(clicarsTag)}`;
      }

      let rentingUrl = `https://rentingfinders.com/coches/?search=${query}`;
      if (rentingTag) {
        rentingUrl += `&ref=${encodeURIComponent(rentingTag)}`;
      }

      let tasacionUrl = `https://www.compramostucoche.es/`;
      if (tasacionTag) {
        tasacionUrl += `?tag=${encodeURIComponent(tasacionTag)}`;
      }

      return {
        ...rec,
        affiliateDeals: {
          segundaMano: {
            platform: 'Clicars',
            label: `Ver ${rec.brand} ${rec.model} de segunda mano y ocasión`,
            url: segundaManoUrl,
          },
          renting: {
            platform: 'Renting Finders',
            label: `Consultar renting para particulares de ${rec.brand} ${rec.model}`,
            url: rentingUrl,
          },
          tasacion: {
            platform: 'Compramostucoche',
            label: `Tasación online de vehículo actual`,
            url: tasacionUrl,
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
