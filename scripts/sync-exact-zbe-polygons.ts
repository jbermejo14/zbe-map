import https from 'https';
import fs from 'fs';
import path from 'path';

async function fetchOverpass(query: string): Promise<any> {
  const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'RadarZBESpain/1.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data.slice(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

// Distancia en km entre dos puntos (Haversine)
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function run() {
  console.log('Descargando geometrías exactas calle a calle de Overpass (OSM)...');
  const query = `
    [out:json][timeout:60];
    area["ISO3166-1"="ES"][admin_level=2]->.spain;
    (
      relation["boundary"="low_emission_zone"](area.spain);
      way["boundary"="low_emission_zone"](area.spain);
    );
    out tags geom;
  `;

  const osmData = await fetchOverpass(query);
  console.log(`Recibidos ${osmData.elements?.length || 0} elementos con geometría.`);

  // Cargar zbe-cities.json
  const citiesPath = path.join(__dirname, '../data/zbe-cities.json');
  const cities: any[] = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));

  let updatedCount = 0;

  for (const element of osmData.elements || []) {
    let coords: [number, number][] = [];

    if (element.type === 'way' && element.geometry && element.geometry.length > 3) {
      coords = element.geometry.map((pt: any) => [
        Number(pt.lat.toFixed(6)),
        Number(pt.lon.toFixed(6)),
      ]);
    } else if (element.type === 'relation' && element.members) {
      // Unir caminos de la relación
      for (const m of element.members) {
        if (m.geometry && m.geometry.length > 0) {
          const part = m.geometry.map((pt: any) => [
            Number(pt.lat.toFixed(6)),
            Number(pt.lon.toFixed(6)),
          ]);
          coords.push(...part);
        }
      }
    }

    if (coords.length < 4) continue;

    // Calcular centroide del polígono
    const centerLat = coords.reduce((acc, c) => acc + c[0], 0) / coords.length;
    const centerLng = coords.reduce((acc, c) => acc + c[1], 0) / coords.length;

    const osmName = (element.tags?.name || element.tags?.['name:es'] || '').toLowerCase();

    // Buscar la ciudad más cercana o coincidente
    let matchedCity: any = null;
    let minDistance = 25; // máximo 25 km del centro de la ciudad

    for (const city of cities) {
      const dist = getDistanceKm(centerLat, centerLng, city.lat, city.lng);
      const cityNameLower = city.name.toLowerCase();

      if (osmName.includes(cityNameLower) || dist < minDistance) {
        if (dist < minDistance) {
          minDistance = dist;
          matchedCity = city;
        }
      }
    }

    if (matchedCity) {
      // Simplificar si tiene más de 400 puntos para rendimiento
      let finalCoords = coords;
      if (coords.length > 200) {
        const step = Math.ceil(coords.length / 150);
        finalCoords = coords.filter((_, idx) => idx % step === 0);
        // Asegurar que el polígono esté cerrado
        if (
          finalCoords[0][0] !== finalCoords[finalCoords.length - 1][0] ||
          finalCoords[0][1] !== finalCoords[finalCoords.length - 1][1]
        ) {
          finalCoords.push(finalCoords[0]);
        }
      }

      // Si el nuevo polígono tiene más puntos y mejor definición que el actual
      if (!matchedCity.polygon || finalCoords.length > (matchedCity.polygon?.length || 0)) {
        matchedCity.polygon = finalCoords;
        if (element.tags?.name) {
          matchedCity.perimeterName = element.tags.name;
        }
        updatedCount++;
        console.log(
          `✅ Perímetro exacto asignado a ${matchedCity.name} (${finalCoords.length} vértices calle a calle). Fuente: ${element.tags?.name || 'OSM'}`
        );
      }
    }
  }

  // Guardar archivo actualizado
  fs.writeFileSync(citiesPath, JSON.stringify(cities, null, 2), 'utf8');
  console.log(`\n🎉 Proceso completado: ${updatedCount} ciudades actualizadas con geometrías de alta resolución.`);
}

run().catch((err) => {
  console.error('Error en extracción de geometrías:', err.message);
});
