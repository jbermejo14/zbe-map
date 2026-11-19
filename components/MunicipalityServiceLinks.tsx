import Link from 'next/link';
import { getMunicipalityLinks } from '@/lib/municipality-links';

interface MunicipalityServiceLinksProps {
  citySlug: string;
  cityName: string;
}

const SERVICE_LINK_CLASS = 'text-accent hover:text-accent-hover underline font-medium';

/**
 * Enlaces a las gasolineras y puntos de recarga del municipio. Esas rutas están
 * fuera de basePath, por eso se usa `<a>` y no `next/link`.
 */
export function MunicipalityServiceLinks({ citySlug, cityName }: MunicipalityServiceLinksProps) {
  const { fuelHref, chargingHref } = getMunicipalityLinks(citySlug);

  return (
    <div className="mb-8 rounded-2xl border border-line bg-elevated/60 p-6">
      <h2 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">
        Repostar y recargar en {cityName}
      </h2>
      <ul className="space-y-2 text-sm">
        {fuelHref && (
          <li>
            <a href={fuelHref} className={SERVICE_LINK_CLASS}>
              Precios de las gasolineras de {cityName} hoy
            </a>
          </li>
        )}
        {chargingHref && (
          <li>
            <a href={chargingHref} className={SERVICE_LINK_CLASS}>
              Puntos de recarga en {cityName}
            </a>
          </li>
        )}
        <li className="text-xs text-muted">
          ¿No sabes qué etiqueta tiene tu coche?{' '}
          <Link href="/etiqueta-dgt" className={SERVICE_LINK_CLASS}>
            Calcúlala
          </Link>
        </li>
      </ul>
    </div>
  );
}
