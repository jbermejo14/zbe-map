import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllCities, getCityBySlug } from '@/lib/cities-repository';
import { CityMiniMap } from '@/components/CityMiniMap';
import { DgtBadgeType, getBadgeMetadata } from '@/lib/zbe-engine';
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
  ParkingSquare,
  ExternalLink,
  CalendarCheck2,
  BellRing,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

interface Props {
  params: Promise<{
    ciudad: string;
    etiqueta: string;
  }>;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://radar-zbe.es';

const SLUG_TO_BADGE: Record<string, { badge: DgtBadgeType; label: string }> = {
  cero: { badge: 'CERO', label: '0 CERO' },
  eco: { badge: 'ECO', label: 'ECO' },
  c: { badge: 'C', label: 'Etiqueta C' },
  b: { badge: 'B', label: 'Etiqueta B' },
  'sin-etiqueta': { badge: 'SIN_ETIQUETA', label: 'Sin Etiqueta (Categoría A)' },
};

const BADGE_TO_SLUG: Record<DgtBadgeType, string> = {
  CERO: 'cero',
  ECO: 'eco',
  C: 'c',
  B: 'b',
  SIN_ETIQUETA: 'sin-etiqueta',
};

export async function generateStaticParams() {
  const cities = getAllCities();
  const badgeSlugs = Object.keys(SLUG_TO_BADGE);

  const params: { ciudad: string; etiqueta: string }[] = [];
  for (const city of cities) {
    for (const etiqueta of badgeSlugs) {
      params.push({
        ciudad: city.slug,
        etiqueta,
      });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ciudad, etiqueta } = await params;
  const city = getCityBySlug(ciudad);
  const badgeInfo = SLUG_TO_BADGE[etiqueta.toLowerCase()];

  if (!city || !badgeInfo) {
    return {
      title: 'Página no encontrada | Radar ZBE',
    };
  }

  const title = `¿Puede entrar un coche con ${badgeInfo.label} en la ZBE de ${city.name}? (2025)`;
  const description = `Consulta si los vehículos con ${badgeInfo.label} pueden circular o aparcar en la Zona de Bajas Emisiones de ${city.name}. Horarios (${city.schedule}), multa de ${city.fineAmount} €, parkings y excepciones.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/zbe/${city.slug}/${etiqueta}`,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/zbe/${city.slug}/${etiqueta}`,
      type: 'article',
    },
  };
}

export default async function CityBadgePage({ params }: Props) {
  const { ciudad, etiqueta } = await params;
  const city = getCityBySlug(ciudad);
  const badgeInfo = SLUG_TO_BADGE[etiqueta.toLowerCase()];

  if (!city || !badgeInfo) {
    notFound();
  }

  const badgeKey = badgeInfo.badge;
  const rule = city.rules[badgeKey];
  const accessStatus = rule?.status || 'allowed';
  const reason = rule?.reason || 'Sin restricciones reportadas.';
  const badgeMeta = getBadgeMetadata(badgeKey);

  // Status visual attributes
  const statusConfig = {
    allowed: {
      label: 'Acceso Permitido',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      icon: CheckCircle2,
      cardBorder: 'border-emerald-500/30 bg-emerald-950/20',
      titleColor: 'text-emerald-400',
    },
    restricted: {
      label: 'Acceso Restringido / Parking Obligatorio',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      icon: AlertTriangle,
      cardBorder: 'border-amber-500/30 bg-amber-950/20',
      titleColor: 'text-amber-400',
    },
    banned: {
      label: 'Acceso Prohibido',
      badgeClass: 'bg-red-500/10 text-red-400 border-red-500/30',
      icon: XCircle,
      cardBorder: 'border-red-500/30 bg-red-950/20',
      titleColor: 'text-red-400',
    },
  }[accessStatus];

  const StatusIcon = statusConfig.icon;

  // Visible FAQs for SEO & FAQPage schema
  const faqs = [
    {
      question: `¿Puede circular un coche con ${badgeInfo.label} en la ZBE de ${city.name}?`,
      answer: `${
        accessStatus === 'allowed'
          ? `Sí, los vehículos con ${badgeInfo.label} tienen acceso libre a la ZBE de ${city.name}.`
          : accessStatus === 'restricted'
          ? `El acceso está condicionado en la ZBE de ${city.name}: ${reason}`
          : `No, los vehículos con ${badgeInfo.label} tienen prohibido el acceso a la ZBE de ${city.name} según la ordenanza municipal: ${reason}`
      }`,
    },
    {
      question: `¿Cuál es el horario de la Zona de Bajas Emisiones en ${city.name}?`,
      answer: `El horario de restricción fijado por el Ayuntamiento de ${city.name} es: ${city.schedule}.`,
    },
    {
      question: `¿A cuánto asciende la multa por entrar sin permiso en la ZBE de ${city.name}?`,
      answer: `La sanción general en ${city.name} es de ${city.fineAmount} €, con posibilidad de reducción del 50% por pronto pago.`,
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
        name: `ZBE ${city.name}`,
        item: `${siteUrl}/zbe/${city.slug}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: badgeInfo.label,
        item: `${siteUrl}/zbe/${city.slug}/${etiqueta}`,
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
        <Link href={`/zbe/${city.slug}`} className="hover:text-orange-400 transition-colors">
          ZBE {city.name}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-orange-400 font-semibold">{badgeInfo.label}</span>
      </nav>

      {/* Header & Verdict */}
      <div className={`rounded-2xl border p-6 sm:p-8 ${statusConfig.cardBorder} mb-8`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
          <div className="flex items-center gap-4">
            <DgtSticker badge={badgeKey} size={70} className="flex-shrink-0" />
            <div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusConfig.badgeClass}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {statusConfig.label}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2">
                ¿Puede entrar un coche con {badgeInfo.label} en la ZBE de {city.name}?
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                {city.name} ({city.province}) &middot; Estado ZBE:{' '}
                <strong className="text-neutral-200 capitalize">{city.status.replace('_', ' ')}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Veredicto Detallado */}
        <div className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
            Normativa aplicable según ordenanza municipal
          </h2>
          <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800/90 text-neutral-200 text-sm leading-relaxed">
            {reason}
          </div>
        </div>

        {/* Resumen de Condiciones */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 text-center">
            <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-sky-400 uppercase tracking-wider">
              <Clock className="h-3.5 w-3.5" />
              Horario
            </span>
            <span className="text-xs font-semibold text-neutral-200 mt-1.5 block">
              {city.schedule}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 text-center">
            <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-red-400 uppercase tracking-wider">
              <AlertOctagon className="h-3.5 w-3.5" />
              Multa
            </span>
            <span className="text-xl font-black text-white mt-1 block">
              {city.fineAmount} €
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 text-center">
            <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-orange-400 uppercase tracking-wider">
              <ParkingSquare className="h-3.5 w-3.5" />
              Parking
            </span>
            <span className="text-xs font-semibold text-neutral-200 mt-1.5 block line-clamp-2">
              {city.parkingCondition || 'Sin exigencia de parking'}
            </span>
          </div>
        </div>

        {/* Verificación de Datos */}
        <div className="mt-6 pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span>Última verificación: <strong className="text-neutral-300">{city.lastVerified}</strong></span>
            {city.noticePeriod && (
              <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded text-[11px]">
                <BellRing className="h-3 w-3" />
                {city.noticePeriod}
              </span>
            )}
          </div>
          <a
            href={city.sourceUrl}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="text-orange-400 hover:text-orange-300 underline font-medium inline-flex items-center gap-1"
          >
            Fuente: {city.sourceName}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Mapa ZBE */}
      <div className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-300 mb-3 flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-orange-400" />
          Plano y Perímetro ZBE de {city.name}
        </h2>
        <CityMiniMap
          city={{
            lat: city.lat,
            lng: city.lng,
            name: city.name,
            cityName: city.name,
            polygon: city.polygon,
            status: accessStatus,
          }}
          height="280px"
        />
      </div>

      {/* Exenciones si aplican */}
      {city.exemptions && city.exemptions.length > 0 && (
        <div className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-orange-400" />
            Excepciones autorizadas en {city.name}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {city.exemptions.map((ex, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 bg-neutral-950/60 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-300"
              >
                <span className="h-2 w-2 rounded-full bg-orange-400 mt-1 flex-shrink-0" />
                <span>{ex}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preguntas Frecuentes (FAQ) Visibles */}
      <div className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-300 mb-4 flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-orange-400" />
          Preguntas frecuentes: {badgeInfo.label} en {city.name}
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

      {/* Navegación interna: Otras etiquetas en esta ciudad */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4">
          Comprobar otras etiquetas en la ZBE de {city.name}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(SLUG_TO_BADGE)
            .filter(([s]) => s !== etiqueta.toLowerCase())
            .map(([s, info]) => (
              <Link
                key={s}
                href={`/zbe/${city.slug}/${s}`}
                className="flex items-center justify-between p-3 rounded-lg border border-neutral-800 bg-neutral-950/60 hover:border-orange-500/50 hover:bg-neutral-900 text-xs text-neutral-300 transition-colors"
              >
                <span>{info.label}</span>
                <ArrowRight className="h-3 w-3 text-orange-400" />
              </Link>
            ))}
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-800/80 flex items-center justify-between text-xs">
          <Link href={`/zbe/${city.slug}`} className="text-neutral-400 hover:text-white underline">
            &larr; Ver guía completa de la ZBE de {city.name}
          </Link>
          <Link href="/" className="text-orange-400 hover:text-orange-300 font-semibold">
            Mapa de España ZBE &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
