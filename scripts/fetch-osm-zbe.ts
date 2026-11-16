import https from 'https';

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

async function main() {
  console.log('Consultando Overpass API para ZBEs en España...');
  const query = `
    [out:json][timeout:30];
    area["ISO3166-1"="ES"][admin_level=2]->.spain;
    (
      relation["boundary"="low_emission_zone"](area.spain);
      way["boundary"="low_emission_zone"](area.spain);
    );
    out tags;
  `;

  try {
    const res = await fetchOverpass(query);
    console.log(`ZBE encontradas en OpenStreetMap: ${res.elements?.length || 0}`);
    for (const el of (res.elements || []).slice(0, 15)) {
      console.log(`- [${el.type} ${el.id}] ${el.tags?.name || 'Sin nombre'} (${el.tags?.['name:es'] || ''})`);
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
