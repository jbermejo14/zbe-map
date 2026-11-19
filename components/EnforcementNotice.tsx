import { ExternalLink } from 'lucide-react';
import { formatSpanishDate } from '@/lib/atlas-zbe';
import type { CityEnforcement } from '@/lib/cities-repository';
import { zbeUiAccessCardClass, zbeUiAccessTextClass, zbeUiEnforcementColor } from '@/lib/zbe-ui';

interface EnforcementNoticeProps {
  enforcement: CityEnforcement | null | undefined;
  cityName: string;
  /** Si la ciudad cuenta como verificada (`isCityVerified`); cambia el texto de la fecha. */
  verified: boolean;
}

const NOTICE_LINK_CLASS = 'text-accent hover:text-accent-hover underline font-medium inline-flex items-center gap-1';

function enforcementVerificationText(date: string, verified: boolean): string {
  const formatted = formatSpanishDate(date);
  return verified
    ? `Verificado el ${formatted} con fuentes oficiales`
    : `Datos de Atlas ZBE comprobados el ${formatted}; pendientes de confirmar con el ayuntamiento`;
}

function EnforcementSource({ enforcement, verified }: { enforcement: CityEnforcement; verified: boolean }) {
  if (enforcement.source === 'miteco') {
    return (
      <>
        Según el inventario de ZBE del MITECO (actualizado el {formatSpanishDate(enforcement.inventoryUpdated)})
      </>
    );
  }
  return (
    <>
      {enforcement.verifiedOn && (
        <span>{enforcementVerificationText(enforcement.verifiedOn, verified)}</span>
      )}
      {enforcement.officialUrl && (
        <a
          href={enforcement.officialUrl}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className={NOTICE_LINK_CLASS}
        >
          Fuente oficial
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      )}
    </>
  );
}

/** Tarjeta con el estado real de aplicación de la ZBE. No se muestra sin `enforcement`. */
export function EnforcementNotice({ enforcement, cityName, verified }: EnforcementNoticeProps) {
  if (!enforcement) return null;
  const color = zbeUiEnforcementColor(enforcement.state);

  return (
    <section
      aria-label={`Estado de la ZBE de ${cityName}`}
      className={`mt-4 rounded-xl border p-4 ${zbeUiAccessCardClass(color)}`}
    >
      <p className={`text-xs font-black uppercase tracking-wider ${zbeUiAccessTextClass(color)}`}>
        {enforcement.label}
      </p>
      <p className="mt-1 text-sm text-secondary leading-relaxed">{enforcement.sentence}</p>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <EnforcementSource enforcement={enforcement} verified={verified} />
      </p>
    </section>
  );
}
