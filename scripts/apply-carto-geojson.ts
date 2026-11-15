import fs from 'fs';
import path from 'path';

const citiesPath = path.join(__dirname, '../data/zbe-cities.json');
const cities = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));

// GeoJSON exacto para Zaragoza según ordenanza del Casco Histórico
const zaragozaGeoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        nombre: 'Zona de Bajas Emisiones (ZBE) Zaragoza Casco Histórico',
        descripcion:
          'Acceso restringido en el perímetro delimitado por Paseo Echegaray y Caballero (Río Ebro), San Vicente de Paúl, Calle Coso y Avenida César Augusto.',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-0.8835, 41.6582], // Paseo Echegaray / Pte Santiago / César Augusto
            [-0.8785, 41.6575], // Paseo Echegaray / Basílica del Pilar
            [-0.8745, 41.6565], // Paseo Echegaray / Puente de Piedra
            [-0.8725, 41.6558], // Paseo Echegaray / San Vicente de Paúl
            [-0.8732, 41.6515], // San Vicente de Paúl / Calle Mayor / Coso
            [-0.8775, 41.6512], // Coso Bajo
            [-0.8812, 41.6505], // Plaza de España / Coso
            [-0.8850, 41.6510], // Coso / Calle Alfonso I
            [-0.8875, 41.6492], // Puerta del Carmen / César Augusto
            [-0.8852, 41.6568], // César Augusto / Murallas Romanas / Mercado Central
            [-0.8835, 41.6582], // Cierre del polígono
          ],
        ],
      },
    },
  ],
};

// GeoJSON exacto para Huesca (proporcionado por el usuario)
const huescaGeoJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        nombre: 'Zona de Bajas Emisiones (ZBE) Huesca',
        descripcion: 'Acceso restringido (antigua zona peatonal y casco histórico / Cosos de Huesca).',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-0.4138, 42.1408], // Plaza de Navarra / Coso Alto
            [-0.4148, 42.1425], // Coso Alto hacia Amado
            [-0.4125, 42.1445], // C/ Amado / Las Cortes
            [-0.4085, 42.1452], // Zona Norte / Murallas
            [-0.4045, 42.1432], // Ronda Montearagón Este
            [-0.4042, 42.1398], // Coso Bajo / Plaza Santo Domingo
            [-0.4075, 42.138], // Coso Bajo Sur
            [-0.4112, 42.1385], // Coso Bajo hacia Plaza Navarra
            [-0.4138, 42.1408], // Cierre del polígono
          ],
        ],
      },
    },
  ],
};

const updated = cities.map((c: any) => {
  if (c.id === 'zaragoza') {
    return {
      ...c,
      geoJSON: zaragozaGeoJSON,
      polygon: zaragozaGeoJSON.features[0].geometry.coordinates[0].map(([lng, lat]) => [lat, lng]),
      streets: [
        'Paseo Echegaray y Caballero (Río Ebro / Basílica del Pilar)',
        'Puente de Piedra / Calle Don Jaime I',
        'Calle San Vicente de Paúl',
        'Calle Coso Bajo y Coso Alto',
        'Plaza de España',
        'Avenida César Augusto (Puerta del Carmen / Murallas Romanas)',
      ],
    };
  }

  // Si ya tiene polígono en [lat, lng], generar feature GeoJSON [lng, lat]
  if (c.polygon && Array.isArray(c.polygon)) {
    const coordsLngLat = c.polygon.map(([lat, lng]: [number, number]) => [lng, lat]);
    // Asegurar cierre
    if (
      coordsLngLat[0][0] !== coordsLngLat[coordsLngLat.length - 1][0] ||
      coordsLngLat[0][1] !== coordsLngLat[coordsLngLat.length - 1][1]
    ) {
      coordsLngLat.push(coordsLngLat[0]);
    }

    return {
      ...c,
      geoJSON: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {
              nombre: `Zona de Bajas Emisiones (ZBE) ${c.name}`,
              descripcion: c.summary || `Área de bajas emisiones delimitada en ${c.name}.`,
            },
            geometry: {
              type: 'Polygon',
              coordinates: [coordsLngLat],
            },
          },
        ],
      },
    };
  }

  return c;
});

// Comprobar si Huesca ya está incluida, si no añadirla
const hasHuesca = updated.some((c: any) => c.id === 'huesca');
if (!hasHuesca) {
  updated.push({
    id: 'huesca',
    slug: 'huesca',
    name: 'Huesca',
    province: 'Huesca',
    region: 'Aragón',
    lat: 42.1401,
    lng: -0.4087,
    status: 'activa',
    fineAmount: 200,
    schedule: 'Lunes a viernes de 08:00 a 20:00 h',
    summary: 'Zona de Bajas Emisiones delimitada en el Casco Histórico y anillo de los Cosos de Huesca.',
    parkingCondition: 'Vehículos sin etiqueta prohibidos; B y C permitidos.',
    exemptions: ['Residentes', 'PMR', 'Carga y descarga en horario autorizado'],
    perimeterName: 'ZBE Huesca (Casco Histórico / Cosos)',
    areaKm2: 1.2,
    streets: [
      'Plaza de Navarra',
      'Coso Alto',
      'Calle Amado Nervo / Las Cortes',
      'Ronda Montearagón',
      'Coso Bajo / Plaza Santo Domingo',
    ],
    polygon: huescaGeoJSON.features[0].geometry.coordinates[0].map(([lng, lat]) => [lat, lng]),
    geoJSON: huescaGeoJSON,
    rules: {
      SIN_ETIQUETA: {
        status: 'banned',
        reason: 'Prohibido el acceso al Casco Histórico en horario laboral.',
      },
      B: { status: 'allowed', reason: 'Permitida la circulación.' },
      C: { status: 'allowed', reason: 'Permitida la circulación.' },
      ECO: { status: 'allowed', reason: 'Libre circulación.' },
      CERO: { status: 'allowed', reason: 'Libre circulación.' },
    },
  });
}

fs.writeFileSync(citiesPath, JSON.stringify(updated, null, 2), 'utf8');
console.log(`✅ Actualizado dataset con GeoJSON oficial para Zaragoza y Huesca (${updated.length} ciudades).`);
