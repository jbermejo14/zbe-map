import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { absoluteUrl } from '@/lib/site';
import { getOfficialDgtBadge, normalizeFuel, FuelCategory, DGT_LEGAL_SOURCE } from '@/lib/dgt-rules';
import { evaluateAllCities } from '@/lib/cities-repository';
import { ETIQUETA_FUEL_SLUGS, ETIQUETA_YEARS } from '@/lib/etiqueta-routes';
import { AdSlot } from '@/components/AdSlot';
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

export const dynamicParams = false;

export async function generateStaticParams() {
  const params: { combustible: string; anio: string }[] = [];
  for (const combustible of ETIQUETA_FUEL_SLUGS) {
    for (const anio of ETIQUETA_YEARS) {
      params.push({
        combustible,
        anio: String(anio),
      });
    }
  }
  return params;
}

const SHORT_FUEL_LABEL: Record<string, string> = {
  gasolina: 'gasolina',
  diesel: 'diésel',
  hibrido: 'híbrido',
  'hibrido-enchufable': 'híbrido enchufable',
  electrico: 'eléctrico',
  'glp-gnc': 'Gas (GLP/GNC)',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { combustible, anio } = await params;
  const fuelInfo = VALID_FUELS[combustible.toLowerCase()];
  const yearNumber = parseInt(anio, 10);

  if (!fuelInfo || isNaN(yearNumber) || yearNumber < 1980 || yearNumber > 2026) {
    return {
      title: 'Página no encontrada',
    };
  }

  const dgtEval = getOfficialDgtBadge({ fuel: fuelInfo.category, year: yearNumber });
  const shortFuel = SHORT_FUEL_LABEL[combustible.toLowerCase()] || fuelInfo.label;
  const title = `Etiqueta DGT coche ${shortFuel} de ${yearNumber}`;
  const description = `Descubre qué distintivo ambiental DGT le corresponde a un coche ${shortFuel} de ${yearNumber} (${dgtEval.badgeName}). Consulta en qué ZBE puede entrar sin multa.`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/etiqueta-dgt/${combustible}/${yearNumber}`),
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/etiqueta-dgt/${combustible}/${yearNumber}`),
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
        item: absoluteUrl('/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Etiqueta DGT',
        item: absoluteUrl('/etiqueta-dgt'),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${fuelInfo.label} ${yearNumber}`,
        item: absoluteUrl(`/etiqueta-dgt/${fuelKey}/${yearNumber}`),
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
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted mb-6 flex-wrap">
        <Link href="/" className="hover:text-accent transition-colors">
          Inicio
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/etiqueta-dgt" className="hover:text-accent transition-colors">
          Distintivo Ambiental DGT
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-secondary">{fuelInfo.label}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-accent font-semibold">{yearNumber}</span>
      </nav>

      {/* Hero Badge Box */}
      <div className="rounded-2xl border border-line bg-elevated/60 p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-line">
          <div className="flex items-center gap-5">
            <DgtSticker badge={badgeKey} size={80} className="flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="rounded-full bg-elevated border border-line px-2.5 py-0.5 text-xs font-semibold text-secondary flex items-center gap-1">
                  <Fuel className="h-3 w-3 text-accent" />
                  {fuelInfo.label}
                </span>
                <span className="rounded-full bg-elevated border border-line px-2.5 py-0.5 text-xs font-semibold text-secondary flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-accent" />
                  Año {yearNumber}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-fg tracking-tight">
                Etiqueta DGT de un coche {fuelInfo.label.toLowerCase()} de {yearNumber}
              </h1>
              <p className="text-sm font-bold text-accent mt-1">
                Le corresponde: {dgtEval.badgeName} ({dgtEval.euroStandard})
              </p>
            </div>
          </div>
        </div>

        {/* Explicación Técnica */}
        <div className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
            Criterio de clasificación oficial DGT
          </h2>
          <div className="p-4 rounded-xl bg-surface/80 border border-line text-secondary text-sm leading-relaxed">
            {dgtEval.description}
          </div>
        </div>

        {/* Cita de Fuente Legal */}
        <div className="mt-6 pt-4 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-accent flex-shrink-0" />
            <span>
              Norma:{' '}
              <a
                href={dgtEval.legalSourceUrl}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="text-secondary hover:text-fg underline font-medium"
              >
                {dgtEval.legalSource}
              </a>
            </span>
          </div>
          <a
            href={DGT_LEGAL_SOURCE.dgtPortalUrl}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="text-accent hover:text-accent-hover underline font-semibold inline-flex items-center gap-1"
          >
            Consulta oficial en Sede DGT
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <AdSlot />

      {/* Resumen de Acceso a Zonas de Bajas Emisiones en España */}
      <div className="mb-8 rounded-2xl border border-line bg-elevated/60 p-6 sm:p-8">
        <h2 className="text-lg font-bold text-fg tracking-tight mb-2 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-accent" />
          ¿Dónde puede entrar un {fuelInfo.label.toLowerCase()} de {yearNumber} en España?
        </h2>
        <p className="text-xs text-muted mb-6">
          Evaluación de las 152 ciudades españolas obligadas por la Ley de Cambio Climático a implantar ZBE con distintivo {dgtEval.badgeName}.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <div className="rounded-xl bg-positive-soft border border-positive-line p-4 text-center">
            <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-positive uppercase tracking-wider">
              <CheckCircle2 className="h-4 w-4" />
              Acceso Libre
            </span>
            <span className="text-3xl font-black text-fg mt-1 block">{allowedCities.length}</span>
            <span className="text-[11px] text-muted">ciudades</span>
          </div>

          <div className="rounded-xl bg-warning-soft border border-warning-line p-4 text-center">
            <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-warning uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4" />
              Acceso Restringido / Parking
            </span>
            <span className="text-3xl font-black text-fg mt-1 block">{restrictedCities.length}</span>
            <span className="text-[11px] text-muted">ciudades</span>
          </div>

          <div className="rounded-xl bg-negative-soft border border-negative-line p-4 text-center">
            <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-negative uppercase tracking-wider">
              <XCircle className="h-4 w-4" />
              Acceso Prohibido
            </span>
            <span className="text-3xl font-black text-fg mt-1 block">{bannedCities.length}</span>
            <span className="text-[11px] text-muted">ciudades</span>
          </div>
        </div>

        {/* Desglose de ciudades principales con enlace */}
        <div className="space-y-6">
          {bannedCities.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-negative mb-3 flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5" />
                Ciudades donde tiene prohibida la entrada ({bannedCities.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {bannedCities.slice(0, 16).map((c) => (
                  <Link
                    key={c.slug}
                    href={`/${c.slug}/${badgeSlug}`}
                    className="p-2.5 rounded-lg border border-negative-line bg-negative-soft hover:border-negative text-xs text-secondary flex items-center justify-between"
                  >
                    <span className="truncate">{c.cityName}</span>
                    <ArrowRight className="h-3 w-3 text-negative flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {restrictedCities.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-warning mb-3 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Ciudades con restricciones o parking obligatorio ({restrictedCities.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {restrictedCities.slice(0, 16).map((c) => (
                  <Link
                    key={c.slug}
                    href={`/${c.slug}/${badgeSlug}`}
                    className="p-2.5 rounded-lg border border-warning-line bg-warning-soft hover:border-warning text-xs text-secondary flex items-center justify-between"
                  >
                    <span className="truncate">{c.cityName}</span>
                    <ArrowRight className="h-3 w-3 text-warning flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {allowedCities.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-positive mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Principales ciudades con acceso permitido ({allowedCities.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {allowedCities.slice(0, 16).map((c) => (
                  <Link
                    key={c.slug}
                    href={`/${c.slug}/${badgeSlug}`}
                    className="p-2.5 rounded-lg border border-positive-line bg-positive-soft hover:border-positive text-xs text-secondary flex items-center justify-between"
                  >
                    <span className="truncate">{c.cityName}</span>
                    <ArrowRight className="h-3 w-3 text-positive flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preguntas Frecuentes Visibles */}
      <div className="mb-8 rounded-2xl border border-line bg-elevated/60 p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-secondary mb-4 flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-accent" />
          Preguntas frecuentes sobre coches {fuelInfo.label.toLowerCase()} de {yearNumber}
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border-b border-line pb-3 last:border-b-0 last:pb-0">
              <h3 className="text-xs font-bold text-fg mb-1">{faq.question}</h3>
              <p className="text-xs text-muted leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Navegación Interna entre Años y Combustibles */}
      <div className="rounded-2xl border border-line bg-elevated/40 p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
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
                className="px-3 py-1 rounded bg-surface border border-line hover:border-accent text-xs text-secondary hover:text-fg"
              >
                Año {y}
              </Link>
            ))}
        </div>

        <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
          Otros combustibles del año {yearNumber}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(VALID_FUELS)
            .filter(([k]) => k !== fuelKey)
            .map(([k, info]) => (
              <Link
                key={k}
                href={`/etiqueta-dgt/${k}/${yearNumber}`}
                className="p-2.5 rounded-lg border border-line bg-surface/60 hover:border-accent text-xs text-secondary flex items-center justify-between"
              >
                <span>{info.label} ({yearNumber})</span>
                <ArrowRight className="h-3 w-3 text-accent" />
              </Link>
            ))}
        </div>
      </div>

      <AdSlot />
    </div>
  );
}
