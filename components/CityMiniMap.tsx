'use client';

import React, { useEffect, useRef } from 'react';
import { getMapTileConfig, MAP_TILE_MAX_ZOOM, MAP_TILE_SUBDOMAINS } from '@/lib/map-config';
import { PERIMETER_UNAVAILABLE_TEXT } from '@/lib/city-verification';
import { parsePolygonPoints } from '@/lib/polygon-quality';

interface CityMiniMapProps {
  city: {
    lat: number;
    lng: number;
    name?: string;
    cityName?: string;
    polygon?: [number, number][] | string | null;
    geoJSON?: any;
    status?: string;
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

/** Enlaces solo http(s): evita inyectar esquemas como javascript: en el popup. */
function buildUnavailablePopupHtml(officialUrl: string | null): string {
  const link =
    officialUrl && /^https?:///i.test(officialUrl)
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

      const isDark = document.documentElement.classList.contains('dark');
      const tiles = getMapTileConfig();
      const tileUrl = isDark ? tiles.darkUrl : tiles.lightUrl;

      const map = L.map(mapContainerRef.current, {
        center: [city.lat, city.lng],
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: false, // Evitar scroll accidental dentro de la vista detalle
        attributionControl: true,
      });

      L.tileLayer(tileUrl, {
        maxZoom: MAP_TILE_MAX_ZOOM,
        subdomains: MAP_TILE_SUBDOMAINS,
        attribution: tiles.attribution,
      }).addTo(map);

      // Parsear polígono
      const polygonCoords = parsePolygonPoints(city.polygon);

      const status = city.status || 'allowed';
      const color =
        status === 'allowed' ? '#16a34a' : status === 'restricted' ? '#ea580c' : '#e63946';

      // Si tiene GeoJSON oficial o polígono, dibujarlo y ajustar vista
      if (city.geoJSON) {
        const geoLayer = L.geoJSON(city.geoJSON, {
          style: (feature: any) => ({
            color: feature?.properties?.fase === 'FASE 2' ? '#ea580c' : color,
            weight: 2.5,
            opacity: 0.9,
            fillColor: feature?.properties?.fase === 'FASE 2' ? '#f97316' : color,
            fillOpacity: feature?.properties?.fase === 'FASE 2' ? 0.16 : 0.25,
            dashArray: feature?.properties?.fase === 'FASE 2' ? '5, 5' : undefined,
          }),
        }).addTo(map);

        map.fitBounds(geoLayer.getBounds(), {
          padding: [25, 25],
          maxZoom: 15,
        });
      } else if (polygonCoords.length > 2) {
        const polyLayer = L.polygon(polygonCoords, {
          color: color,
          weight: 2.5,
          opacity: 0.9,
          fillColor: color,
          fillOpacity: 0.2,
        }).addTo(map);

        map.fitBounds(polyLayer.getBounds(), {
          padding: [25, 25],
          maxZoom: 15,
        });
      } else {
        // Sin perímetro real no se dibuja ninguna zona: solo el marcador central.
        map.setView([city.lat, city.lng], MINI_MAP_NO_PERIMETER_ZOOM);
      }

      // Marcador central
      const markerIcon = L.divIcon({
        className: 'zbe-mini-marker',
        html: `<div style="width: 12px; height: 12px; border-radius: 50%; background: ${color}; border: 2px solid #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.4);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      const marker = L.marker([city.lat, city.lng], { icon: markerIcon }).addTo(map);
      if (polygonCoords.length <= 2) {
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

  const hasPolygon = (city.geoJSON && city.geoJSON.features?.length > 0) || parsePolygonPoints(city.polygon).length > 2;
  const cityLabel = city.cityName || city.name || '';

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden border border-slate-200 dark:border-neutral-800 shadow-sm ${className}`}
      style={{ height }}
    >
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute bottom-2 left-2 z-[400] bg-white/90 dark:bg-neutral-900/90 backdrop-blur px-2 py-0.5 rounded text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 border border-slate-200 dark:border-neutral-800 pointer-events-none">
        {hasPolygon ? `Perímetro ZBE ${cityLabel}` : PERIMETER_UNAVAILABLE_TEXT}
      </div>
    </div>
  );
}
