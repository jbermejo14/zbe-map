import type { MetadataRoute } from 'next';
import { getAllCities } from '../lib/cities-repository.ts';
import { absoluteUrl } from '../lib/site.ts';

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
  const fuels = ['gasolina', 'diesel', 'hibrido', 'hibrido-enchufable', 'electrico', 'glp-gnc'];
  const years = [
    1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011,
    2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026,
  ];

  for (const fuel of fuels) {
    for (const year of years) {
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
