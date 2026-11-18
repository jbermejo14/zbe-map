'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CityEvaluationResult, ZbeAccessStatus } from '@/lib/zbe-engine';
import 'leaflet/dist/leaflet.css';
import {
  MAP_DEFAULT_LAYER,
  MAP_TILE_SOURCES,
  getTileLayerOptions,
  type MapLayerType,
} from '@/lib/map-config';
import { zbeUiReadMapColor } from '@/lib/zbe-ui';
import { Search, RotateCcw, Layers, Navigation } from 'lucide-react';

interface SpainZbeMapProps {
  cities: CityEvaluationResult[];
  selectedCity: CityEvaluationResult | null;
  onCitySelect: (city: CityEvaluationResult) => void;
  statusFilter: 'all' | ZbeAccessStatus;
  onFilterChange: (filter: 'all' | ZbeAccessStatus) => void;
}

export function SpainZbeMap({
  cities,
  selectedCity,
  onCitySelect,
  statusFilter,
  onFilterChange,
}: SpainZbeMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const currentTileLayersRef = useRef<any[]>([]);
  const markersRef = useRef<{ [cityId: string]: any }>({});
  const geojsonLayersRef = useRef<{ [cityId: string]: any }>({});
  const [searchCityQuery, setSearchCityQuery] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [mapLayer, setMapLayer] = useState<MapLayerType>(MAP_DEFAULT_LAYER);
  const [showPolygons, setShowPolygons] = useState(true);

  // Filtrar ciudades
  const filteredCities = cities.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchCityQuery.trim()) {
      const q = searchCityQuery.toLowerCase().trim();
      return (
        c.cityName.toLowerCase().includes(q) ||
        c.province.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Renderizar marcadores y polígonos GeoJSON
  const renderMapElements = useCallback(
    (map: any, L: any, list: CityEvaluationResult[], displayPolygons: boolean) => {
      // 1. Limpiar marcadores antiguos
      Object.values(markersRef.current).forEach((marker: any) => {
        marker.remove();
      });
      markersRef.current = {};

      // 2. Limpiar capas GeoJSON antiguas
      Object.values(geojsonLayersRef.current).forEach((layer: any) => {
        layer.remove();
      });
      geojsonLayersRef.current = {};

      list.forEach((city) => {
        const isRestricted = city.status === 'restricted';
        const isBanned = city.status === 'banned';

        const strokeColor = zbeUiReadMapColor(city.status);

        // A. Marcador central
        let markerClass = 'zbe-marker-allowed';
        if (isRestricted) markerClass = 'zbe-marker-restricted';
        if (isBanned) markerClass = 'zbe-marker-banned';

        const customIcon = L.divIcon({
          className: markerClass,
          html: `<div class="marker-core"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const marker = L.marker([city.lat, city.lng], { icon: customIcon });

        const tooltipHtml = `
          <div class="zbe-tip">
            <div class="zbe-tip-title">${city.cityName}</div>
            <div class="zbe-tip-status zbe-status-${city.status}">${city.statusLabel}</div>
            <div class="zbe-tip-detail">${city.perimeterName || 'Límite de Zona ZBE'}</div>
          </div>
        `;

        marker.bindTooltip(tooltipHtml, {
          direction: 'top',
          offset: [0, -8],
        });

        marker.on('click', () => {
          onCitySelect(city);
          const geoLayer = geojsonLayersRef.current[city.cityId];
          if (geoLayer && typeof geoLayer.getBounds === 'function') {
            map.fitBounds(geoLayer.getBounds(), { padding: [60, 60], maxZoom: 13 });
            geoLayer.openPopup();
          } else if (city.polygon && city.polygon.length > 0) {
            map.fitBounds(L.latLngBounds(city.polygon), { padding: [60, 60], maxZoom: 13 });
          } else {
            map.flyTo([city.lat, city.lng], 13, { duration: 0.8 });
          }
        });

        marker.addTo(map);
        markersRef.current[city.cityId] = marker;

        // B. Trazado GeoJSON de la ZBE
        if (displayPolygons && (city.geoJSON || (city.polygon && city.polygon.length > 2))) {
          let geoData = city.geoJSON;

          // Si no tiene geoJSON formateado pero sí polygon [lat, lng], lo adaptamos a FeatureCollection GeoJSON
          if (!geoData && city.polygon) {
            const coords = city.polygon.map(([lat, lng]: [number, number]) => [lng, lat]);
            if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
              coords.push(coords[0]);
            }
            geoData = {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: {
                    nombre: `Zona de Bajas Emisiones (ZBE) ${city.cityName}`,
                    descripcion: city.summary,
                  },
                  geometry: {
                    type: 'Polygon',
                    coordinates: [coords],
                  },
                },
              ],
            };
          }

          if (geoData) {
            const capaZBE = L.geoJSON(geoData, {
              style: {
                color: strokeColor, // Color del borde
                weight: 2.5, // Grosor perimetral
                opacity: 0.9,
                fillColor: strokeColor,
                fillOpacity: 0.22, // Transparencia para leer las calles debajo
                dashArray: isRestricted ? '5, 5' : undefined, // Línea discontinua opcional
              },
              onEachFeature: function (feature: any, layer: any) {
                const nombre = feature.properties?.nombre || `ZBE ${city.cityName}`;
                const desc = feature.properties?.descripcion || city.summary;
                const streetsHtml =
                  city.streets && city.streets.length > 0
                    ? `<div class="zbe-popup-streets">
                        <strong>Vías perimetrales:</strong><br/>${city.streets.slice(0, 4).join(' &bull; ')}
                       </div>`
                    : '';

                layer.bindPopup(
                  `<div class="zbe-popup">
                    <strong class="zbe-popup-title">${nombre}</strong><br/>
                    <span class="zbe-popup-status zbe-status-${city.status}">
                      ${city.statusLabel} (${city.fineAmount} € sanción)
                    </span><br/>
                    <div class="zbe-popup-desc">${desc}</div>
                    ${streetsHtml}
                  </div>`
                );

                layer.on('click', () => {
                  onCitySelect(city);
                  map.fitBounds(layer.getBounds(), { padding: [30, 30] });
                });

                layer.on('mouseover', () => {
                  layer.setStyle({ weight: 4, opacity: 1 });
                });
                layer.on('mouseout', () => {
                  layer.setStyle({ weight: 2.5, opacity: 0.9 });
                });
              },
            }).addTo(map);

            geojsonLayersRef.current[city.cityId] = capaZBE;
          }
        }
      });
    },
    [onCitySelect]
  );

  // Aplicar la capa base seleccionada (OpenStreetMap por defecto, en claro y oscuro)
  const applyTileLayer = useCallback((map: any, L: any, layer: MapLayerType) => {
    currentTileLayersRef.current.forEach((tileLayer) => tileLayer.remove());
    const nextLayer = L.tileLayer(MAP_TILE_SOURCES[layer].url, getTileLayerOptions(layer));
    nextLayer.addTo(map);
    currentTileLayersRef.current = [nextLayer];
  }, []);

  // Inicializar Leaflet map
  useEffect(() => {
    let isMounted = true;
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      if ((mapContainerRef.current as any)._leaflet_id) {
        (mapContainerRef.current as any)._leaflet_id = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [40.2, -3.7],
        zoom: 6,
        minZoom: 5,
        maxZoom: 20,
        zoomControl: false,
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      applyTileLayer(map, L, mapLayer);

      mapInstanceRef.current = map;
      setMapReady(true);
      renderMapElements(map, L, filteredCities, showPolygons);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Actualizar capa base
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      if (mapInstanceRef.current) {
        applyTileLayer(mapInstanceRef.current, L, mapLayer);
      }
    });
  }, [mapLayer, mapReady, applyTileLayer]);

  // Actualizar elementos
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      if (mapInstanceRef.current) {
        renderMapElements(mapInstanceRef.current, L, filteredCities, showPolygons);
      }
    });
  }, [filteredCities, showPolygons, mapReady, renderMapElements]);

  // Si cambia la ciudad seleccionada, enfocar a su capa GeoJSON con encuadre proporcionado
  useEffect(() => {
    if (selectedCity && mapInstanceRef.current) {
      import('leaflet').then((L) => {
        const geoLayer = geojsonLayersRef.current[selectedCity.cityId];
        if (geoLayer && typeof geoLayer.getBounds === 'function') {
          mapInstanceRef.current.fitBounds(geoLayer.getBounds(), { padding: [60, 60], maxZoom: 13 });
          geoLayer.openPopup();
        } else if (selectedCity.polygon && selectedCity.polygon.length > 0) {
          const bounds = L.latLngBounds(selectedCity.polygon);
          mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 13 });
        } else {
          mapInstanceRef.current.flyTo([selectedCity.lat, selectedCity.lng], 13, { duration: 0.8 });
        }
      });
    }
  }, [selectedCity]);

  // Accesos directos para probar Zaragoza o Huesca
  const focusZaragoza = () => {
    const zgza = cities.find((c) => c.cityId === 'zaragoza');
    if (zgza) {
      onCitySelect(zgza);
    }
  };

  const focusHuesca = () => {
    const hsc = cities.find((c) => c.cityId === 'huesca');
    if (hsc) {
      onCitySelect(hsc);
    }
  };

  const resetViewPeninsula = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([40.2, -3.7], 6, { duration: 0.8 });
    }
  };

  const focusCanarias = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([28.3, -15.8], 8, { duration: 0.8 });
    }
  };

  return (
    <div className="relative isolate flex flex-col h-full w-full rounded-xl overflow-hidden border border-line bg-surface shadow-lg">
      {/* Barra de control superior */}
      <div className="z-10 flex flex-wrap items-center justify-between gap-2.5 p-3 bg-surface border-b border-line">
        {/* Filtros de estado */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-fg text-bg'
                : 'bg-elevated text-muted hover:text-fg border border-line'
            }`}
          >
            Todas ({cities.length})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('allowed')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              statusFilter === 'allowed'
                ? 'bg-solid-positive text-on-btn'
                : 'bg-elevated text-positive border border-line'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-positive" />
            Libre ({cities.filter((c) => c.status === 'allowed').length})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('restricted')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              statusFilter === 'restricted'
                ? 'bg-solid-warning text-on-btn'
                : 'bg-elevated text-warning border border-line'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-warning" />
            Restringido ({cities.filter((c) => c.status === 'restricted').length})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('banned')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              statusFilter === 'banned'
                ? 'bg-solid-negative text-on-btn'
                : 'bg-elevated text-negative border border-line'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-negative" />
            Prohibido ({cities.filter((c) => c.status === 'banned').length})
          </button>
        </div>

        {/* Accesos directos de prueba y controles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón directo para probar Zaragoza */}
          <button
            type="button"
            onClick={focusZaragoza}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold bg-btn text-on-btn hover:bg-btn-hover transition-colors shadow-sm"
            title="Ver trazado GeoJSON de la ZBE Casco Histórico de Zaragoza"
          >
            <Navigation className="h-3 w-3" />
            <span>Zaragoza</span>
          </button>

          {/* Botón directo para probar Huesca */}
          <button
            type="button"
            onClick={focusHuesca}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-elevated text-secondary hover:text-fg border border-line transition-colors"
            title="Ver trazado ZBE Huesca (Cosos)"
          >
            <span>Huesca</span>
          </button>

          {/* Toggle de Líneas GeoJSON */}
          <button
            type="button"
            onClick={() => setShowPolygons(!showPolygons)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${
              showPolygons
                ? 'bg-accent-soft border-accent-line text-accent'
                : 'bg-elevated border-line text-muted hover:text-fg'
            }`}
            title="Mostrar u ocultar capas GeoJSON de las ZBE"
          >
            <Layers className="h-3.5 w-3.5 text-accent" />
            <span>GeoJSON</span>
          </button>

          {/* Selector de capa de mapa */}
          <div className="flex items-center bg-elevated rounded border border-line p-0.5 text-xs">
            {(Object.keys(MAP_TILE_SOURCES) as MapLayerType[]).map((layer) => (
              <button
                key={layer}
                type="button"
                onClick={() => setMapLayer(layer)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  mapLayer === layer ? 'bg-btn text-on-btn' : 'text-muted hover:text-secondary'
                }`}
                title={MAP_TILE_SOURCES[layer].title}
              >
                {MAP_TILE_SOURCES[layer].label}
              </button>
            ))}
          </div>

          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              value={searchCityQuery}
              onChange={(e) => setSearchCityQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-24 sm:w-28 rounded border border-line bg-elevated py-1 pl-8 pr-2 text-xs text-fg placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>

          <button
            onClick={resetViewPeninsula}
            title="Centrar España"
            className="rounded border border-line bg-elevated p-1 text-muted hover:text-fg transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Contenedor del Mapa Leaflet */}
      <div className="relative flex-1 w-full min-h-[580px] h-[580px]">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

        {/* Indicador de trazado GeoJSON */}
        <div className="absolute top-3 left-3 z-20 pointer-events-none bg-surface/90 border border-line rounded px-2.5 py-1 text-[11px] text-secondary flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span>Trazado GeoJSON de cada ZBE &bull; Clic para ver delimitación exacta</span>
        </div>

        {/* Leyenda simple */}
        <div className="absolute bottom-3 left-3 z-20 rounded-lg bg-surface/90 border border-line p-3 shadow-md pointer-events-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
            Zonas ZBE (GeoJSON)
          </span>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 text-positive">
              <span className="h-2 w-4 rounded-sm bg-positive-soft border border-positive-line inline-block" />
              <span>Zona Permitida</span>
            </div>
            <div className="flex items-center gap-2 text-warning">
              <span className="h-2 w-4 rounded-sm bg-warning-soft border border-warning inline-block border-dashed" />
              <span>Zona Restringida (Parking)</span>
            </div>
            <div className="flex items-center gap-2 text-negative">
              <span className="h-2 w-4 rounded-sm bg-negative-soft border border-negative-line inline-block" />
              <span>Zona Prohibida</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
