import { prisma } from '@/lib/prisma';
import { SplitDashboard } from '@/components/SplitDashboard';
import { evaluateCitiesForBadge, DgtBadgeType } from '@/lib/zbe-engine';

export const revalidate = 3600;

export default async function HomePage() {
  const [initialCar, rawCities] = await Promise.all([
    prisma.vehicle.findFirst({
      where: {
        brand: 'Audi',
        model: 'A4',
        dgtBadge: 'B',
      },
    }),
    prisma.zbeCity.findMany({
      include: { rules: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const fallbackBadge: DgtBadgeType = (initialCar?.dgtBadge as DgtBadgeType) || 'B';
  const initialEvaluatedCities = evaluateCitiesForBadge(fallbackBadge, rawCities);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Radar ZBE España',
    url: 'https://radar-zbe.es',
    applicationCategory: 'TravelApplication',
    operatingSystem: 'All',
    description:
      'Buscador visual y mapa interactivo con líneas de perímetro de Zonas de Bajas Emisiones en España. Consulta las restricciones para tu vehículo según su distintivo DGT.',
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Headline - Simple Negro y Naranja */}
      <div className="text-center max-w-2xl mx-auto mb-6">
        <div className="inline-flex items-center gap-1.5 rounded bg-orange-950/30 border border-orange-500/40 px-2.5 py-0.5 text-xs font-semibold text-orange-400 mb-2.5">
          <span>Perímetros ZBE actualizados a 2025</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
          ¿Dónde puede circular tu coche?{' '}
          <span className="text-orange-500">
            Zonas ZBE España
          </span>
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-xl mx-auto">
          Selecciona tu coche o etiqueta DGT y visualiza en el mapa las líneas exactas del perímetro
          de cada Zona de Bajas Emisiones (ZBE), con horarios, condiciones de parking y multas.
        </p>
      </div>

      {/* Split Dashboard */}
      <SplitDashboard
        initialVehicle={initialCar}
        initialBadge={fallbackBadge}
        initialCities={initialEvaluatedCities}
      />
    </div>
  );
}
