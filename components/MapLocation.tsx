'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import Link from 'next/link';
import type { CityEvaluationResult, DgtBadgeType } from '@/lib/zbe-engine';
import {
  GEOLOCATION_UNSUPPORTED_MESSAGE,
  TIEMPO_ESPERA_UBICACION_MS,
  formatDistanceKm,
  geolocationErrorMessage,
  nearestZbe,
} from '@/lib/geo';
import type { NearestZbe } from '@/lib/geo';
import { zbeUiAccessTagClass, zbeUiBadgeSentenceLabel } from '@/lib/zbe-ui';

/** Zoom de ciudad al centrar el mapa en el usuario. */
const USER_LOCATION_ZOOM = 12;
const USER_MARKER_SIZE_PX = 16;
const USER_MARKER_ANCHOR_PX = USER_MARKER_SIZE_PX / 2;
const USER_MARKER_TOOLTIP = 'Tu ubicación';

export interface MapLocationState {
  isLocating: boolean;
  nearest: NearestZbe<CityEvaluationResult> | null;
  error: string | null;
}

const MAP_LOCATION_INITIAL_STATE: MapLocationState = { isLocating: false, nearest: null, error: null };

/**
 * "Mi ubicación": pide la posición solo cuando se llama a `locate`, centra el mapa y marca al usuario.
 * La posición no se guarda ni se envía: solo vive en el estado de esta ventana.
 */
export function useMapUserLocation(
  mapRef: MutableRefObject<any>,
  cities: readonly CityEvaluationResult[]
) {
  const markerRef = useRef<any>(null);
  const [state, setState] = useState<MapLocationState>(MAP_LOCATION_INITIAL_STATE);

  useEffect(
    () => () => {
      markerRef.current?.remove();
      markerRef.current = null;
    },
    []
  );

  const showPosition = useCallback(
    async (lat: number, lng: number) => {
      const L = await import('leaflet');
      const map = mapRef.current;
      if (!map) return;
      markerRef.current?.remove();
      const icon = L.divIcon({
        className: 'zbe-marker-user',
        html: '<div class="marker-core"></div>',
        iconSize: [USER_MARKER_SIZE_PX, USER_MARKER_SIZE_PX],
        iconAnchor: [USER_MARKER_ANCHOR_PX, USER_MARKER_ANCHOR_PX],
      });
      markerRef.current = L.marker([lat, lng], { icon }).bindTooltip(USER_MARKER_TOOLTIP).addTo(map);
      map.flyTo([lat, lng], USER_LOCATION_ZOOM, { duration: 0.8 });
      setState({ isLocating: false, nearest: nearestZbe(lat, lng, cities), error: null });
    },
    [mapRef, cities]
  );

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState({ isLocating: false, nearest: null, error: GEOLOCATION_UNSUPPORTED_MESSAGE });
      return;
    }
    setState({ isLocating: true, nearest: null, error: null });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void showPosition(position.coords.latitude, position.coords.longitude);
      },
      (positionError) => {
        setState({ isLocating: false, nearest: null, error: geolocationErrorMessage(positionError.code) });
      },
      { enableHighAccuracy: false, timeout: TIEMPO_ESPERA_UBICACION_MS }
    );
  }, [showPosition]);

  return { state, locate };
}

interface MapLocationNoticeProps {
  state: MapLocationState;
  /** Etiqueta elegida en la home; sin ella no se muestra el acceso. */
  badge: DgtBadgeType | null;
}

/** Aviso bajo la barra del mapa: error, búsqueda en curso o ZBE más cercana. */
export function MapLocationNotice({ state, badge }: MapLocationNoticeProps) {
  if (state.error) {
    return (
      <div role="alert" className="border-b border-negative-line bg-negative-soft px-3 py-2 text-xs text-negative">
        {state.error}
      </div>
    );
  }
  if (state.isLocating) {
    return (
      <div role="status" className="border-b border-line bg-elevated px-3 py-2 text-xs text-secondary">
        Buscando tu ubicación…
      </div>
    );
  }
  if (!state.nearest) return null;

  const { city, distanceKm } = state.nearest;
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-elevated px-3 py-2 text-xs text-fg">
      <span>
        ZBE más cercana: <strong>{city.cityName}</strong>, a {formatDistanceKm(distanceKm)} km
      </span>
      {badge && (
        <span className={zbeUiAccessTagClass(city.status)}>
          {zbeUiBadgeSentenceLabel(badge)}: {city.statusLabel}
        </span>
      )}
      <Link href={`/${city.slug}`} className="inline-flex items-center min-h-11 text-accent hover:text-accent-hover underline font-semibold">
        Ver ficha de {city.cityName}
      </Link>
    </div>
  );
}
