import React from 'react';
import Link from 'next/link';
import type { NetworkSection } from '@/lib/network';
import { SITE_NAME } from '@/lib/site';
import { ConsentSettingsButton } from '@/components/ConsentSettingsButton';

const SOURCE_LINKS = [
  { label: 'Distintivo ambiental (DGT)', href: 'https://sede.dgt.gob.es/es/vehiculos/distintivo-ambiental/' },
  { label: 'Ley 7/2021 de Cambio Climático (BOE)', href: 'https://www.boe.es/buscar/act.php?id=BOE-A-2021-8447' }
] as const;

const MUNICIPAL_SOURCE_TEXT = 'Ordenanzas municipales';

const ATLAS_ZBE_URL = 'https://atlaszbe.es';
const ODBL_URL = 'https://opendatacommons.org/licenses/odbl/1-0/';

const LINK_CLASS = 'text-muted hover:text-accent transition-colors';

export interface FooterProps {
  /** Muestra el botón para cambiar el consentimiento; solo si AdSense está configurado. */
  mostrarConsentimiento?: boolean;
  /** Otras webs de la red (sin la propia). null o vacío: no se pinta el bloque. */
  redSecciones?: NetworkSection[] | null;
}

export function Footer({ mostrarConsentimiento = false, redSecciones = null }: FooterProps) {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <p className="footer-text">
          <strong>{SITE_NAME}</strong> &bull; Zonas de bajas emisiones y etiquetas ambientales de la DGT en España.
        </p>
        <p className="footer-subtext">
          Sitio independiente: no es una web oficial de la DGT ni de ningún ayuntamiento. La información es orientativa y los perímetros son aproximados; manda siempre la ordenanza municipal vigente.
        </p>
        <p className="footer-subtext">
          Datos de las ZBE:{' '}
          <a href={ATLAS_ZBE_URL} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            Atlas ZBE
          </a>{' '}
          (
          <a href={ODBL_URL} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            ODbL 1.0
          </a>
          ), DGT, MITECO y ayuntamientos.
        </p>
        <nav aria-label="Información legal" className="footer-legal">
          <Link href="/aviso-legal">Aviso legal</Link>
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/cookies">Cookies</Link>
          {mostrarConsentimiento && <ConsentSettingsButton />}
        </nav>
        {redSecciones && redSecciones.length > 0 && (
          <nav aria-label="Otras webs de Ododex" className="footer-links">
            <span>Otras webs de Ododex:</span>
            {redSecciones.map(seccion => (
              // Son webs de otra sección: <a> normal, sin next/link ni basePath propio.
              <a key={seccion.ruta} href={seccion.ruta} title={seccion.descripcion} className={LINK_CLASS}>
                {seccion.nombre}
              </a>
            ))}
          </nav>
        )}
        <div className="footer-links">
          <span>Fuentes:</span>
          {SOURCE_LINKS.map(link => (
            <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
              {link.label}
            </a>
          ))}
          <span>{MUNICIPAL_SOURCE_TEXT}</span>
        </div>
      </div>
    </footer>
  );
}
