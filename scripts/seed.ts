/**
 * Seeder global de Radar ZBE España
 * Carga las 35+ ciudades con ZBE y sus reglas normativas desde data/zbe-cities.json
 * y ejecuta la ingesta de microdatos DGT.
 */

import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { parseDgtFixedWidthLine } from '../lib/dgt-parser';

interface CityJsonItem {
  id: string;
  slug: string;
  name: string;
  province: string;
  region: string;
  lat: number;
  lng: number;
  status: string;
  fineAmount: number;
  schedule: string;
  summary: string;
  parkingCondition?: string;
  exemptions: string[];
  perimeterName?: string;
  areaKm2?: number;
  polygon?: [number, number][];
  streets?: string[];
  geoJSON?: any;
  rules: {
    [badgeKey: string]: {
      status: string;
      reason: string;
    };
  };
}

async function seedCities() {
  console.log('🏛️ Sembrando dataset oficial de Ciudades ZBE...');
  const citiesPath = path.join(__dirname, '../data/zbe-cities.json');
  const raw = fs.readFileSync(citiesPath, 'utf8');
  const cities: CityJsonItem[] = JSON.parse(raw);

  let cityCount = 0;
  let ruleCount = 0;

  for (const c of cities) {
    cityCount++;
    const upsertedCity = await prisma.zbeCity.upsert({
      where: { id: c.id },
      update: {
        slug: c.slug,
        name: c.name,
        province: c.province,
        region: c.region,
        lat: c.lat,
        lng: c.lng,
        status: c.status,
        fineAmount: c.fineAmount,
        schedule: c.schedule,
        summary: c.summary,
        exemptions: JSON.stringify(c.exemptions),
        parkingCondition: c.parkingCondition || null,
        perimeterName: c.perimeterName || null,
        areaKm2: c.areaKm2 || null,
        polygon: c.polygon ? JSON.stringify(c.polygon) : null,
        streets: c.streets ? JSON.stringify(c.streets) : null,
        geoJSON: c.geoJSON ? JSON.stringify(c.geoJSON) : null,
      },
      create: {
        id: c.id,
        slug: c.slug,
        name: c.name,
        province: c.province,
        region: c.region,
        lat: c.lat,
        lng: c.lng,
        status: c.status,
        fineAmount: c.fineAmount,
        schedule: c.schedule,
        summary: c.summary,
        exemptions: JSON.stringify(c.exemptions),
        parkingCondition: c.parkingCondition || null,
        perimeterName: c.perimeterName || null,
        areaKm2: c.areaKm2 || null,
        polygon: c.polygon ? JSON.stringify(c.polygon) : null,
        streets: c.streets ? JSON.stringify(c.streets) : null,
        geoJSON: c.geoJSON ? JSON.stringify(c.geoJSON) : null,
      },
    });

    // Sembrar reglas por etiqueta
    const badges = ['SIN_ETIQUETA', 'B', 'C', 'ECO', 'CERO'];
    for (const badge of badges) {
      const rule = c.rules[badge];
      if (rule) {
        ruleCount++;
        await prisma.zbeRule.upsert({
          where: {
            cityId_dgtBadge: {
              cityId: upsertedCity.id,
              dgtBadge: badge,
            },
          },
          update: {
            accessStatus: rule.status,
            reason: rule.reason,
          },
          create: {
            cityId: upsertedCity.id,
            dgtBadge: badge,
            accessStatus: rule.status,
            reason: rule.reason,
          },
        });
      }
    }
  }

  console.log(`✅ Sembradas ${cityCount} ciudades ZBE con ${ruleCount} reglas normativas.`);
}

async function seedVehicles() {
  console.log('🚗 Ejecutando ingesta de vehículos DGT...');
  const filePath = path.join(__dirname, '../data/dgt-sample-microdata.txt');
  if (!fs.existsSync(filePath)) {
    console.log('⚠️ No existe data/dgt-sample-microdata.txt');
    return;
  }

  const buffer = fs.readFileSync(filePath);
  const decoder = new TextDecoder('iso-8859-1');
  const content = decoder.decode(buffer);
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  let vehicleCount = 0;
  for (const line of lines) {
    const record = parseDgtFixedWidthLine(line);
    if (!record) continue;

    vehicleCount++;
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

  console.log(`✅ Sembrados ${vehicleCount} vehículos DGT en la base de datos.`);
}

async function main() {
  try {
    await seedCities();
    await seedVehicles();
    console.log('🎉 Seeding completo realizado con éxito.');
  } catch (error) {
    console.error('❌ Error en el seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
