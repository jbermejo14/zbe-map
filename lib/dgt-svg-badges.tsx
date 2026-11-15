import React from 'react';
import { DgtBadgeType } from './zbe-engine';

interface DgtStickerProps {
  badge: DgtBadgeType;
  size?: number;
  className?: string;
  matricula?: string;
}

export function DgtSticker({ badge, size = 160, className = '', matricula }: DgtStickerProps) {
  const width = size;
  const height = size;

  switch (badge) {
    case 'CERO':
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 200 200"
          className={`drop-shadow-lg select-none ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Base circular con sombra y borde exterior blanco */}
          <circle cx="100" cy="100" r="96" fill="#008ECE" stroke="#FFFFFF" strokeWidth="6" />
          <circle cx="100" cy="100" r="91" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />

          {/* Cabecera DGT */}
          <rect x="55" y="18" width="90" height="20" rx="4" fill="#003366" />
          <text x="100" y="32" fill="#FFFFFF" fontSize="11" fontWeight="800" textAnchor="middle" letterSpacing="1.5">
            DGT · ESPAÑA
          </text>

          {/* Gran 0 CERO */}
          <text
            x="100"
            y="112"
            fill="#FFFFFF"
            fontSize="82"
            fontWeight="900"
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
          >
            0
          </text>

          {/* Texto CERO EMISIONES */}
          <text x="100" y="136" fill="#FFFFFF" fontSize="11" fontWeight="800" textAnchor="middle" letterSpacing="1">
            EMISIONES
          </text>

          {/* Matrícula o código de barras simulado en la parte inferior */}
          <rect x="45" y="150" width="110" height="18" rx="3" fill="#FFFFFF" />
          <text x="100" y="163" fill="#003366" fontSize="10" fontWeight="900" textAnchor="middle" letterSpacing="2">
            {matricula || '0-EMISIONES'}
          </text>

          {/* QR mock a la derecha */}
          <rect x="156" y="85" width="22" height="22" fill="#FFFFFF" rx="2" />
          <rect x="160" y="89" width="6" height="6" fill="#003366" />
          <rect x="168" y="89" width="6" height="6" fill="#003366" />
          <rect x="160" y="97" width="6" height="6" fill="#003366" />
          <rect x="168" y="97" width="4" height="4" fill="#008ECE" />
        </svg>
      );

    case 'ECO':
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 200 200"
          className={`drop-shadow-lg select-none ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <clipPath id="circleClipEco">
              <circle cx="100" cy="100" r="96" />
            </clipPath>
          </defs>

          {/* Círculo base con mitad azul y mitad verde */}
          <g clipPath="url(#circleClipEco)">
            {/* Mitad izquierda azul */}
            <rect x="0" y="0" width="100" height="200" fill="#008ECE" />
            {/* Mitad derecha verde */}
            <rect x="100" y="0" width="100" height="200" fill="#00A651" />
          </g>

          <circle cx="100" cy="100" r="96" fill="none" stroke="#FFFFFF" strokeWidth="6" />
          <circle cx="100" cy="100" r="91" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />

          {/* Cabecera DGT */}
          <rect x="55" y="18" width="90" height="20" rx="4" fill="#003366" />
          <text x="100" y="32" fill="#FFFFFF" fontSize="11" fontWeight="800" textAnchor="middle" letterSpacing="1.5">
            DGT · ESPAÑA
          </text>

          {/* Palabra ECO grande */}
          <text
            x="100"
            y="114"
            fill="#FFFFFF"
            fontSize="54"
            fontWeight="900"
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
            letterSpacing="2"
          >
            ECO
          </text>

          {/* Subtítulo HÍBRIDO / GAS */}
          <text x="100" y="136" fill="#FFFFFF" fontSize="10" fontWeight="700" textAnchor="middle" letterSpacing="1">
            HÍBRIDO · GLP · GNC
          </text>

          {/* Matrícula simulada */}
          <rect x="45" y="150" width="110" height="18" rx="3" fill="#FFFFFF" />
          <text x="100" y="163" fill="#003366" fontSize="10" fontWeight="900" textAnchor="middle" letterSpacing="2">
            {matricula || 'DGT-ECO'}
          </text>

          {/* QR mock a la derecha */}
          <rect x="156" y="85" width="22" height="22" fill="#FFFFFF" rx="2" />
          <rect x="160" y="89" width="6" height="6" fill="#00A651" />
          <rect x="168" y="89" width="6" height="6" fill="#00A651" />
          <rect x="160" y="97" width="6" height="6" fill="#008ECE" />
        </svg>
      );

    case 'C':
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 200 200"
          className={`drop-shadow-lg select-none ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="100" cy="100" r="96" fill="#00A651" stroke="#FFFFFF" strokeWidth="6" />
          <circle cx="100" cy="100" r="91" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />

          {/* Cabecera DGT */}
          <rect x="55" y="18" width="90" height="20" rx="4" fill="#003366" />
          <text x="100" y="32" fill="#FFFFFF" fontSize="11" fontWeight="800" textAnchor="middle" letterSpacing="1.5">
            DGT · ESPAÑA
          </text>

          {/* Letra C */}
          <text
            x="100"
            y="118"
            fill="#FFFFFF"
            fontSize="84"
            fontWeight="900"
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
          >
            C
          </text>

          {/* Subtítulo EURO 4/5/6 */}
          <text x="100" y="136" fill="#FFFFFF" fontSize="10" fontWeight="700" textAnchor="middle" letterSpacing="1">
            COMBUSTIÓN VERDE
          </text>

          {/* Matrícula */}
          <rect x="45" y="150" width="110" height="18" rx="3" fill="#FFFFFF" />
          <text x="100" y="163" fill="#003366" fontSize="10" fontWeight="900" textAnchor="middle" letterSpacing="2">
            {matricula || 'DGT-CLASE-C'}
          </text>

          {/* QR mock */}
          <rect x="156" y="85" width="22" height="22" fill="#FFFFFF" rx="2" />
          <rect x="160" y="89" width="6" height="6" fill="#00A651" />
          <rect x="168" y="89" width="6" height="6" fill="#00A651" />
          <rect x="160" y="97" width="6" height="6" fill="#003366" />
        </svg>
      );

    case 'B':
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 200 200"
          className={`drop-shadow-lg select-none ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="100" cy="100" r="96" fill="#FFCC00" stroke="#FFFFFF" strokeWidth="6" />
          <circle cx="100" cy="100" r="91" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />

          {/* Cabecera DGT */}
          <rect x="55" y="18" width="90" height="20" rx="4" fill="#003366" />
          <text x="100" y="32" fill="#FFFFFF" fontSize="11" fontWeight="800" textAnchor="middle" letterSpacing="1.5">
            DGT · ESPAÑA
          </text>

          {/* Letra B */}
          <text
            x="100"
            y="118"
            fill="#111827"
            fontSize="84"
            fontWeight="900"
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
          >
            B
          </text>

          {/* Subtítulo EURO 3/4 */}
          <text x="100" y="136" fill="#111827" fontSize="10" fontWeight="800" textAnchor="middle" letterSpacing="1">
            ETIQUETA B
          </text>

          {/* Matrícula */}
          <rect x="45" y="150" width="110" height="18" rx="3" fill="#111827" />
          <text x="100" y="163" fill="#FFCC00" fontSize="10" fontWeight="900" textAnchor="middle" letterSpacing="2">
            {matricula || 'DGT-CLASE-B'}
          </text>

          {/* QR mock */}
          <rect x="156" y="85" width="22" height="22" fill="#111827" rx="2" />
          <rect x="160" y="89" width="6" height="6" fill="#FFCC00" />
          <rect x="168" y="89" width="6" height="6" fill="#FFCC00" />
          <rect x="160" y="97" width="6" height="6" fill="#FFCC00" />
        </svg>
      );

    case 'SIN_ETIQUETA':
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 200 200"
          className={`drop-shadow-lg select-none ${className}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Círculo base gris con anillo rojo de prohibición */}
          <circle cx="100" cy="100" r="96" fill="#1F2937" stroke="#EF4444" strokeWidth="8" />
          <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(239,68,68,0.3)" strokeWidth="1.5" />

          {/* Cabecera DGT */}
          <rect x="55" y="20" width="90" height="20" rx="4" fill="#991B1B" />
          <text x="100" y="34" fill="#FFFFFF" fontSize="11" fontWeight="800" textAnchor="middle" letterSpacing="1.5">
            DGT · CATEGORÍA A
          </text>

          {/* Letra A con barra diagonal roja */}
          <text
            x="100"
            y="114"
            fill="#EF4444"
            fontSize="68"
            fontWeight="900"
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
          >
            A
          </text>

          {/* Barra diagonal de prohibición */}
          <line x1="45" y1="55" x2="155" y2="145" stroke="#EF4444" strokeWidth="6" strokeLinecap="round" />

          {/* Subtítulo SIN DISTINTIVO */}
          <text x="100" y="138" fill="#F87171" fontSize="10" fontWeight="800" textAnchor="middle" letterSpacing="1">
            SIN DISTINTIVO AMBIENTAL
          </text>

          {/* Matrícula */}
          <rect x="45" y="152" width="110" height="18" rx="3" fill="#374151" stroke="#EF4444" strokeWidth="1" />
          <text x="100" y="165" fill="#EF4444" fontSize="10" fontWeight="900" textAnchor="middle" letterSpacing="2">
            RESTRINGIDO ZBE
          </text>
        </svg>
      );
  }
}
