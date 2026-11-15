import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { SplitDashboard } from '@/components/SplitDashboard';
import { VehicleBadgeCard } from './../../../components/VehicleBadgeCard';
import { DgtSticker } from '@/lib/dgt-svg-badges';
import {
  DgtBadgeType,
  evaluateCitiesForBadge,
  getAccessStatusPresentation,
} from '@/lib/zbe-engine';
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
  Car,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  // Generar combinaciones populares para SEO
  const popularSlugs = [
    'audi-a4-2-0-tdi-en-madrid',
    'audi-a4-2-0-tdi-en-barcelona',
    'seat-ibiza-en-madrid',
    'seat-ibiza-en-barcelona',
    'volkswagen-golf-en-madrid',
    'volkswagen-golf-en-valencia',
    'toyota-corolla-en-madrid',
    'toyota-corolla-en-sevilla',
    'renault-clio-en-bilbao',
    'peugeot-208-en-barcelona',
  ];

  return popularSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const parts = slug.split('-en-');
  const carSlugPart = parts[0] || slug;
  const citySlugPart = parts[1] || 'madrid';

  const title = `¿Puede entrar el ${carSlugPart.replace(/-/g, ' ').toUpperCase()} en ${citySlugPart.toUpperCase()} ZBE? [Veredicto Oficial 2025]`;
  const description = `Consulta si el ${carSlugPart.replace(/-/g, ' ')} puede entrar a la Zona de Bajas Emisiones de ${citySlugPart}. Normativa oficial DGT, horarios, parkings obligatorios y multas de 200 euros.`;

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

export default async function ExactVerdictSeoPage({ params }: Props) {
  const { slug } = await params;
  const parts = slug.split('-en-');
  const carSlugPart = parts[0];
  const citySlugPart = parts[1] || 'madrid';

  // Buscar ciudad
  const city = await prisma.zbeCity.findFirst({
    where: {
      OR: [
        { slug: citySlugPart },
        { id: citySlugPart },
        { name: { contains: citySlugPart } },
      ],
    },
    include: { rules: true },
  });

  if (!city) {
    notFound();
  }

  // Buscar vehículo por slug o por coincidencia
  let vehicle = await prisma.vehicle.findFirst({
    where: {
      OR: [
        { slug: { contains: carSlugPart } },
        { model: { contains: carSlugPart.split('-')[1] || carSlugPart } },
      ],
    },
  });

  // Si no se encuentra coche exacto, buscar por la marca inicial
  if (!vehicle) {
    const brandGuess = carSlugPart.split('-')[0];
    vehicle = await prisma.vehicle.findFirst({
      where: { brand: { contains: brandGuess } },
    });
  }

  if (!vehicle) {
    notFound();
  }

  const badge = vehicle.dgtBadge as DgtBadgeType;
  const rule = city.rules.find((r) => r.dgtBadge === badge);
  const status = rule?.accessStatus || 'allowed';
  const reason = rule?.reason || 'Sin restricciones reportadas.';
  const pres = getAccessStatusPresentation(status as any);

  const [allCities] = await Promise.all([
    prisma.zbeCity.findMany({
      include: { rules: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const evaluatedCities = evaluateCitiesForBadge(badge, allCities);

  // FAQ Schema JSON-LD para Rich Snippets en Google
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `¿Puede entrar el ${vehicle.brand} ${vehicle.model} a la ZBE de ${city.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            status === 'allowed'
              ? `Sí, el ${vehicle.brand} ${vehicle.model} (Etiqueta ${badge}) tiene el acceso y circulación totalmente permitidos en la ZBE de ${city.name}.`
              : status === 'restricted'
              ? `El ${vehicle.brand} ${vehicle.model} (Etiqueta ${badge}) tiene acceso condicionado en ${city.name}: ${reason}`
              : `No, el ${vehicle.brand} ${vehicle.model} (Etiqueta ${badge}) tiene prohibido el acceso a la ZBE de ${city.name}. Sanción: ${city.fineAmount} €.`,
        },
      },
      {
        '@type': 'Question',
        name: `¿Cuál es el horario de la ZBE de ${city.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `El horario de restricción activo en ${city.name} es: ${city.schedule}.`,
        },
      },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 mb-6">
        <Link href="/" className="hover:text-emerald-400 transition-colors">
          Inicio
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-500">¿Puede entrar?</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-300">
          {vehicle.brand} {vehicle.model}
        </span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-emerald-400 font-semibold">{city.name}</span>
      </nav>

      {/* VEREDICTO INSTANTÁNEO HERO (HIGH CONVERSION) */}
      <div
        className={`mb-8 rounded-3xl p-6 sm:p-10 border shadow-2xl relative overflow-hidden ${
          status === 'allowed'
            ? 'bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border-emerald-500/40'
            : status === 'restricted'
            ? 'bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-950 border-amber-500/40'
            : 'bg-gradient-to-br from-red-950/60 via-slate-900 to-slate-950 border-red-500/40'
        }`}
      >
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          <div className="text-center md:text-left flex-1">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider mb-4 border bg-slate-950/80 text-white">
              <MapPin className="h-3.5 w-3.5 text-emerald-400" />
              <span>
                Veredicto Oficial ZBE · {city.name} ({city.province})
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              ¿Puede entrar el{' '}
              <span className="text-emerald-400">
                {vehicle.brand} {vehicle.model}
              </span>{' '}
              en {city.name}?
            </h1>

            {/* Banner de veredicto grande */}
            <div className="mt-5 inline-flex items-center gap-3 px-5 py-3 rounded-2xl border text-base sm:text-xl font-black uppercase tracking-wide shadow-xl bg-slate-950/80">
              {status === 'allowed' && (
                <>
                  <CheckCircle2 className="h-7 w-7 text-emerald-400 flex-shrink-0" />
                  <span className="text-emerald-400">SÍ · ACCESO LIBRE PERMITIDO</span>
                </>
              )}
              {status === 'restricted' && (
                <>
                  <AlertTriangle className="h-7 w-7 text-amber-400 flex-shrink-0" />
                  <span className="text-amber-400">ACCESO CONDICIONADO A PARKING</span>
                </>
              )}
              {status === 'banned' && (
                <>
                  <XCircle className="h-7 w-7 text-red-500 flex-shrink-0" />
                  <span className="text-red-400">NO · ACCESO TOTALMENTE PROHIBIDO</span>
                </>
              )}
            </div>

            <p className="mt-4 text-sm sm:text-base text-slate-200 leading-relaxed max-w-2xl font-medium">
              {reason}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-sky-400" />
                Horario: <strong className="text-white">{city.schedule}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <AlertOctagon className="h-4 w-4 text-red-400" />
                Multa: <strong className="text-white">{city.fineAmount} €</strong> (100 € pronto pago)
              </span>
            </div>
          </div>

          {/* Pegatina Oficial DGT */}
          <div className="flex flex-col items-center flex-shrink-0">
            <DgtSticker badge={badge} size={150} className="drop-shadow-2xl hover:scale-105 transition-transform" />
            <span className="text-xs font-bold text-slate-300 mt-2 uppercase tracking-wider">
              {vehicle.version}
            </span>
          </div>
        </div>
      </div>

      {/* Tarjeta Técnica del Coche */}
      <div className="mb-8">
        <VehicleBadgeCard vehicle={vehicle as any} explanation={reason} />
      </div>

      {/* Mapa precargado para este coche y ciudad */}
      <div className="mt-8">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white tracking-tight">
            Mapa Interactivo de España para tu {vehicle.brand} {vehicle.model}
          </h3>
          <p className="text-xs text-slate-400">
            Comprueba en qué otras 38 ciudades de España puedes entrar con este coche
          </p>
        </div>

        <SplitDashboard
          initialVehicle={vehicle}
          initialBadge={badge}
          initialCities={evaluatedCities}
        />
      </div>
    </div>
  );
}
