'use client';

import React, { useEffect, useRef } from 'react';
import { getAdSenseClient, getAdSenseSlot } from './AdSenseScript';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const AD_LABEL = 'Publicidad';

interface AdSlotProps {
  className?: string;
}

/**
 * Hueco de anuncio manual. No renderiza nada si falta un cliente válido
 * (NEXT_PUBLIC_ADSENSE_CLIENT) o una unidad válida (NEXT_PUBLIC_ADSENSE_SLOT, 10 dígitos).
 */
export function AdSlot({ className }: AdSlotProps) {
  const client = getAdSenseClient();
  const slot = getAdSenseSlot();
  const isRequested = useRef(false);
  const isConfigured = client !== null && slot !== null;

  useEffect(() => {
    // El ref evita el segundo push que provoca el modo estricto de React.
    if (!isConfigured || isRequested.current) return;
    isRequested.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      // Un fallo del anuncio (p. ej. bloqueador) no debe romper la página.
      console.error('No se pudo cargar el anuncio:', error);
    }
  }, [isConfigured]);

  if (!isConfigured) return null;
  return (
    <aside aria-label={AD_LABEL} className={className ? `ad-slot ${className}` : 'ad-slot'}>
      <span className="ad-slot-label">{AD_LABEL}</span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
