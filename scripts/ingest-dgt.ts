/**
 * Ingesta de microdatos DGT (MATRABA / TRANSRABA)
 * Lee ficheros de texto plano de ancho fijo con codificación ISO-8859-1 y guarda los vehículos en Prisma SQLite.
 */

import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { parseDgtFixedWidthLine } from '../lib/dgt-parser';

async function main() {
  console.log('🚀 Iniciando ingesta de microdatos DGT...');

  // Determinar fichero a procesar
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => a.startsWith('--file='));
  const filePath = fileArg
    ? fileArg.replace('--file=', '')
    : path.join(__dirname, '../data/dgt-sample-microdata.txt');

  if (!fs.existsSync(filePath)) {
    console.error(`❌ El archivo no existe: ${filePath}`);
    process.exit(1);
  }

  console.log(`📁 Leyendo fichero: ${filePath} (ISO-8859-1)...`);
  const buffer = fs.readFileSync(filePath);
  // Decodificación explícita ISO-8859-1
  const decoder = new TextDecoder('iso-8859-1');
  const content = decoder.decode(buffer);
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  console.log(`🔍 Total registros encontrados: ${lines.length}`);

  const stats = {
    total: 0,
    cero: 0,
    eco: 0,
    c: 0,
    b: 0,
    sinEtiqueta: 0,
    brands: new Set<string>(),
  };

  for (const line of lines) {
    const record = parseDgtFixedWidthLine(line);
    if (!record) continue;

    stats.total++;
    stats.brands.add(record.brand);
    switch (record.dgtBadge.badge) {
      case 'CERO':
        stats.cero++;
        break;
      case 'ECO':
        stats.eco++;
        break;
      case 'C':
        stats.c++;
        break;
      case 'B':
        stats.b++;
        break;
      case 'SIN_ETIQUETA':
        stats.sinEtiqueta++;
        break;
    }

    // Upsert en la base de datos por slug
    await prisma.vehicle.upsert({
      where: { slug: record.slug },
      update: {
        brand: record.brand,
        model: record.model,
        version: record.version,
        year: record.registrationYear,
        propulsionCode: record.propulsionCode,
        euroNorm: record.euroNorm,
        dgtBadge: record.dgtBadge.badge,
        electricRangeKm: record.electricRangeKm,
        co2Emissions: record.co2Emissions,
        powerKw: record.powerKw,
        powerCv: record.powerCv,
        bodyType: record.bodyType,
        wheelbaseMm: record.wheelbaseMm,
        registrationDate: record.registrationDate,
      },
      create: {
        slug: record.slug,
        brand: record.brand,
        model: record.model,
        version: record.version,
        year: record.registrationYear,
        propulsionCode: record.propulsionCode,
        euroNorm: record.euroNorm,
        dgtBadge: record.dgtBadge.badge,
        electricRangeKm: record.electricRangeKm,
        co2Emissions: record.co2Emissions,
        powerKw: record.powerKw,
        powerCv: record.powerCv,
        bodyType: record.bodyType,
        wheelbaseMm: record.wheelbaseMm,
        registrationDate: record.registrationDate,
      },
    });
  }

  console.log('✅ Ingesta DGT completada con éxito.');
  console.log('📊 Resumen de vehículos indexados:');
  console.log(`   - Total procesados: ${stats.total}`);
  console.log(`   - 0 Emisiones: ${stats.cero}`);
  console.log(`   - ECO: ${stats.eco}`);
  console.log(`   - Etiqueta C: ${stats.c}`);
  console.log(`   - Etiqueta B: ${stats.b}`);
  console.log(`   - Sin Etiqueta (A): ${stats.sinEtiqueta}`);
  console.log(`   - Marcas distintas: ${Array.from(stats.brands).join(', ')}`);
}

main()
  .catch((err) => {
    console.error('❌ Error durante la ingesta:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
