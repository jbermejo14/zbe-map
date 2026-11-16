import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllCities, getCityBySlug } from '@/lib/cities-repository';
import { CityMiniMap } from '@/components/CityMiniMap';
import { DgtBadgeType } from '@/lib/zbe-engine';
import { DgtSticker } from '@/lib/dgt-svg-badges';
import { SEO_CURRENT_YEAR } from '@/lib/seo';
import { getVerificationText, isCityVerified } from '@/lib/city-verification';
import {
  ChevronRight,
  MapPin,
  Clock,
  AlertOctagon,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  CalendarCheck2,
  BellRing,
  ParkingSquare,
  ArrowRight,
} from 'lucide-react';

interface Props {
  params: Promise<{
    ciudad: string;
  }>;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://radar-zbe.es';

export async function generateStaticParams() {
  const cities = getAllCities();
  return cities.map((c) => ({
    ciudad: c.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ciudad } = await params;
  const city = getCityBySlug(ciudad);

  if (!city) {
    return {
      title: 'Ciudad no encontrada | Radar ZBE',
    };
  }

  const verified = isCityVerified(city);
  const title = verified
    ? `ZBE ${city.name} ${SEO_CURRENT_YEAR}: Mapa, Horarios, Multas y Normativa DGT`
    : `ZBE ${city.name} ${SEO_CURRENT_YEAR}: Mapa y Normas Orientativas por Etiqueta DGT`;
  const description = verified
    ? `Normativa y restricciones de la Zona de Bajas Emisiones en ${city.name} (${city.province}). Horario (${city.schedule}), multa de ${city.fineAmount} €, exenciones y acceso por etiqueta DGT.`
    : `Normas orientativas de la Zona de Bajas Emisiones en ${city.name} (${city.province}), pendientes de verificar con la ordenanza municipal. Acceso por etiqueta DGT; consulta al ayuntamiento horario y sanciones.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl}/zbe/${city.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/zbe/${city.slug}`,
      type: 'article',
    },
  };
}

export default async function CityZbeSeoPage({ params }: Props) {
  const { ciudad } = await params;
  const city = getCityBySlug(ciudad);

  if (!city) {
    notFound();
  }

  const badgesMap: { key: DgtBadgeType; slug: string; name: string }[] = [
    { key: 'CERO', slug: 'cero', name: '0 CERO' },
    { key: 'ECO', slug: 'eco', name: 'ECO' },
    { key: 'C', slug: 'c', name: 'Etiqueta C' },
    { key: 'B', slug: 'b', name: 'Etiqueta B' },
    { key: 'SIN_ETIQUETA', slug: 'sin-etiqueta', name: 'Sin Etiqueta (A)' },
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
        name: 'ZBE España',
        item: `${siteUrl}/#ciudades`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: city.name,
        item: `${siteUrl}/zbe/${city.slug}`,
      },
    ],
  };

  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'GovernmentService',
    name: `Zona de Bajas Emisiones (ZBE) de ${city.name}`,
    serviceType: 'Regulación de Movilidad Sostenible y Calidad del Aire',
    provider: {
      '@type': 'GovernmentOrganization',
      name: `Ayuntamiento de ${city.name}`,
      url: city.sourceUrl,
    },
    areaServed: {
      '@type': 'AdministrativeArea',
      name: city.name,
    },
    description: city.summary,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-neutral-400 mb-6 flex-wrap">
        <Link href="/" className="hover:text-orange-400 transition-colors">
          Inicio
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-neutral-500">Zonas de Bajas Emisiones</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-neutral-300">{city.province}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-orange-400 font-semibold">{city.name}</span>
      </nav>

      {/* Hero Header */}
      <div className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-neutral-800 border border-neutral-700 px-3 py-1 text-xs font-semibold text-neutral-300">
                {city.province} · {city.region}
              </span>
              <span
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${
                  city.status === 'activa'
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                    : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    city.status === 'activa' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {city.status === 'activa' ? 'ZBE Activa' : 'En tramitación / Pruebas'}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <MapPin className="h-7 w-7 text-orange-500" />
              ZBE {city.name}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-neutral-300 max-w-2xl leading-relaxed">
              {city.summary}
            </p>
          </div>

          {/* Sanción y Horario */}
          <div className="grid grid-cols-2 gap-3 flex-shrink-0">
            <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-3.5 text-center">
              <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-red-400 uppercase tracking-wider">
                <AlertOctagon className="h-3.5 w-3.5" />
                Sanción
              </span>
              <span className="text-2xl font-black text-white mt-1 block">{city.fineAmount} €</span>
              <span className="text-[10px] text-neutral-400">según ordenanza</span>
            </div>

            <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-3.5 text-center">
              <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5" />
                Horario
              </span>
              <span className="text-xs font-bold text-neutral-200 mt-2 block line-clamp-2">
                {city.schedule}
              </span>
            </div>
          </div>
        </div>

        {/* Verificación de Datos Municipales */}
        <div className="py-3 px-4 mt-4 rounded-lg bg-neutral-950/80 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span>{getVerificationText(city)}</span>
            {city.noticePeriod && (
              <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-900/40 text-[11px]">
                <BellRing className="h-3 w-3" />
                {city.noticePeriod}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span>{isCityVerified(city) ? 'Fuente:' : 'Enlace consultado:'}</span>
            <a
              href={city.sourceUrl}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="text-orange-400 hover:text-orange-300 underline font-medium inline-flex items-center gap-1"
            >
              {city.sourceName}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Mapa Compacto ZBE */}
        <div className="mt-6 pt-6 border-b border-neutral-800 pb-6">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-orange-400" />
              {city.polygon ? `Perímetro ZBE ${city.name}` : `ZBE ${city.name}`}
            </span>
            <span className="text-xs text-neutral-400 font-medium">
              {city.perimeterName || `Límites municipales ZBE ${city.name}`}
            </span>
          </div>
          <CityMiniMap
            city={{
              lat: city.lat,
              lng: city.lng,
              name: city.name,
              cityName: city.name,
              polygon: city.polygon,
              geoJSON: city.geoJSON,
              officialUrl: isCityVerified(city) ? city.sourceUrl : null,
              status: 'restricted',
            }}
            height="270px"
          />
        </div>

        {/* Matriz de Reglas por Etiqueta DGT con enlaces individuales */}
        <div className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-300 mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-400" />
            ¿Puede entrar tu coche en la ZBE de {city.name}? Consulta por etiqueta
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {badgesMap.map(({ key, slug, name }) => {
              const rule = city.rules[key];
              const status = rule?.status || 'allowed';
              const reason = rule?.reason || 'Sin restricciones reportadas.';

              return (
                <Link
                  key={key}
                  href={`/zbe/${city.slug}/${slug}`}
                  className={`group rounded-xl p-4 border flex flex-col justify-between transition-all hover:scale-[1.01] ${
                    status === 'allowed'
                      ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-400'
                      : status === 'restricted'
                      ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-400'
                      : 'bg-red-950/20 border-red-500/30 hover:border-red-400'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <DgtSticker badge={key} size={48} />
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

                    <h3 className="text-xs font-black text-white group-hover:text-orange-400 transition-colors">
                      {name}
                    </h3>
                    <p className="text-[11px] text-neutral-300 mt-2 leading-relaxed line-clamp-3">
                      {reason}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-orange-400 font-semibold">
                    <span>Ver detalle</span>
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Condición de Parking si aplica */}
        {city.parkingCondition && (
          <div className="mt-6 p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-start gap-3">
            <ParkingSquare className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                Condición de Estacionamiento en Parkings Subterráneos
              </h3>
              <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                {city.parkingCondition}
              </p>
            </div>
          </div>
        )}

        {/* Excepciones tasadas */}
        {city.exemptions && city.exemptions.length > 0 && (
          <div className="mt-8 pt-6 border-t border-neutral-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-orange-400" />
              Excepciones y Vehículos Autorizados en {city.name}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {city.exemptions.map((ex, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 bg-neutral-950/50 border border-neutral-800/80 rounded-xl p-3 text-xs text-neutral-300"
                >
                  <span className="h-2 w-2 rounded-full bg-orange-400 mt-1 flex-shrink-0" />
                  <span>{ex}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
