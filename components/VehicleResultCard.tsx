import React from 'react';
import Link from 'next/link';
import type { DgtBadgeType } from '@/lib/zbe-engine';
import { DGT_LEGAL_SOURCE } from '@/lib/dgt-rules';
import { DgtSticker } from '@/lib/dgt-svg-badges';
import { zbeUiBadgeChipClass, zbeUiBadgeSentenceLabel } from '@/lib/zbe-ui';
import { ArrowUpRight, ExternalLink } from 'lucide-react';

const RESULT_STICKER_SIZE = 96;

interface VehicleResultCardProps {
  badge: DgtBadgeType;
  title: string;
  /** Datos que se muestran como pastillas: año, combustible... */
  chips: string[];
  description: string;
  euroStandard?: string;
  /** Ruta interna de la ficha de etiqueta, solo si existe la página. */
  etiquetaHref?: string | null;
  /** Avisos por datos que faltan y se han supuesto. */
  assumptions?: string[];
}

/** Resultado de la etiqueta DGT del vehículo o de la etiqueta elegida, con enlace a la consulta oficial. */
export function VehicleResultCard({
  badge,
  title,
  chips,
  description,
  euroStandard,
  etiquetaHref,
  assumptions = [],
}: VehicleResultCardProps) {
  return (
    <div className="card card-compact" aria-live="polite">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
        <div className="flex flex-col items-center flex-shrink-0">
          <DgtSticker badge={badge} size={RESULT_STICKER_SIZE} />
          <span className="mt-1 text-[11px] uppercase font-bold text-muted">Distintivo DGT</span>
        </div>

        <div className="flex-1 min-w-0 w-full text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mb-1">
            {chips.map((chip) => (
              <span key={chip} className="tag">{chip}</span>
            ))}
            <span className={`${zbeUiBadgeChipClass(badge)} text-xs font-bold px-2 py-0.5 rounded`}>
              {zbeUiBadgeSentenceLabel(badge)}
            </span>
          </div>
          <h3 className="text-xl font-black text-fg tracking-tight break-words">{title}</h3>
          <p className="text-xs text-muted leading-relaxed mt-1">{description}</p>
          {euroStandard && <p className="text-xs text-secondary mt-1">Norma: {euroStandard}</p>}
        </div>
      </div>

      {assumptions.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-warning" role="status">
          {assumptions.map((assumption) => (
            <li key={assumption}>{assumption}</li>
          ))}
        </ul>
      )}

      <div className="mt-3 pt-3 border-t border-line flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <a
          href={DGT_LEGAL_SOURCE.dgtPortalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 min-h-11 text-accent hover:text-accent-hover underline font-semibold"
        >
          Confirmar en la DGT
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
        {etiquetaHref && (
          <Link
            href={etiquetaHref}
            className="inline-flex items-center gap-1 min-h-11 text-accent hover:text-accent-hover font-semibold"
          >
            Ver ficha de esta etiqueta
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}

const DEFAULT_PLACEHOLDER_HINT = 'Elige tu vehículo (marca, combustible y año) para ver dónde puedes circular.';

/**
 * Marcador de posición mientras no hay etiqueta; `message` pregunta lo que falta para obtenerla.
 * `hint` sustituye la explicación por defecto (la de la home habla de la marca y de las ZBE).
 */
export function VehicleResultPlaceholder({ message, hint }: { message?: string; hint?: string }) {
  return (
    <div className="card card-compact border-dashed text-center">
      <p className="text-sm font-semibold text-fg">{message ?? 'Aquí verás tu etiqueta DGT'}</p>
      <p className="text-xs text-muted mt-1">
        {message
          ? 'Con ese año la etiqueta depende del combustible: elígelo arriba y la verás aquí.'
          : (hint ?? DEFAULT_PLACEHOLDER_HINT)}
      </p>
    </div>
  );
}
