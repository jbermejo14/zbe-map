import React from 'react';
import { assetPath, SITE_NAME } from '@/lib/site';

const LOGO_WIDTH = 198;
const LOGO_HEIGHT = 48;

/**
 * Logo de la marca. Renderiza las dos variantes y el CSS muestra la que
 * corresponde al tema activo ([data-theme]), así no hay parpadeo al cargar.
 */
export function BrandLogo() {
  return (
    <>
      {/* SVG estáticos: next/image no aporta optimización y obligaría a configurar `dangerouslyAllowSVG`. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="brand-logo brand-logo-light"
        src={assetPath('/brand/ododex-logo-light.svg')}
        alt={SITE_NAME}
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
      />
      {/* SVG estáticos: next/image no aporta optimización y obligaría a configurar `dangerouslyAllowSVG`. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="brand-logo brand-logo-dark"
        src={assetPath('/brand/ododex-logo-dark.svg')}
        alt={SITE_NAME}
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
      />
    </>
  );
}
