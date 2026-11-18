import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { CitiesDirectory } from '@/components/CitiesDirectory';
import type { DirectoryCity } from '@/components/CitiesDirectory';
import { getAllCities } from '@/lib/cities-repository';
import { SEO_CURRENT_YEAR } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site';

const CITIES_ROUTE = '/ciudades';
const CITIES_TITLE = `Ciudades con zona de bajas emisiones (ZBE) en España ${SEO_CURRENT_YEAR}`;
const CITIES_DESCRIPTION =
  'Lista de las ciudades españolas con zona de bajas emisiones (ZBE), agrupadas por comunidad autónoma, con su estado (activa o en tramitación) y enlace a las restricciones de cada una.';

export const metadata: Metadata = {
  title: CITIES_TITLE,
  description: CITIES_DESCRIPTION,
  alternates: { canonical: absoluteUrl(CITIES_ROUTE) },
  openGraph: {
    title: CITIES_TITLE,
    description: CITIES_DESCRIPTION,
    url: absoluteUrl(CITIES_ROUTE),
    type: 'website',
  },
};

export default function CitiesPage() {
  const cities: DirectoryCity[] = getAllCities().map(({ slug, name, province, region, status }) => ({
    slug,
    name,
    province,
    region,
    status,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs
        items={[
          { name: 'Inicio', url: '/' },
          { name: 'Ciudades', url: CITIES_ROUTE },
        ]}
      />
      <h1 className="text-2xl sm:text-3xl font-black text-fg tracking-tight">
        Ciudades con ZBE en España
      </h1>
      <p className="mt-2 mb-6 text-sm text-secondary max-w-2xl">
        {cities.length} ciudades agrupadas por comunidad autónoma. Elige una para ver su horario, su multa y qué etiquetas DGT pueden entrar.
      </p>
      <CitiesDirectory cities={cities} />
    </div>
  );
}
