'use client';

import React, { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { MAP_TILE_SOURCES, getTileLayerOptions } from '@/lib/map-config';
import { PERIMETER_UNAVAILABLE_TEXT } from '@/lib/city-verification';
import { parsePolygonPoints } from '@/lib/polygon-quality';
import { zbeUiReadMapColor } from '@/lib/zbe-ui';
import type { ZbeMapColorKey } from '@/lib/zbe-ui';

interface CityMiniMapProps {
  city: {
    lat: number;
    lng: number;
    name?: string;
    cityName?: string;
    polygon?: [number, number][] | string | null;
    /** FeatureCollection con las entidades del perímetro oficial; tiene prioridad sobre `polygon`. */
    geoJSON?: any;
    /** Estado de acceso, o 'neutral' si aún no hay etiqueta elegida. */
    status?: ZbeMapColorKey;
    /** Enlace municipal a mostrar cuando no hay perímetro; solo si la fuente es del ayuntamiento. */
    officialUrl?: string | null;
    sourceUrl?: string | null;
    verificationStatus?: 'verified' | 'pending' | null;
  };
  height?: string;
  className?: string;
}

/** Zoom del mapa cuando no hay perímetro que encuadrar. */
const MINI_MAP_NO_PERIMETER_ZOOM = 13;

const HTTP_URL_PATTERN = new RegExp('^https?://', 'i');

/** Enlaces solo http(s): evita inyectar esquemas como javascript: en el popup. */
function buildUnavailablePopupHtml(officialUrl: string | null): string {
  const link =
    officialUrl && HTTP_URL_PATTERN.test(officialUrl)
      ? `<br/><a href="${encodeURI(officialUrl)}" target="_blank" rel="nofollow noopener noreferrer">Ver fuente municipal</a>`
      : '';
  return `${PERIMETER_UNAVAILABLE_TEXT}${link}`;
}

export function CityMiniMap({ city, height = '260px', className = '' }: CityMiniMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const officialUrl =
    city.officialUrl ?? (city.verificationStatus === 'verified' ? (city.sourceUrl ?? null) : null);

  useEffect(() => {
    let isMounted = true;
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Limpiar mapa previo si existe
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [city.lat, city.lng],
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: false, // Evitar scroll accidental dentro de la vista detalle
        attributionControl: true,
      });

      L.tileLayer(MAP_TILE_SOURCES.osm.url, getTileLayerOptions('osm')).addTo(map);

      // Parsear polígono
      const polygonCoords = parsePolygonPoints(city.polygon);

      const status: ZbeMapColorKey = city.status ?? 'allowed';
      const color = zbeUiReadMapColor(status);

      const layerStyle = {
        color: color,
        weight: 2.5,
        opacity: 0.9,
        fillColor: color,
        fillOpacity: 0.2,
      };

      // Si tiene geoJSON o polígono, dibujarlo y ajustar vista
      if (city.geoJSON || polygonCoords.length > 2) {
        const polyLayer = city.geoJSON
          ? L.geoJSON(city.geoJSON, { style: () => layerStyle }).addTo(map)
          : L.polygon(polygonCoords, layerStyle).addTo(map);

        map.fitBounds(polyLayer.getBounds(), {
          padding: [25, 25],
          maxZoom: 14,
        });
      } else {
        // Sin perímetro real no se dibuja ninguna zona: solo el marcador central.
        map.setView([city.lat, city.lng], MINI_MAP_NO_PERIMETER_ZOOM);
      }

      // Marcador central
      const markerIcon = L.divIcon({
        className: `zbe-marker-${status}`,
        html: '<div class="marker-core"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([city.lat, city.lng], { icon: markerIcon }).addTo(map);
      if (!city.geoJSON && polygonCoords.length <= 2) {
        marker.bindPopup(buildUnavailablePopupHtml(officialUrl)).openPopup();
      }

      mapInstanceRef.current = map;
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [city]);

  const hasPolygon = Boolean(city.geoJSON) || parsePolygonPoints(city.polygon).length > 2;
  const cityLabel = city.cityName || city.name || '';

  return (
    <div
      className={`relative isolate w-full rounded-xl overflow-hidden border border-line shadow-sm ${className}`}
      style={{ height }}
    >
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute bottom-2 left-2 z-[400] bg-surface/90 backdrop-blur px-2 py-0.5 rounded text-[10px] font-semibold text-secondary border border-line pointer-events-none">
        {hasPolygon ? `Perímetro ZBE ${cityLabel}` : PERIMETER_UNAVAILABLE_TEXT}
      </div>
    </div>
  );
}
