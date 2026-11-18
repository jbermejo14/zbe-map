import React from 'react';
import Script from 'next/script';

const ADSENSE_CLIENT_PATTERN = /^ca-pub-\d{16}$/;
const ADSENSE_SLOT_PATTERN = /^\d{10}$/;
const ADSENSE_SCRIPT_URL = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

/** Identificador de AdSense configurado, o null si falta o no tiene el formato ca-pub-<16 dígitos>. */
export function getAdSenseClient(): string | null {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? '';
  return ADSENSE_CLIENT_PATTERN.test(client) ? client : null;
}

/** Unidad de anuncio configurada, o null si falta o no tiene 10 dígitos. */
export function getAdSenseSlot(): string | null {
  const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT ?? '';
  return ADSENSE_SLOT_PATTERN.test(slot) ? slot : null;
}

/**
 * Carga el script de AdSense solo si NEXT_PUBLIC_ADSENSE_CLIENT es válida.
 * El mensaje de consentimiento (TCF v2.2) lo sirve ese mismo script, configurado en AdSense.
 */
export function AdSenseScript() {
  const client = getAdSenseClient();
  if (!client) return null;
  return (
    <Script
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`${ADSENSE_SCRIPT_URL}?client=${client}`}
    />
  );
}
