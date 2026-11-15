import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { SplitDashboard } from '@/components/SplitDashboard';
import { DgtBadgeType, evaluateCitiesForBadge, getBadgeMetadata } from '@/lib/zbe-engine';
import { DgtSticker } from '@/lib/dgt-svg-badges';
import {
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface Props {
  params: Promise<{
    marca: string;
    modelo: string;
  }>;
}

export async function generateStaticParams() {
  const vehicles = await prisma.vehicle.findMany({
    select: { brand: true, model: true },
    distinct: ['brand', 'model'],
  });

  return vehicles.map((v) => ({
    marca: v.brand.toLowerCase(),
    modelo: v.model.toLowerCase().replace(/\s+/g, '-'),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { marca, modelo } = await params;
  const brandNorm = marca.charAt(0).toUpperCase() + marca.slice(1);
  const modelNorm = modelo.replace(/-/g, ' ');

  const title = `Etiqueta DGT ${brandNorm} ${modelNorm} | ¿Qué distintivo tiene y dónde puede circular?`;
  const description = `Consulta qué etiqueta DGT corresponde al ${brandNorm} ${modelNorm} según motor y año. Revisa en qué ciudades ZBE de España puede entrar libremente o tiene restricciones.`;

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

export default async function VehicleBadgeSeoPage({ params }: Props) {
  const { marca, modelo } = await params;
  const modelSearch = modelo.replace(/-/g, ' ');

  // Buscar versiones de este modelo en la BD
  const [vehicles, rawCities] = await Promise.all([
    prisma.vehicle.findMany({
      where: {
        brand: { equals: marca },
        model: { contains: modelSearch },
      },
      orderBy: [{ year: 'desc' }, { powerCv: 'desc' }],
    }),
    prisma.zbeCity.findMany({
      include: { rules: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!vehicles || vehicles.length === 0) {
    notFound();
  }

  const primaryCar = vehicles[0];
  const primaryBadge = primaryCar.dgtBadge as DgtBadgeType;
  const evaluatedCities = evaluateCitiesForBadge(primaryBadge, rawCities);
  const brandName = primaryCar.brand;
  const modelName = primaryCar.model;

  // FAQ Schema JSON-LD
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `¿Qué etiqueta de la DGT tiene el ${brandName} ${modelName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `El distintivo ambiental del ${brandName} ${modelName} depende del año de matriculación y el combustible. Por ejemplo, la versión ${primaryCar.version} (${primaryCar.year}) homologa etiqueta ${primaryBadge}.`,
        },
      },
      {
        '@type': 'Question',
        name: `¿Puede circular el ${brandName} ${modelName} en Madrid Distrito Centro?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            primaryBadge === 'CERO' || primaryBadge === 'ECO'
              ? `Sí, los vehículos con etiqueta ${primaryBadge} pueden circular libremente por todo Madrid y Distrito Centro.`
              : primaryBadge === 'C' || primaryBadge === 'B'
              ? `Los vehículos con etiqueta ${primaryBadge} pueden entrar al Distrito Centro de Madrid únicamente si estacionan en un parking subterráneo público o privado.`
              : `No, los vehículos sin distintivo ambiental (categoría A) tienen prohibido circular en todo el término municipal de Madrid.`,
        },
      },
      {
        '@type': 'Question',
        name: `¿Cuál es la multa por entrar a una ZBE sin la etiqueta correspondiente?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `La sanción tipificada por el artículo 76.z3 de la Ley sobre Tráfico y Seguridad Vial es de 200 € (reducida a 100 € por pronto pago).`,
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
        <span className="text-slate-500">Etiqueta DGT</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-300">{brandName}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-emerald-400 font-semibold">{modelName}</span>
      </nav>

      {/* Hero Head */}
      <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <DgtSticker badge={primaryBadge} size={130} className="flex-shrink-0 drop-shadow-xl" />
          <div className="text-center sm:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400 mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              Guía Oficial de Distintivo Ambiental
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              ¿Qué etiqueta DGT tiene el {brandName} {modelName}?
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Consulta a continuación el distintivo ambiental oficial de la DGT para cada motorización del {brandName} {modelName},
              y comprueba en el mapa interactivo en qué Zonas de Bajas Emisiones (ZBE) de España puede circular sin multas.
            </p>
          </div>
        </div>

        {/* Tabla comparativa de versiones del modelo */}
        <div className="mt-8 overflow-x-auto">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Motorizaciones Registradas en la DGT ({vehicles.length})
          </h3>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold">
                <th className="py-2.5 px-3">Año</th>
                <th className="py-2.5 px-3">Versión / Motor</th>
                <th className="py-2.5 px-3">Combustible</th>
                <th className="py-2.5 px-3">Norma Euro</th>
                <th className="py-2.5 px-3">Potencia</th>
                <th className="py-2.5 px-3 text-right">Etiqueta DGT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-white">{v.year}</td>
                  <td className="py-2.5 px-3 font-medium">{v.version}</td>
                  <td className="py-2.5 px-3 text-slate-400">{v.propulsionCode}</td>
                  <td className="py-2.5 px-3 text-slate-400">{v.euroNorm}</td>
                  <td className="py-2.5 px-3">{v.powerCv} CV ({v.powerKw} kW)</td>
                  <td className="py-2.5 px-3 text-right">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[11px] border ${
                        v.dgtBadge === 'CERO'
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/40'
                          : v.dgtBadge === 'ECO'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40'
                          : v.dgtBadge === 'C'
                          ? 'bg-emerald-600/10 text-emerald-300 border-emerald-600/40'
                          : v.dgtBadge === 'B'
                          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/40'
                          : 'bg-red-500/10 text-red-400 border-red-500/40'
                      }`}
                    >
                      {v.dgtBadge}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Map Preloaded for this Vehicle */}
      <SplitDashboard
        initialVehicle={primaryCar}
        initialBadge={primaryBadge}
        initialCities={evaluatedCities}
      />
    </div>
  );
}
