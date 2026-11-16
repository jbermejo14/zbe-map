'use client';

import React, { useEffect, useRef } from 'react';
import { CityEvaluationResult } from '@/lib/zbe-engine';

interface CityMiniMapProps {
  city: {
    lat: number;
    lng: number;
    name?: string;
    cityName?: string;
    polygon?: [number, number][] | string | null;
    status?: string;
  };
  height?: string;
  className?: string;
}

export function CityMiniMap({ city, height = '260px', className = '' }: CityMiniMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

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
      const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

      const map = L.map(mapContainerRef.current, {
        center: [city.lat, city.lng],
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: false, // Evitar scroll accidental dentro de la vista detalle
        attributionControl: false,
      });

      L.tileLayer(tileUrl, {
        maxZoom: 18,
        subdomains: 'abcd',
      }).addTo(map);

      // Parsear polígono
      let polygonCoords: [number, number][] = [];
      if (city.polygon) {
        if (typeof city.polygon === 'string') {
          try {
            polygonCoords = JSON.parse(city.polygon);
          } catch {
            polygonCoords = [];
          }
        } else if (Array.isArray(city.polygon)) {
          polygonCoords = city.polygon;
        }
      }

      const status = city.status || 'allowed';
      const color =
        status === 'allowed' ? '#16a34a' : status === 'restricted' ? '#ea580c' : '#e63946';

      // Si tiene polígono, dibujarlo y ajustar vista
      if (polygonCoords.length > 2) {
        const polyLayer = L.polygon(polygonCoords, {
          color: color,
          weight: 2.5,
          opacity: 0.9,
          fillColor: color,
          fillOpacity: 0.2,
        }).addTo(map);

        map.fitBounds(polyLayer.getBounds(), {
          padding: [25, 25],
          maxZoom: 14,
        });
      } else {
        // Círculo aproximado si no tiene polígono definido
        const circle = L.circle([city.lat, city.lng], {
          radius: 900,
          color: color,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.2,
        }).addTo(map);

        map.fitBounds(circle.getBounds(), {
          padding: [25, 25],
          maxZoom: 14,
        });
      }

      // Marcador central
      const markerIcon = L.divIcon({
        className: 'zbe-mini-marker',
        html: `<div style="width: 12px; height: 12px; border-radius: 50%; background: ${color}; border: 2px solid #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.4);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      L.marker([city.lat, city.lng], { icon: markerIcon }).addTo(map);

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

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden border border-slate-200 dark:border-neutral-800 shadow-sm ${className}`}
      style={{ height }}
    >
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute bottom-2 left-2 z-[400] bg-white/90 dark:bg-neutral-900/90 backdrop-blur px-2 py-0.5 rounded text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 border border-slate-200 dark:border-neutral-800 pointer-events-none">
        Perímetro ZBE {city.cityName || city.name || ''}
      </div>
    </div>
  );
}
