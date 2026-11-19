import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { absoluteUrl } from '@/lib/site';
import { CITY_STATUS_ZBE_LABEL, zbeUiAccessTagClass, zbeUiCityStatusDotClass, zbeUiCityStatusTagClass } from '@/lib/zbe-ui';
import { getAllCities, getCityBySlug } from '@/lib/cities-repository';
import { CityMiniMap } from '@/components/CityMiniMap';
import { DgtBadgeType } from '@/lib/zbe-engine';
import { AdSlot } from '@/components/AdSlot';
import { DgtSticker } from '@/lib/dgt-svg-badges';
import { canonicalRegion } from '@/lib/regions';
import { SEO_CURRENT_YEAR } from '@/lib/seo';
import { MunicipalityServiceLinks } from '@/components/MunicipalityServiceLinks';
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

export const dynamicParams = false;

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
      title: 'Ciudad no encontrada',
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
      canonical: absoluteUrl(`/${city.slug}`),
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/${city.slug}`),
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
        item: absoluteUrl('/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'ZBE España',
        item: absoluteUrl('/ciudades'),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: city.name,
        item: absoluteUrl(`/${city.slug}`),
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
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted mb-6 flex-wrap">
        <Link href="/" className="hover:text-accent transition-colors">
          Inicio
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-muted">Zonas de Bajas Emisiones</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-secondary">{city.province}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-accent font-semibold">{city.name}</span>
      </nav>

      {/* Hero Header */}
      <div className="mb-8 rounded-2xl border border-line bg-elevated/60 p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-line">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full bg-elevated border border-line px-3 py-1 text-xs font-semibold text-secondary">
                {city.province} · {canonicalRegion(city.region)}
              </span>
              <span
                className={`flex items-center gap-1.5 tag-lg ${zbeUiCityStatusTagClass(city.status)}`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${zbeUiCityStatusDotClass(city.status)}`}
                />
                {CITY_STATUS_ZBE_LABEL[city.status]}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-fg tracking-tight flex items-center gap-3">
              <MapPin className="h-7 w-7 text-accent" />
              ZBE {city.name}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-secondary max-w-2xl leading-relaxed">
              {city.summary}
            </p>
          </div>

          {/* Sanción y Horario */}
          <div className="grid grid-cols-2 gap-3 flex-shrink-0">
            <div className="rounded-xl bg-surface border border-line p-3.5 text-center">
              <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-negative uppercase tracking-wider">
                <AlertOctagon className="h-3.5 w-3.5" />
                Sanción
              </span>
              <span className="text-2xl font-black text-fg mt-1 block">{city.fineAmount} €</span>
              <span className="text-[10px] text-muted">según ordenanza</span>
            </div>

            <div className="rounded-xl bg-surface border border-line p-3.5 text-center">
              <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-secondary uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5" />
                Horario
              </span>
              <span className="text-xs font-bold text-secondary mt-2 block line-clamp-2">
                {city.schedule}
              </span>
            </div>
          </div>
        </div>

        {/* Verificación de Datos Municipales */}
        <div className="py-3 px-4 mt-4 rounded-lg bg-surface/80 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted">
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="h-4 w-4 text-positive flex-shrink-0" />
            <span>{getVerificationText(city)}</span>
            {city.noticePeriod && (
              <span className="inline-flex items-center gap-1 text-warning bg-warning-soft px-2 py-0.5 rounded border border-warning-line text-[11px]">
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
              className="text-accent hover:text-accent-hover underline font-medium inline-flex items-center gap-1"
            >
              {city.sourceName}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Mapa Compacto ZBE */}
        <div className="mt-6 pt-6 border-b border-line pb-6">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-accent" />
              {city.polygon ? `Perímetro ZBE ${city.name}` : `ZBE ${city.name}`}
            </span>
            <span className="text-xs text-muted font-medium">
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
          {city.perimeterSource && (
            <p className="mt-2 text-[11px] text-muted">
              Perímetro oficial:{' '}
              <a
                href={city.perimeterSource.url}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="text-accent hover:text-accent-hover underline"
              >
                {city.perimeterSource.name}
              </a>
            </p>
          )}
        </div>

        <AdSlot />

        {/* Matriz de Reglas por Etiqueta DGT con enlaces individuales */}
        <div className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-secondary mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
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
                  href={`/${city.slug}/${slug}`}
                  className={`group rounded-xl p-4 border flex flex-col justify-between transition-all hover:scale-[1.01] ${
                    status === 'allowed'
                      ? 'bg-positive-soft border-positive-line hover:border-positive'
                      : status === 'restricted'
                      ? 'bg-warning-soft border-warning-line hover:border-warning'
                      : 'bg-negative-soft border-negative-line hover:border-negative'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <DgtSticker badge={key} size={48} />
                      <span className={`${zbeUiAccessTagClass(status)} font-black uppercase tracking-wider`}>
                        {status === 'allowed' ? 'Permitido' : status === 'restricted' ? 'Restringido' : 'Prohibido'}
                      </span>
                    </div>

                    <h3 className="text-xs font-black text-fg group-hover:text-accent transition-colors">
                      {name}
                    </h3>
                    <p className="text-[11px] text-secondary mt-2 leading-relaxed line-clamp-3">
                      {reason}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-line flex items-center justify-between text-[11px] text-accent font-semibold">
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
          <div className="mt-6 p-4 rounded-xl bg-warning-soft border border-warning-line flex items-start gap-3">
            <ParkingSquare className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-warning uppercase tracking-wide">
                Condición de Estacionamiento en Parkings Subterráneos
              </h3>
              <p className="text-xs text-secondary mt-1 leading-relaxed">
                {city.parkingCondition}
              </p>
            </div>
          </div>
        )}

        {/* Excepciones tasadas */}
        {city.exemptions && city.exemptions.length > 0 && (
          <div className="mt-8 pt-6 border-t border-line">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent" />
              Excepciones y Vehículos Autorizados en {city.name}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {city.exemptions.map((ex, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 bg-surface/50 border border-line rounded-xl p-3 text-xs text-secondary"
                >
                  <span className="h-2 w-2 rounded-full bg-accent mt-1 flex-shrink-0" />
                  <span>{ex}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <MunicipalityServiceLinks citySlug={city.slug} cityName={city.name} />

      <AdSlot />
    </div>
  );
}
