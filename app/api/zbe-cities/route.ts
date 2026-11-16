import { NextRequest, NextResponse } from 'next/server';
import { evaluateAllCities } from '@/lib/cities-repository';
import { DgtBadgeType } from '@/lib/zbe-engine';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const badgeParam = (searchParams.get('badge') || 'B').toUpperCase() as DgtBadgeType;
    const validBadges: DgtBadgeType[] = ['CERO', 'ECO', 'C', 'B', 'SIN_ETIQUETA'];
    const badge = validBadges.includes(badgeParam) ? badgeParam : 'B';

    // Evaluar todas las ciudades a partir del repositorio estático versionado
    const evaluatedCities = evaluateAllCities(badge);

    const summary = {
      badge,
      totalCities: evaluatedCities.length,
      allowedCount: evaluatedCities.filter((c) => c.status === 'allowed').length,
      restrictedCount: evaluatedCities.filter((c) => c.status === 'restricted').length,
      bannedCount: evaluatedCities.filter((c) => c.status === 'banned').length,
    };

    return NextResponse.json({
      summary,
      cities: evaluatedCities,
    });
  } catch (error) {
    console.error('Error fetching ZBE cities:', error);
    return NextResponse.json({ error: 'Error al consultar ciudades ZBE' }, { status: 500 });
  }
}
