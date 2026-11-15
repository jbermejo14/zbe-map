# Radar ZBE España 🚗🗺️

**Radar ZBE España** es una aplicación web interactiva y motor de SEO Programático diseñada para que cualquier conductor español consulte de forma inmediata el impacto de las **Zonas de Bajas Emisiones (ZBE)** sobre su vehículo según los microdatos oficiales de la Dirección General de Tráfico (DGT) y las ordenanzas municipales vigentes bajo la Ley 7/2021 de Cambio Climático.

---

## 🚀 Características Principales

1. **Dashboard Split View (Selector DGT + Mapa Interactivo):**
   - **Panel Izquierdo:**
     - Botonera de prueba rápida por distintivo oficial (**0 CERO, ECO, C, B, SIN ETIQUETA**) para simulación instantánea.
     - Selector en cascada oficial: **Marca** ➔ **Modelo** ➔ **Motorización / Versión / Año**.
     - Buscador predictivo por texto en tiempo real.
     - **Tarjeta Técnica del Vehículo:** Reproducción vectorial SVG idéntica a la pegatina oficial de la DGT, norma Euro homologada, emisiones de CO₂, potencia en CV/kW, batalla y tipo de carrocería.
   - **Panel Derecho:**
     - Mapa interactivo de España (Península, Baleares y Canarias) con marcadores pulsantes dinámicos:
       - 🟢 **Verde Esmeralda (`allowed`):** Acceso y circulación permitidos sin requerir parking ni peaje.
       - 🟡 **Ámbar (`restricted`):** Acceso condicionado (ej. obligación de estacionar en parking público/privado como en Madrid Distrito Centro o residentes).
       - 🔴 **Rojo Carmesí (`banned`):** Acceso totalmente prohibido bajo sanción de 200 € (100 € por pronto pago).
     - **Barra de Diagnóstico Superior Dinámica:** *"Tu [Marca Modelo] puede circular libremente en X ciudades, tiene restricciones en Y y prohibición en Z"*.
     - **Drawer Lateral de Detalle Municipal:** Al hacer clic en una ciudad, se despliega el perímetro, horarios, excepciones oficiales (residentes, PMR, emergencias), condición de parking y cuantía de multa.

2. **Dataset Normativo Oficial de 39 Ciudades ZBE (`data/zbe-cities.json`):**
   - Madrid, Barcelona, Valencia, Sevilla, Zaragoza, Málaga, Bilbao, Alicante, Córdoba, Valladolid, Palma de Mallorca, Las Palmas, San Sebastián, A Coruña, Granada, Vigo, Gijón, Santander, Burgos, Salamanca, Oviedo, Badalona, L'Hospitalet, Terrassa, Sabadell, Cartagena, Fuenlabrada, Alcorcón, Leganés, Getafe, Móstoles, Pamplona, Castellón, Elche, Almería, Pontevedra, Santa Cruz de Tenerife, Logroño, León.

3. **Parser de Microdatos de la DGT (`scripts/ingest-dgt.ts` & `lib/dgt-parser.ts`):**
   - Lectura de ficheros planos de ancho fijo en formato oficial `MATRABA` (matriculaciones ordinarias) y `TRANSRABA` (transferencias) con codificación `ISO-8859-1`.
   - Deducción exacta del distintivo ambiental oficial según normativa Euro, propulsión (`BEV`, `PHEV`, `HEV`, `GLP`, `GNC`, Gasolina, Diésel), autonomía eléctrica y fecha de matriculación.

4. **Motor de Recomendación y Monetización Inteligente:**
   - Si el vehículo seleccionado tiene restricciones (`B` o `Sin Etiqueta`), el algoritmo busca en la base de datos DGT **3 modelos equivalentes con Etiqueta ECO o CERO** basados en:
     - Misma categoría de carrocería (ej. SUV, Compacto, Berlina, Utilitario).
     - Batalla similar ($\pm 100\text{ mm}$) para mantener habitabilidad y maletero.
     - Potencia similar ($\pm 20\% \text{ kW}$).
   - Muestra opciones de afiliación comercial:
     - **Segunda Mano Certificado** (Clicars / Coches.net).
     - **Renting Sin Entrada** para particulares (Renting Finders / Arval).
     - **Tasación Express Online** del coche actual (Compramostucoche).

5. **Ecosistema de SEO Programático (90+ páginas estáticas pre-renderizadas):**
   - `/etiqueta-dgt/[marca]/[modelo]`: Guía completa del modelo con tabla de motorizaciones registradas, mapa precargado y FAQ estructurada JSON-LD.
   - `/zbe/[ciudad]`: Guía municipal ZBE, horarios, sanciones, excepciones, tabla comparativa de las 5 etiquetas y comprobador integrado.
   - `/puede-entrar/[slug]`: Páginas de veredicto instantáneo para búsquedas de alta conversión (ej. `/puede-entrar/audi-a4-2-0-tdi-en-madrid`).

---

## 🛠️ Stack Tecnológico

- **Framework:** Next.js 15 (App Router) con TypeScript
- **Estilos:** Tailwind CSS con animaciones de pulso y radar
- **Base de Datos:** Prisma ORM con SQLite (fácilmente migrable a PostgreSQL)
- **Cartografía:** Leaflet + Capa gratuita CARTO Positron minimalista (`light_all`) con trazado de polígonos GeoJSON a nivel de calles (Casco Histórico Zaragoza, Huesca, etc.) sin necesidad de API Key
- **Diseño & Paleta:** UI minimalista oscura en tonos negro puro (`#09090b`), gris grafito y acentos naranja (`#f97316`)
- **Iconografía:** Lucide React

---

## 📦 Puesta en Marcha

### 1. Instalar dependencias
```bash
npm install
```

### 2. Inicializar la base de datos y sembrar datos
```bash
npx prisma db push
npm run db:seed
```

### 3. Ingesta de ficheros DGT adicionales
Para procesar cualquier fichero nuevo `.txt` de microdatos de la DGT:
```bash
npm run dgt:ingest -- --file=ruta/a/fichero-dgt.txt
```

### 4. Modo Desarrollo
```bash
npm run dev
```
Abre en tu navegador: [http://localhost:3000](http://localhost:3000)

### 5. Compilación para Producción
```bash
npm run build
npm start
```
