import React from 'react';
import type { PerimeterSource } from '@/lib/cities-repository';
import {
  PERIMETER_APPROXIMATE_ADVICE,
  PERIMETER_APPROXIMATE_LABEL,
  PERIMETER_OFFICIAL_LABEL,
  isApproximatePerimeter,
} from '@/lib/city-verification';

interface PerimeterSourceNoteProps {
  perimeterSource: PerimeterSource | null | undefined;
}

/** Fuente del perímetro bajo el mapa; avisa cuando es un contorno aproximado. No muestra nada sin fuente. */
export function PerimeterSourceNote({ perimeterSource }: PerimeterSourceNoteProps) {
  if (!perimeterSource) return null;
  const isApproximate = isApproximatePerimeter(perimeterSource);
  return (
    <p className="mt-2 text-[11px] text-muted">
      {isApproximate ? PERIMETER_APPROXIMATE_LABEL : PERIMETER_OFFICIAL_LABEL}:{' '}
      <a
        href={perimeterSource.url}
        target="_blank"
        rel="nofollow noopener noreferrer"
        className="text-accent hover:text-accent-hover underline"
      >
        {perimeterSource.name}
      </a>
      {isApproximate && `. ${PERIMETER_APPROXIMATE_ADVICE}`}
    </p>
  );
}
