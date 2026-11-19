'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CityEvaluationResult, DgtBadgeType, ZbeAccessStatus } from '@/lib/zbe-engine';
import 'leaflet/dist/leaflet.css';
import {
  MAP_DEFAULT_LAYER,
  MAP_TILE_SOURCES,
  getTileLayerOptions,
  type MapLayerType,
} from '@/lib/map-config';
import { isApproximatePerimeter } from '@/lib/city-verification';
import { perimeterMarkerPosition } from '@/lib/geo';
import { visibleMapCities } from '@/lib/map-cities';
import {
  MAP_APPROXIMATE_DASH_ARRAY,
  MAP_APPROXIMATE_LEGEND_TEXT,
  MAP_IN_PROGRESS_LEGEND_TEXT,
  MAP_RESTRICTED_DASH_ARRAY,
  isZbeInProgress,
  zbeUiReadMapColor,
} from '@/lib/zbe-ui';
import { MapLocationNotice, useMapUserLocation } from './MapLocation';
import { Search, RotateCcw, LocateFixed } from 'lucide-react';

/** Nombre accesible fijo del conmutador: el estado lo anuncia `aria-pressed`. */
const IN_PROGRESS_BUTTON_LABEL = 'Ciudades con la ZBE en tramitación';

interface SpainZbeMapProps {
  /** Ciudades ya filtradas con `visibleMapCities`; el mapa no vuelve a filtrar por tramitación. */
  cities: CityEvaluationResult[];
  /** Etiqueta elegida; sin ella los perímetros se pintan en el color neutro, sin estado de acceso. */
  badge: DgtBadgeType | null;
  selectedCity: CityEvaluationResult | null;
  onCitySelect: (city: CityEvaluationResult) => void;
  statusFilter: 'all' | ZbeAccessStatus;
  onFilterChange: (filter: 'all' | ZbeAccessStatus) => void;
  /** Si es true, se muestran también las ciudades con la ZBE en tramitación. */
  showInProgress: boolean;
  /** Ciudades en tramitación del conjunto completo (también las ocultas): es el número del botón. La barra de recuentos solo cuenta las visibles. */
  inProgressCount: number;
  onShowInProgressChange: (show: boolean) => void;
}

/** Un perímetro aproximado se dibuja con puntos aunque la ciudad esté restringida. */
function dashArrayForCity(isRestricted: boolean, isApproximate: boolean): string | undefined {
  if (isApproximate) return MAP_APPROXIMATE_DASH_ARRAY;
  return isRestricted ? MAP_RESTRICTED_DASH_ARRAY : undefined;
}

export function SpainZbeMap({
  cities,
  badge,
  selectedCity,
  onCitySelect,
  statusFilter,
  onFilterChange,
  showInProgress,
  inProgressCount,
  onShowInProgressChange,
}: SpainZbeMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const currentTileLayersRef = useRef<any[]>([]);
  const markersRef = useRef<{ [cityId: string]: any }>({});
  const geojsonLayersRef = useRef<{ [cityId: string]: any }>({});
  const [searchCityQuery, setSearchCityQuery] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [mapLayer, setMapLayer] = useState<MapLayerType>(MAP_DEFAULT_LAYER);
  const accessKnown = badge !== null;
  const activeFilter = accessKnown ? statusFilter : 'all';
  // "Mi ubicación" solo mira el conmutador: la ciudad seleccionada no cuenta como ZBE más cercana.
  const locationCities = visibleMapCities(cities, { showInProgress, selectedCityId: null });
  const { state: locationState, locate } = useMapUserLocation(mapInstanceRef, locationCities);

  // Filtrar ciudades
  const filteredCities = cities.filter((c) => {
    if (activeFilter !== 'all' && c.status !== activeFilter) return false;
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

  const hasApproximatePerimeter = filteredCities.some((c) => isApproximatePerimeter(c.perimeterSource));
  const hasInProgressMarker = filteredCities.some(isZbeInProgress);

  // Renderizar marcadores y perímetros
  const renderMapElements = useCallback(
    (map: any, L: any, list: CityEvaluationResult[]) => {
      // 1. Limpiar marcadores antiguos
      Object.values(markersRef.current).forEach((marker: any) => {
        marker.remove();
      });
      markersRef.current = {};

      // 2. Limpiar perímetros antiguos
      Object.values(geojsonLayersRef.current).forEach((layer: any) => {
        layer.remove();
      });
      geojsonLayersRef.current = {};

      list.forEach((city) => {
        const colorKey = accessKnown ? city.status : 'neutral';
        const dashArray = dashArrayForCity(colorKey === 'restricted', isApproximatePerimeter(city.perimeterSource));
        const strokeColor = zbeUiReadMapColor(colorKey);

        // A. Marcador central
        const markerClass = isZbeInProgress(city)
          ? `zbe-marker-${colorKey} zbe-marker-in-progress`
          : `zbe-marker-${colorKey}`;

        const customIcon = L.divIcon({
          className: markerClass,
          html: `<div class="marker-core"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const marker = L.marker(perimeterMarkerPosition(city), {
          icon: customIcon,
          title: city.cityName,
          alt: city.cityName,
        });

        const tooltipHtml = `
          <div class="zbe-tip">
            <div class="zbe-tip-title">${city.cityName}</div>
            ${accessKnown ? `<div class="zbe-tip-status zbe-status-${city.status}">${city.statusLabel}</div>` : ''}
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
            map.flyTo(perimeterMarkerPosition(city), 13, { duration: 0.8 });
          }
        });

        marker.addTo(map);
        // Leaflet expone el icono como botón; sin aria-label no tendría nombre accesible.
        marker.getElement()?.setAttribute('aria-label', city.cityName);
        markersRef.current[city.cityId] = marker;

        // B. Perímetro de la ZBE
        if (city.geoJSON || (city.polygon && city.polygon.length > 2)) {
          let geoData = city.geoJSON;

          // Si no tiene geoJSON pero sí polygon [lat, lng], se adapta a una FeatureCollection
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
                dashArray, // Punteada si es aproximada; discontinua si está restringida
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
                    <span class="zbe-popup-status zbe-status-${colorKey}">
                      ${accessKnown ? `${city.statusLabel} · ` : ''}${city.fineAmount} € de sanción
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
    [onCitySelect, accessKnown]
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
      renderMapElements(map, L, filteredCities);
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
        renderMapElements(mapInstanceRef.current, L, filteredCities);
      }
    });
  }, [filteredCities, mapReady, renderMapElements]);

  // Si cambia la ciudad seleccionada (no su etiqueta), encuadrar su perímetro
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
          mapInstanceRef.current.flyTo(perimeterMarkerPosition(selectedCity), 13, { duration: 0.8 });
        }
      });
    }
  }, [selectedCity?.cityId]);

  const resetViewPeninsula = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([40.2, -3.7], 6, { duration: 0.8 });
    }
  };

  return (
    <div className="relative isolate flex flex-col h-full w-full rounded-xl overflow-hidden border border-line bg-surface shadow-lg">
      {/* Barra de control superior */}
      <div className="z-10 flex flex-wrap items-center justify-between gap-2.5 p-3 bg-surface border-b border-line">
        {/* Filtros de estado: solo con etiqueta elegida, porque sin ella no hay acceso que filtrar */}
        {accessKnown ? (
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
        ) : (
          <span className="text-xs font-semibold text-secondary">{cities.length} ZBE en España</span>
        )}

        {/* Accesos directos de prueba y controles */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onShowInProgressChange(!showInProgress)}
            aria-pressed={showInProgress}
            aria-label={`${IN_PROGRESS_BUTTON_LABEL} (${inProgressCount})`}
            className={`min-h-11 px-3 rounded text-xs font-medium transition-colors ${
              showInProgress ? 'bg-fg text-bg' : 'bg-elevated text-muted hover:text-fg border border-line'
            }`}
          >
            {showInProgress ? 'Ocultar' : 'Mostrar'} en tramitación ({inProgressCount})
          </button>

          <button
            type="button"
            onClick={locate}
            disabled={locationState.isLocating}
            aria-label="Mi ubicación: centrar el mapa en tu posición y buscar la ZBE más cercana"
            className="flex items-center gap-1.5 min-h-11 px-3 rounded text-xs font-bold bg-btn text-on-btn hover:bg-btn-hover transition-colors shadow-sm disabled:opacity-50"
          >
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
            <span>Mi ubicación</span>
          </button>

          {/* Selector de capa de mapa */}
          <div className="flex items-center bg-elevated rounded border border-line p-0.5 text-xs">
            {(Object.keys(MAP_TILE_SOURCES) as MapLayerType[]).map((layer) => (
              <button
                key={layer}
                type="button"
                onClick={() => setMapLayer(layer)}
                className={`min-h-11 px-3 rounded text-[11px] font-semibold transition-colors ${
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
              aria-label="Buscar una ciudad en el mapa"
              className="w-28 min-h-11 rounded border border-line bg-elevated py-1 pl-8 pr-2 text-xs text-fg placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={resetViewPeninsula}
            title="Centrar España"
            aria-label="Centrar el mapa en España"
            className="inline-flex items-center justify-center min-h-11 min-w-11 rounded border border-line bg-elevated text-muted hover:text-fg transition-colors"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <MapLocationNotice state={locationState} badge={badge} />

      {/* Contenedor del Mapa Leaflet */}
      <div className="relative flex-1 w-full min-h-[580px] h-[580px]">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

        {/* Indicación de uso */}
        <div className="absolute top-3 left-3 z-20 pointer-events-none bg-surface/90 border border-line rounded px-2.5 py-1 text-[11px] text-secondary flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span>Haz clic en una ZBE para ver su perímetro</span>
        </div>

        {/* Leyenda simple */}
        <div className="absolute bottom-3 left-3 z-20 rounded-lg bg-surface/90 border border-line p-3 shadow-md pointer-events-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
            Zonas ZBE
          </span>
          {accessKnown ? (
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
          ) : (
            <div className="flex items-center gap-2 text-xs text-secondary">
              <span className="h-2 w-4 rounded-sm border border-line bg-elevated inline-block" />
              <span>Elige tu vehículo para ver el acceso</span>
            </div>
          )}
          {hasInProgressMarker && (
            <div className="mt-1.5 text-[11px] text-secondary">{MAP_IN_PROGRESS_LEGEND_TEXT}</div>
          )}
          {hasApproximatePerimeter && (
            <div className="mt-1.5 text-[11px] text-secondary">{MAP_APPROXIMATE_LEGEND_TEXT}</div>
          )}
        </div>
      </div>
    </div>
  );
}
