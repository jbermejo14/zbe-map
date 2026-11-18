import type { MetadataRoute } from 'next';
import { getAllCities } from '../lib/cities-repository.ts';
import { absoluteUrl } from '../lib/site.ts';
import { ETIQUETA_FUEL_SLUGS, ETIQUETA_YEARS } from '../lib/etiqueta-routes.ts';

// Exportación estática: el sitemap se genera en el build.
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  // 1. Home
  const routes: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/'),
      lastModified,
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];

  const cities = getAllCities();
  const badges = ['cero', 'eco', 'c', 'b', 'sin-etiqueta'];

  // 2. Páginas de ciudad (/[ciudad])
  for (const city of cities) {
    routes.push({
      url: absoluteUrl(`/${city.slug}`),
      lastModified: new Date(city.lastVerified || lastModified),
      changeFrequency: 'weekly',
      priority: 0.8,
    });

    // 3. Páginas ciudad x etiqueta (/[ciudad]/[etiqueta])
    for (const badge of badges) {
      routes.push({
        url: absoluteUrl(`/${city.slug}/${badge}`),
        lastModified: new Date(city.lastVerified || lastModified),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  // 4. Páginas programáticas combustible x año (/etiqueta-dgt/[combustible]/[año])
  for (const fuel of ETIQUETA_FUEL_SLUGS) {
    for (const year of ETIQUETA_YEARS) {
      routes.push({
        url: absoluteUrl(`/etiqueta-dgt/${fuel}/${year}`),
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  }

  return routes;
}
