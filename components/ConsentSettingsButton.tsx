'use client';

import React from 'react';

interface ConsentGoogleFc {
  callbackQueue?: Array<() => void>;
  showRevocationMessage?: () => void;
}

declare global {
  interface Window {
    googlefc?: ConsentGoogleFc;
  }
}

/** Reabre el mensaje de consentimiento de Google para retirar o cambiar la elección. */
function consentShowRevocation(): void {
  window.googlefc ??= {};
  window.googlefc.callbackQueue ??= [];
  window.googlefc.callbackQueue.push(() => window.googlefc?.showRevocationMessage?.());
}

export function ConsentSettingsButton() {
  return (
    <button type="button" className="footer-link-button" onClick={consentShowRevocation}>
      Configurar cookies
    </button>
  );
}
