'use client';

import React, { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { filterCitiesByName, groupCitiesByRegion } from '@/lib/city-search';

export interface DirectoryCity {
  slug: string;
  name: string;
  province: string;
  region: string;
  status: 'activa' | 'en_tramitacion';
}

interface CitiesDirectoryProps {
  cities: DirectoryCity[];
}

/** Lista de ciudades por comunidad autónoma con buscador por nombre. */
export function CitiesDirectory({ cities }: CitiesDirectoryProps) {
  const searchId = useId();
  const [query, setQuery] = useState('');
  const groups = useMemo(() => groupCitiesByRegion(filterCitiesByName(cities, query)), [cities, query]);

  return (
    <div>
      <label htmlFor={searchId} className="block text-xs font-semibold text-secondary mb-1">
        Buscar ciudad
      </label>
      <input
        id={searchId}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Escribe el nombre de una ciudad"
        autoComplete="off"
        className="w-full max-w-md min-h-11 rounded border border-line bg-elevated px-3 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none"
      />

      {groups.length === 0 && (
        <p role="status" className="mt-4 text-sm text-muted">
          Ninguna ciudad coincide con «{query}». Revisa el nombre o borra la búsqueda.
        </p>
      )}

      {groups.map((group) => (
        <section key={group.region} className="mt-6" aria-labelledby={`${searchId}-${group.region}`}>
          <h2 id={`${searchId}-${group.region}`} className="text-base font-bold text-fg mb-2">
            {group.region} <span className="text-xs font-normal text-muted">({group.cities.length})</span>
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {group.cities.map((city) => (
              <li key={city.slug}>
                <Link
                  href={`/${city.slug}`}
                  className="flex items-center justify-between gap-2 min-h-11 rounded border border-line bg-surface px-3 py-1.5 hover:border-accent"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-fg break-words">{city.name}</span>
                    <span className="block text-xs text-muted">{city.province}</span>
                  </span>
                  <span className={city.status === 'activa' ? 'tag tag-green' : 'tag tag-warning'}>
                    {city.status === 'activa' ? 'Activa' : 'En tramitación'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
