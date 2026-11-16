'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CityEvaluationResult, ZbeAccessStatus } from '@/lib/zbe-engine';
import { getMapTileConfig, MAP_TILE_MAX_ZOOM, MAP_TILE_SUBDOMAINS } from '@/lib/map-config';
import { Search, RotateCcw, Map, Moon, Satellite, Layers, Navigation, Compass } from 'lucide-react';

interface SpainZbeMapProps {
  cities: CityEvaluationResult[];
  selectedCity: CityEvaluationResult | null;
  onCitySelect: (city: CityEvaluationResult) => void;
  statusFilter: 'all' | ZbeAccessStatus;
  onFilterChange: (filter: 'all' | ZbeAccessStatus) => void;
}

type MapLayerType = 'carto' | 'dark' | 'osm' | 'sat';

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
  const [mapTheme, setMapTheme] = useState<MapLayerType>('carto'); // CARTO Positron por defecto
  const [showPolygons, setShowPolygons] = useState(true);

  // Sincronizar tema con modo oscuro/claro global
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark');
      setMapTheme(isDark ? 'dark' : 'carto');
    }

    const handler = (e: any) => {
      const newTheme = e.detail?.theme;
      setMapTheme(newTheme === 'dark' ? 'dark' : 'carto');
    };

    window.addEventListener('theme-change', handler);
    return () => window.removeEventListener('theme-change', handler);
  }, []);

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

  // Renderizar marcadores y polígonos GeoJSON (Estilo CARTO exacto)
  const renderMapElements = useCallback(
    (map: any, L: any, list: CityEvaluationResult[], displayPolygons: boolean) => {
      // 1. Limpiar marcadores antiguos
      Object.values(markersRef.current).forEach((marker: any) => {
        try {
          marker.remove();
        } catch {
          // ignore
        }
      });
      markersRef.current = {};

      // 2. Limpiar capas GeoJSON antiguas
      Object.values(geojsonLayersRef.current).forEach((layer: any) => {
        try {
          layer.remove();
        } catch {
          // ignore
        }
      });
      geojsonLayersRef.current = {};

      list.forEach((city) => {
        const isAllowed = city.status === 'allowed';
        const isRestricted = city.status === 'restricted';
        const isBanned = city.status === 'banned';

        // Estilo solicitado: #e63946 (rojo suave) para vetado, #ea580c (naranja) para restringido, #16a34a (verde) para libre
        const strokeColor = isAllowed ? '#16a34a' : isRestricted ? '#ea580c' : '#e63946';

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
          <div style="font-family: inherit; min-width: 170px; padding: 2px;">
            <div style="font-size: 13px; font-weight: 700; color: #ffffff; margin-bottom: 2px;">
              ${city.cityName}
            </div>
            <div style="font-size: 11px; font-weight: 700; color: ${
              isAllowed ? '#22c55e' : isRestricted ? '#fb923c' : '#f87171'
            }; text-transform: uppercase;">
              ${city.statusLabel}
            </div>
            <div style="font-size: 10px; color: #a1a1aa; margin-top: 2px;">
              ${city.perimeterName || 'Límite de Zona ZBE'}
            </div>
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
            map.fitBounds(geoLayer.getBounds(), { padding: [60, 60], maxZoom: 15 });
            geoLayer.openPopup();
          } else if (city.polygon && city.polygon.length > 0) {
            map.fitBounds(L.latLngBounds(city.polygon), { padding: [60, 60], maxZoom: 15 });
          } else {
            map.flyTo([city.lat, city.lng], 13, { duration: 0.8 });
          }
        });

        marker.addTo(map);
        markersRef.current[city.cityId] = marker;

        // B. Trazado GeoJSON de la ZBE con estética tipo CARTO
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
              style: function (feature: any) {
                const isFase2 = feature?.properties?.fase === 'FASE 2';
                return {
                  color: isFase2 ? '#ea580c' : strokeColor,
                  weight: isFase2 ? 2.5 : 3,
                  opacity: 0.95,
                  fillColor: isFase2 ? '#f97316' : strokeColor,
                  fillOpacity: isFase2 ? 0.16 : 0.25,
                  dashArray: isFase2 ? '6, 5' : (isRestricted ? '5, 5' : undefined),
                };
              },
              onEachFeature: function (feature: any, layer: any) {
                const faseBadge = feature?.properties?.fase ? `<span style="display:inline-block;padding:2px 6px;border-radius:4px;background:#ea580c;color:#ffffff;font-size:10px;font-weight:700;margin-bottom:4px;letter-spacing:0.5px;">${feature.properties.fase}</span><br/>` : '';
                const nombre = feature.properties?.nombre || `ZBE ${city.cityName}`;
                const desc = feature.properties?.descripcion || city.summary;
                const streetsHtml =
                  city.streets && city.streets.length > 0
                    ? `<div style="margin-top: 6px; font-size: 11px; color: #52525b; border-top: 1px solid #e4e4e7; padding-top: 4px;">
                        <strong>Vías perimetrales:</strong><br/>${city.streets.slice(0, 4).join(' &bull; ')}
                       </div>`
                    : '';

                layer.bindPopup(
                  `<div style="font-family: system-ui, sans-serif; font-size: 12px; line-height: 1.4; color: #18181b;">
                    ${faseBadge}<strong style="font-size: 13px; color: #09090b;">${nombre}</strong><br/>
                    <span style="color: ${strokeColor}; font-weight: bold; text-transform: uppercase; font-size: 10px;">
                      ${city.statusLabel} (${city.fineAmount} € sanción)
                    </span><br/>
                    <div style="margin-top: 4px; color: #3f3f46;">${desc}</div>
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

  // Aplicar capa base seleccionada (CARTO Positron por defecto)
  const applyTileLayer = useCallback((map: any, L: any, theme: MapLayerType) => {
    currentTileLayersRef.current.forEach((layer) => {
      try {
        layer.remove();
      } catch {
        // ignore
      }
    });
    currentTileLayersRef.current = [];

    if (theme === 'carto') {
      // 1. CARTO Positron Minimalista (El estándar solicitado)
      const tiles = getMapTileConfig();
      const cartoLayer = L.tileLayer(
        tiles.lightUrl,
        {
          attribution: tiles.attribution,
          subdomains: MAP_TILE_SUBDOMAINS,
          maxZoom: MAP_TILE_MAX_ZOOM,
        }
      );
      cartoLayer.addTo(map);
      currentTileLayersRef.current.push(cartoLayer);
    } else if (theme === 'dark') {
      // 2. CARTO Dark Matter (URL y atribución configurables)
      const tiles = getMapTileConfig();
      const darkBase = L.tileLayer(tiles.darkUrl, {
        attribution: tiles.attribution,
        subdomains: MAP_TILE_SUBDOMAINS,
        maxZoom: MAP_TILE_MAX_ZOOM,
      });
      darkBase.addTo(map);
      currentTileLayersRef.current.push(darkBase);
    } else if (theme === 'osm') {
      // 3. OpenStreetMap
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
      });
      osmLayer.addTo(map);
      currentTileLayersRef.current.push(osmLayer);
    } else if (theme === 'sat') {
      // 4. Satélite
      const satLayer = L.tileLayer(
        'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri, Maxar',
          maxZoom: 18,
        }
      );
      satLayer.addTo(map);
      currentTileLayersRef.current.push(satLayer);
    }
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

      // Cargar CARTO Positron por defecto
      applyTileLayer(map, L, mapTheme);

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

  // Actualizar tema
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      if (mapInstanceRef.current) {
        applyTileLayer(mapInstanceRef.current, L, mapTheme);
      }
    });
  }, [mapTheme, mapReady, applyTileLayer]);

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
          mapInstanceRef.current.fitBounds(geoLayer.getBounds(), { padding: [60, 60], maxZoom: 15 });
          geoLayer.openPopup();
        } else if (selectedCity.polygon && selectedCity.polygon.length > 0) {
          const bounds = L.latLngBounds(selectedCity.polygon);
          mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
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

  const focusBarcelona = () => {
    const bcn = cities.find((c) => c.cityId === 'barcelona');
    if (bcn) {
      onCitySelect(bcn);
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
    <div className="relative flex flex-col h-full w-full rounded-xl overflow-hidden border border-neutral-800 bg-black shadow-lg">
      {/* Barra de control superior - Negro y Naranja */}
      <div className="z-10 flex flex-wrap items-center justify-between gap-2.5 p-3 bg-neutral-950 border-b border-neutral-800">
        {/* Filtros de estado */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-neutral-100 text-black'
                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            Todas ({cities.length})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('allowed')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              statusFilter === 'allowed'
                ? 'bg-green-600 text-white'
                : 'bg-neutral-900 text-green-500 hover:text-green-400 border border-neutral-800'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Libre ({cities.filter((c) => c.status === 'allowed').length})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('restricted')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              statusFilter === 'restricted'
                ? 'bg-orange-600 text-white'
                : 'bg-neutral-900 text-orange-500 hover:text-orange-400 border border-neutral-800'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            Restringido ({cities.filter((c) => c.status === 'restricted').length})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('banned')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              statusFilter === 'banned'
                ? 'bg-red-600 text-white'
                : 'bg-neutral-900 text-red-500 hover:text-red-400 border border-neutral-800'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Prohibido ({cities.filter((c) => c.status === 'banned').length})
          </button>
        </div>

        {/* Accesos directos de prueba y controles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón directo para probar Barcelona */}
          <button
            type="button"
            onClick={focusBarcelona}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800 transition-colors"
            title="Ver trazado oficial ZBE Rondas de Barcelona (77,5 km²)"
          >
            <span>Barcelona</span>
          </button>

          {/* Botón directo para probar Zaragoza */}
          <button
            type="button"
            onClick={focusZaragoza}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold bg-orange-600 text-white hover:bg-orange-500 transition-colors shadow-sm"
            title="Ver trazado GeoJSON de la ZBE Casco Histórico de Zaragoza"
          >
            <Navigation className="h-3 w-3" />
            <span>Zaragoza</span>
          </button>

          {/* Botón directo para probar Huesca */}
          <button
            type="button"
            onClick={focusHuesca}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800 transition-colors"
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
                ? 'bg-orange-500/15 border-orange-500/60 text-orange-400'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
            title="Mostrar u ocultar capas GeoJSON de las ZBE"
          >
            <Layers className="h-3.5 w-3.5 text-orange-500" />
            <span>GeoJSON</span>
          </button>

          {/* Selector de capa de mapa */}
          <div className="flex items-center bg-neutral-900 rounded border border-neutral-800 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setMapTheme('carto')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                mapTheme === 'carto' ? 'bg-orange-600 text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Estilo CARTO Positron minimalista"
            >
              CARTO
            </button>
            <button
              type="button"
              onClick={() => setMapTheme('dark')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                mapTheme === 'dark' ? 'bg-orange-600 text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Modo Oscuro"
            >
              Oscuro
            </button>
            <button
              type="button"
              onClick={() => setMapTheme('osm')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                mapTheme === 'osm' ? 'bg-orange-600 text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="OpenStreetMap"
            >
              OSM
            </button>
            <button
              type="button"
              onClick={() => setMapTheme('sat')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                mapTheme === 'sat' ? 'bg-orange-600 text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Satélite"
            >
              Satélite
            </button>
          </div>

          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
            <input
              type="text"
              value={searchCityQuery}
              onChange={(e) => setSearchCityQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-24 sm:w-28 rounded border border-neutral-800 bg-neutral-900 py-1 pl-8 pr-2 text-xs text-white placeholder-neutral-500 focus:border-orange-500 focus:outline-none"
            />
          </div>

          <button
            onClick={resetViewPeninsula}
            title="Centrar España"
            className="rounded border border-neutral-800 bg-neutral-900 p-1 text-neutral-400 hover:text-white transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Contenedor del Mapa Leaflet */}
      <div className="relative flex-1 w-full min-h-[580px] h-[580px]">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

        {/* Indicador de trazado GeoJSON CARTO */}
        <div className="absolute top-3 left-3 z-20 pointer-events-none bg-black/85 border border-neutral-800 rounded px-2.5 py-1 text-[11px] text-neutral-300 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          <span>Trazado GeoJSON estilo CARTO Positron &bull; Clic para ver delimitación exacta</span>
        </div>

        {/* Leyenda simple */}
        <div className="absolute bottom-3 left-3 z-20 rounded-lg bg-black/90 border border-neutral-800 p-3 shadow-md pointer-events-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
            Zonas ZBE (GeoJSON)
          </span>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2 text-green-400">
              <span className="h-2 w-4 rounded-sm bg-green-500/25 border border-green-500 inline-block" />
              <span>Zona Permitida</span>
            </div>
            <div className="flex items-center gap-2 text-orange-400">
              <span className="h-2 w-4 rounded-sm bg-orange-500/25 border border-orange-500 inline-block border-dashed" />
              <span>Zona Restringida (Parking)</span>
            </div>
            <div className="flex items-center gap-2 text-red-400">
              <span className="h-2 w-4 rounded-sm bg-red-500/25 border border-red-500 inline-block" />
              <span>Zona Prohibida (#e63946)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
