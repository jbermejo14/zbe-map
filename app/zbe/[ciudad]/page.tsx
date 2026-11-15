import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { SplitDashboard } from '@/components/SplitDashboard';
import { evaluateCitiesForBadge, DgtBadgeType, getBadgeMetadata } from '@/lib/zbe-engine';
import { DgtSticker } from '@/lib/dgt-svg-badges';
import {
  ChevronRight,
  MapPin,
  Clock,
  AlertOctagon,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ParkingCircle,
  FileText,
  Sparkles,
} from 'lucide-react';

interface Props {
  params: Promise<{
    ciudad: string;
  }>;
}

export async function generateStaticParams() {
  const cities = await prisma.zbeCity.findMany({
    select: { slug: true },
  });

  return cities.map((c) => ({
    ciudad: c.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ciudad } = await params;
  const city = await prisma.zbeCity.findUnique({
    where: { slug: ciudad },
  });

  if (!city) {
    return {
      title: 'ZBE Ciudad no encontrada | Radar ZBE',
    };
  }

  const title = `ZBE ${city.name} 2025: Mapa, Horarios, Multas 200€ y Coches Permitidos`;
  const description = `Guía completa de la Zona de Bajas Emisiones en ${city.name} (${city.province}). Consulta mapa interactivo, horario (${city.schedule}), excepciones y qué etiquetas DGT pueden entrar sin multa.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
    },
  };
}

export default async function CityZbeSeoPage({ params }: Props) {
  const { ciudad } = await params;

  const [city, allCities, sampleCar] = await Promise.all([
    prisma.zbeCity.findUnique({
      where: { slug: ciudad },
      include: { rules: true },
    }),
    prisma.zbeCity.findMany({
      include: { rules: true },
      orderBy: { name: 'asc' },
    }),
    prisma.vehicle.findFirst({
      where: { brand: 'Toyota', model: 'Corolla' },
    }),
  ]);

  if (!city) {
    notFound();
  }

  let exemptionsList: string[] = [];
  try {
    exemptionsList = JSON.parse(city.exemptions);
  } catch {
    exemptionsList = [city.exemptions];
  }

  const badgesOrder: DgtBadgeType[] = ['CERO', 'ECO', 'C', 'B', 'SIN_ETIQUETA'];

  // JSON-LD Schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'GovernmentService',
    name: `Zona de Bajas Emisiones (ZBE) de ${city.name}`,
    serviceType: 'Regulación de Tráfico y Calidad del Aire',
    provider: {
      '@type': 'GovernmentOrganization',
      name: `Ayuntamiento de ${city.name}`,
    },
    areaServed: {
      '@type': 'AdministrativeArea',
      name: city.name,
    },
    description: city.summary,
  };

  const initialBadge = (sampleCar?.dgtBadge as DgtBadgeType) || 'B';
  const initialEvaluatedCities = evaluateCitiesForBadge(initialBadge, allCities);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 mb-6">
        <Link href="/" className="hover:text-emerald-400 transition-colors">
          Inicio
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-500">Zonas de Bajas Emisiones</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-300">{city.province}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-emerald-400 font-semibold">{city.name}</span>
      </nav>

      {/* Hero Header */}
      <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300">
                {city.province} · {city.region}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                ZBE Activa 2025
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight flex items-center gap-3">
              <MapPin className="h-8 w-8 text-emerald-400" />
              ZBE {city.name}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {city.summary}
            </p>
          </div>

          {/* Multa y Horario Box */}
          <div className="grid grid-cols-2 gap-3 flex-shrink-0">
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 text-center">
              <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-red-400 uppercase tracking-wider">
                <AlertOctagon className="h-3.5 w-3.5" />
                Sanción
              </span>
              <span className="text-2xl font-black text-white mt-1 block">{city.fineAmount} €</span>
              <span className="text-[10px] text-slate-400">100 € pronto pago</span>
            </div>

            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 text-center">
              <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5" />
                Horario
              </span>
              <span className="text-xs font-bold text-slate-200 mt-2 block line-clamp-2">
                {city.schedule}
              </span>
            </div>
          </div>
        </div>

        {/* Matriz Completa de Reglas por Etiqueta DGT en esta ciudad */}
        <div className="mt-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            Normativa de Acceso según Etiqueta DGT en {city.name}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {badgesOrder.map((badgeKey) => {
              const rule = city.rules.find((r) => r.dgtBadge === badgeKey);
              const status = rule?.accessStatus || 'allowed';
              const reason = rule?.reason || 'Sin restricciones reportadas.';

              return (
                <div
                  key={badgeKey}
                  className={`rounded-2xl p-4 border flex flex-col justify-between ${
                    status === 'allowed'
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : status === 'restricted'
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-red-950/20 border-red-500/30'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <DgtSticker badge={badgeKey} size={50} />
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                          status === 'allowed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : status === 'restricted'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}
                      >
                        {status === 'allowed' ? 'Permitido' : status === 'restricted' ? 'Restringido' : 'Prohibido'}
                      </span>
                    </div>

                    <h4 className="text-xs font-black text-white">
                      {badgeKey === 'CERO'
                        ? '0 Emisiones'
                        : badgeKey === 'SIN_ETIQUETA'
                        ? 'Sin Etiqueta (A)'
                        : `Etiqueta ${badgeKey}`}
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">{reason}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Excepciones tasadas */}
        {exemptionsList.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Excepciones Oficiales y Vehículos Autorizados en {city.name}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {exemptionsList.map((ex, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400 mt-1 flex-shrink-0" />
                  <span>{ex}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Buscador Interactivo y Mapa Integrado */}
      <div className="mt-8">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Comprobador Interactivo para {city.name}
          </h2>
          <p className="text-xs text-slate-400">
            Elige tu vehículo para ver cómo afecta la ordenanza de {city.name} y el resto de ciudades españolas
          </p>
        </div>

        <SplitDashboard
          initialVehicle={sampleCar}
          initialBadge={initialBadge}
          initialCities={initialEvaluatedCities}
        />
      </div>
    </div>
  );
}
