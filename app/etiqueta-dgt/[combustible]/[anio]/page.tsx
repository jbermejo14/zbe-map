import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getOfficialDgtBadge, normalizeFuel, FuelCategory, DGT_LEGAL_SOURCE } from '@/lib/dgt-rules';
import { evaluateAllCities } from '@/lib/cities-repository';
import { DgtSticker } from '@/lib/dgt-svg-badges';
import { DgtBadgeType } from '@/lib/zbe-engine';
import {
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  BookOpen,
  ArrowRight,
  HelpCircle,
  Car,
  Fuel,
  Calendar,
  MapPin,
} from 'lucide-react';

interface Props {
  params: Promise<{
    combustible: string;
    anio: string;
  }>;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://radar-zbe.es';

const VALID_FUELS: Record<string, { category: FuelCategory; label: string; desc: string }> = {
  gasolina: { category: 'gasolina', label: 'Gasolina', desc: 'Turismos de gasolina' },
  diesel: { category: 'diesel', label: 'Diésel', desc: 'Turismos diésel' },
  hibrido: { category: 'hibrido', label: 'Híbrido (HEV/MHEV)', desc: 'Híbridos no enchufables y microhíbridos' },
  'hibrido-enchufable': {
    category: 'hibrido-enchufable',
    label: 'Híbrido Enchufable (PHEV)',
    desc: 'Híbridos enchufables con autonomía eléctrica',
  },
  electrico: { category: 'electrico', label: 'Eléctrico (BEV)', desc: 'Vehículos 100% eléctricos y de hidrógeno' },
  'glp-gnc': { category: 'glp-gnc', label: 'Gas (GLP / GNC)', desc: 'Vehículos propulsados por autogás GLP o GNC' },
};

const BADGE_TO_SLUG: Record<DgtBadgeType, string> = {
  CERO: 'cero',
  ECO: 'eco',
  C: 'c',
  B: 'b',
  SIN_ETIQUETA: 'sin-etiqueta',
};

export async function generateStaticParams() {
  const fuels = Object.keys(VALID_FUELS);
  // Años frontera y representativos entre 1998 y 2026
  const years = [
    1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011,
    2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026,
  ];

  const params: { combustible: string; anio: string }[] = [];
  for (const combustible of fuels) {
    for (const anio of years) {
      params.push({
        combustible,
        anio: String(anio),
      });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { combustible, anio } = await params;
  const fuelInfo = VALID_FUELS[combustible.toLowerCase()];
  const yearNumber = parseInt(anio, 10);

  if (!fuelInfo || isNaN(yearNumber) || yearNumber < 1980 || yearNumber > 2026) {
    return {
      title: 'Página no encontrada | Radar ZBE',
    };
  }

  const dgtEval = getOfficialDgtBadge({ fuel: fuelInfo.category, year: yearNumber });
  const title = `Etiqueta DGT de un coche ${fuelInfo.label} de ${yearNumber}: ¿Qué distintivo le corresponde?`;
  const description = `Descubre qué distintivo ambiental DGT le corresponde a un vehículo ${fuelInfo.label} matriculado en ${yearNumber} (${dgtEval.badgeName}). Consulta en qué ZBE puede entrar sin multa.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/etiqueta-dgt/${combustible}/${yearNumber}`,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/etiqueta-dgt/${combustible}/${yearNumber}`,
      type: 'article',
    },
  };
}

export default async function FuelYearDgtPage({ params }: Props) {
  const { combustible, anio } = await params;
  const fuelKey = combustible.toLowerCase();
  const fuelInfo = VALID_FUELS[fuelKey];
  const yearNumber = parseInt(anio, 10);

  if (!fuelInfo || isNaN(yearNumber) || yearNumber < 1980 || yearNumber > 2026) {
    notFound();
  }

  const dgtEval = getOfficialDgtBadge({ fuel: fuelInfo.category, year: yearNumber });
  const badgeKey = dgtEval.badge as DgtBadgeType;
  const badgeSlug = BADGE_TO_SLUG[badgeKey];

  // Evaluar las 152 ciudades con este distintivo
  const evaluatedCities = evaluateAllCities(badgeKey);
  const allowedCities = evaluatedCities.filter((c) => c.status === 'allowed');
  const restrictedCities = evaluatedCities.filter((c) => c.status === 'restricted');
  const bannedCities = evaluatedCities.filter((c) => c.status === 'banned');

  const faqs = [
    {
      question: `¿Qué etiqueta DGT tiene un coche ${fuelInfo.label} de ${yearNumber}?`,
      answer: `A un coche ${fuelInfo.label} matriculado en ${yearNumber} le corresponde la ${dgtEval.badgeName} (${dgtEval.euroStandard}), según la resolución oficial de la DGT publicada en el BOE.`,
    },
    {
      question: `¿Puede entrar este vehículo en las Zonas de Bajas Emisiones (ZBE)?`,
      answer: `Con ${dgtEval.badgeName}, el vehículo tiene libre acceso en ${allowedCities.length} ciudades, acceso condicionado a parking o tramos en ${restrictedCities.length} ciudades, y prohibición en ${bannedCities.length} municipios (como Madrid o Barcelona en días laborales).`,
    },
    {
      question: `¿Dónde puedo consultar el distintivo exacto de mi matrícula?`,
      answer: `Esta clasificación es la norma general oficial de la DGT. Para confirmar el dato exacto de tu bastidor, puedes consultarlo gratuitamente en la Sede Electrónica de la DGT o la app miDGT.`,
    },
  ];

  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Inicio',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Distintivo DGT',
        item: `${siteUrl}/#buscador`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${fuelInfo.label} ${yearNumber}`,
        item: `${siteUrl}/etiqueta-dgt/${fuelKey}/${yearNumber}`,
      },
    ],
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-neutral-400 mb-6 flex-wrap">
        <Link href="/" className="hover:text-orange-400 transition-colors">
          Inicio
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-neutral-500">Distintivo Ambiental DGT</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-neutral-300">{fuelInfo.label}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-orange-400 font-semibold">{yearNumber}</span>
      </nav>

      {/* Hero Badge Box */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-neutral-800">
          <div className="flex items-center gap-5">
            <DgtSticker badge={badgeKey} size={80} className="flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="rounded-full bg-neutral-800 border border-neutral-700 px-2.5 py-0.5 text-xs font-semibold text-neutral-300 flex items-center gap-1">
                  <Fuel className="h-3 w-3 text-orange-400" />
                  {fuelInfo.label}
                </span>
                <span className="rounded-full bg-neutral-800 border border-neutral-700 px-2.5 py-0.5 text-xs font-semibold text-neutral-300 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-orange-400" />
                  Año {yearNumber}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Etiqueta DGT de un coche {fuelInfo.label.toLowerCase()} de {yearNumber}
              </h1>
              <p className="text-sm font-bold text-orange-400 mt-1">
                Le corresponde: {dgtEval.badgeName} ({dgtEval.euroStandard})
              </p>
            </div>
          </div>
        </div>

        {/* Explicación Técnica */}
        <div className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
            Criterio de clasificación oficial DGT
          </h2>
          <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 text-neutral-200 text-sm leading-relaxed">
            {dgtEval.description}
          </div>
        </div>

        {/* Cita de Fuente Legal */}
        <div className="mt-6 pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-orange-400 flex-shrink-0" />
            <span>
              Norma:{' '}
              <a
                href={dgtEval.legalSourceUrl}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="text-neutral-200 hover:text-white underline font-medium"
              >
                {dgtEval.legalSource}
              </a>
            </span>
          </div>
          <a
            href={DGT_LEGAL_SOURCE.dgtPortalUrl}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="text-orange-400 hover:text-orange-300 underline font-semibold inline-flex items-center gap-1"
          >
            Consulta oficial en Sede DGT
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Resumen de Acceso a Zonas de Bajas Emisiones en España */}
      <div className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 sm:p-8">
        <h2 className="text-lg font-bold text-white tracking-tight mb-2 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-orange-500" />
          ¿Dónde puede entrar un {fuelInfo.label.toLowerCase()} de {yearNumber} en España?
        </h2>
        <p className="text-xs text-neutral-400 mb-6">
          Evaluación de las 152 ciudades españolas obligadas por la Ley de Cambio Climático a implantar ZBE con distintivo {dgtEval.badgeName}.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/30 p-4 text-center">
            <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              <CheckCircle2 className="h-4 w-4" />
              Acceso Libre
            </span>
            <span className="text-3xl font-black text-white mt-1 block">{allowedCities.length}</span>
            <span className="text-[11px] text-neutral-400">ciudades</span>
          </div>

          <div className="rounded-xl bg-amber-950/20 border border-amber-500/30 p-4 text-center">
            <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4" />
              Acceso Restringido / Parking
            </span>
            <span className="text-3xl font-black text-white mt-1 block">{restrictedCities.length}</span>
            <span className="text-[11px] text-neutral-400">ciudades</span>
          </div>

          <div className="rounded-xl bg-red-950/20 border border-red-500/30 p-4 text-center">
            <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-red-400 uppercase tracking-wider">
              <XCircle className="h-4 w-4" />
              Acceso Prohibido
            </span>
            <span className="text-3xl font-black text-white mt-1 block">{bannedCities.length}</span>
            <span className="text-[11px] text-neutral-400">ciudades</span>
          </div>
        </div>

        {/* Desglose de ciudades principales con enlace */}
        <div className="space-y-6">
          {bannedCities.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-3 flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5" />
                Ciudades donde tiene prohibida la entrada ({bannedCities.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {bannedCities.slice(0, 16).map((c) => (
                  <Link
                    key={c.slug}
                    href={`/zbe/${c.slug}/${badgeSlug}`}
                    className="p-2.5 rounded-lg border border-red-950 bg-red-950/10 hover:border-red-500/40 text-xs text-neutral-300 flex items-center justify-between"
                  >
                    <span className="truncate">{c.cityName}</span>
                    <ArrowRight className="h-3 w-3 text-red-400 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {restrictedCities.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Ciudades con restricciones o parking obligatorio ({restrictedCities.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {restrictedCities.slice(0, 16).map((c) => (
                  <Link
                    key={c.slug}
                    href={`/zbe/${c.slug}/${badgeSlug}`}
                    className="p-2.5 rounded-lg border border-amber-950 bg-amber-950/10 hover:border-amber-500/40 text-xs text-neutral-300 flex items-center justify-between"
                  >
                    <span className="truncate">{c.cityName}</span>
                    <ArrowRight className="h-3 w-3 text-amber-400 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {allowedCities.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Principales ciudades con acceso permitido ({allowedCities.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {allowedCities.slice(0, 16).map((c) => (
                  <Link
                    key={c.slug}
                    href={`/zbe/${c.slug}/${badgeSlug}`}
                    className="p-2.5 rounded-lg border border-emerald-950 bg-emerald-950/10 hover:border-emerald-500/40 text-xs text-neutral-300 flex items-center justify-between"
                  >
                    <span className="truncate">{c.cityName}</span>
                    <ArrowRight className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preguntas Frecuentes Visibles */}
      <div className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-300 mb-4 flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-orange-400" />
          Preguntas frecuentes sobre coches {fuelInfo.label.toLowerCase()} de {yearNumber}
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border-b border-neutral-800 pb-3 last:border-b-0 last:pb-0">
              <h3 className="text-xs font-bold text-white mb-1">{faq.question}</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Navegación Interna entre Años y Combustibles */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
          Otros años para coches {fuelInfo.label.toLowerCase()}
        </h2>
        <div className="flex flex-wrap gap-1.5 mb-6">
          {[
            yearNumber - 3,
            yearNumber - 2,
            yearNumber - 1,
            yearNumber + 1,
            yearNumber + 2,
            yearNumber + 3,
          ]
            .filter((y) => y >= 1990 && y <= 2026)
            .map((y) => (
              <Link
                key={y}
                href={`/etiqueta-dgt/${fuelKey}/${y}`}
                className="px-3 py-1 rounded bg-neutral-950 border border-neutral-800 hover:border-orange-500 text-xs text-neutral-300 hover:text-white"
              >
                Año {y}
              </Link>
            ))}
        </div>

        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
          Otros combustibles del año {yearNumber}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(VALID_FUELS)
            .filter(([k]) => k !== fuelKey)
            .map(([k, info]) => (
              <Link
                key={k}
                href={`/etiqueta-dgt/${k}/${yearNumber}`}
                className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-950/60 hover:border-orange-500/50 text-xs text-neutral-300 flex items-center justify-between"
              >
                <span>{info.label} ({yearNumber})</span>
                <ArrowRight className="h-3 w-3 text-orange-400" />
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
