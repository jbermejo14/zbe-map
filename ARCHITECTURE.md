# Arquitectura: Ododex · Zonas de Bajas Emisiones (ZBE)

## 1. Objetivo y alcance

Consulta de las restricciones de las 152 Zonas de Bajas Emisiones de España según la etiqueta ambiental de la DGT, con estimación de la etiqueta por matrícula y por vehículo. Forma parte de la red **Ododex** y se publica gratis como sitio estático en Cloudflare, bajo `https://ododex.com/es/zbe`. Lo ensambla y despliega `../ododex-sitio`.

Este documento cubre la migración desde "Radar ZBE España":

- exportación estática sin servidor; las 4 rutas de API pasan a lógica en el navegador;
- ruta base `/es/zbe`;
- marca, estilo y legales de Ododex;
- teselas del mapa sin CARTO, porque CARTO exige ahora clave de API.

Fuera de alcance:

- Cambiar las reglas de la DGT (`lib/dgt-rules.ts`), el motor (`lib/zbe-engine.ts`) o los datos (`data/`).
- Los scripts de `scripts/` (siguen con Prisma, solo para desarrollo).

Ya hecho (commit `e1021b4`):

- Next 16.4.6, React 19.3.0 y Tailwind 4.3.3 por PostCSS (`postcss.config.mjs` y `postcss-tailwind-windows.cjs` copiados de la calculadora);
- `@tailwindcss/oxide-wasm32-wasi` instalado;
- `app/zbe/[ciudad]` movido a `app/[ciudad]`;
- `public/brand/`, `app/icon.svg`, `config/titular.example.json` y `config/titular.json` (este último fuera de git).

Referencias de solo lectura:

- `../multas-dgt`: misma migración. Ficheros: `src/lib/site.ts`, `src/lib/legal.ts`, `src/components/{Header,Footer,BrandLogo,Breadcrumbs,AdSenseScript,ConsentSettingsButton}.tsx`, `src/app/{layout.tsx,globals.css,aviso-legal,privacidad,cookies}`, `src/components/RadarMap*.tsx` (mapa Leaflet con OSM y `isolate`) y sus pruebas en `test/`.
- `../calculadora-impuestos/app/globals.css`: tokens.
- `../brand/README.md`: marca.

## 2. Módulos

### Z1 — Plataforma y exportación

- `lib/site.ts`, con la misma interfaz que multas:
  - `SITE_NAME = 'Ododex'`;
  - `SECTION_NAME = 'Zonas de bajas emisiones'`;
  - `BASE_PATH = '/es/zbe'`;
  - `getSiteUrl`, `absoluteUrl` y `assetPath`.

  Las URLs absolutas (canonical, `og:url`, JSON-LD, sitemap) usan `absoluteUrl`. Desaparece `radar-zbe.es`. `lib/seo.ts` se adapta.
- `next.config.ts`:
  - `basePath: '/es/zbe'`, con una constante duplicada y un comentario, como en multas;
  - `output: 'export'` e `images: { unoptimized: true }`;
  - se quitan las `redirects()` antiguas: la web nunca se publicó con esas URLs y la exportación estática no las admite.
- Rutas internas:
  - `/` (home);
  - `/[ciudad]`;
  - `/[ciudad]/[etiqueta]`;
  - `/etiqueta-dgt/[combustible]/[anio]`.

  Todas las dinámicas llevan `dynamicParams = false`. Todos los enlaces internos (`/zbe/...` → `/...`) van con `next/link` o con `assetPath` dentro del HTML de Leaflet.
- Sin `revalidate`. `sitemap.ts` con `dynamic = 'force-static'`. `app/robots.ts` deja de usarse; `robots.txt` lo sirve la raíz de `ododex.com`.
- Tailwind 4:
  - `app/globals.css` pasa de `@tailwind base/components/utilities` a `@import "tailwindcss"`, más `@custom-variant dark` por `data-theme`;
  - los colores `dgt.*` de `tailwind.config.ts` pasan a `@theme` en CSS;
  - `tailwind.config.ts`, `autoprefixer` y la configuración antigua de PostCSS dejan de usarse. La sesión principal borra `tailwind.config.ts`.
- `package.json`: `test` sigue siendo `node --experimental-strip-types --test "tests/**/*.test.ts"`, entre comillas para que funcione en Windows. Si hacen falta pruebas `.tsx`, se cambia a `tsx --test "tests/**/*.test.ts" "tests/**/*.test.tsx"` (tsx 4.23.15 ya está instalado).

### Z2 — Lógica en el navegador (sin API)

Las 4 rutas de `app/api/` solo leen `data/*.json` y ejecutan funciones puras de `lib/`. Se sustituyen por llamadas directas desde los componentes cliente:

| Antes | Después |
|---|---|
| `fetch('/api/zbe-cities?badge=X')` | `evaluateAllCities(badge)` de `lib/cities-repository.ts` |
| `fetch('/api/vehicles?...')` (marcas, modelos, búsqueda) | funciones de `lib/vehicles-repository.ts` |
| `fetch('/api/recommendations?...')` | `findEquivalentEcoCars` y `getEcoCandidates` |
| `fetch('/api/plate?plate=...')` | `lookupPlate` de `lib/plate-lookup.ts` |

Reglas:

- Las funciones se llaman de forma síncrona, o en `useMemo`/`useEffect` si hace falta. Se mantienen los estados de carga y error que tenga la interfaz, ahora con los errores reales de validación (por ejemplo, matrícula inválida). Ningún error se silencia.
- Se eliminan `app/api/` (lo hace la sesión principal con `git rm` cuando nada lo use).
- El JSON de ciudades (unos 400 KB, con polígonos) solo se carga en el navegador en la página que muestra el mapa nacional. Si un componente cliente lo importa y acaba en el paquete de todas las páginas, se separan los datos ligeros (sin polígonos) de los polígonos, y estos se cargan con `import()` dinámico solo donde se usan. Hay que informar del tamaño del JS de la home antes y después.

### Z3 — Mapas sin CARTO

- `lib/map-config.ts`: teselas de OpenStreetMap (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`, atribución OSM) en los dos temas, igual que multas. Se eliminan las URLs de CARTO.
- Los contenedores de Leaflet llevan `isolate`, para no tapar la cabecera fija. Las reglas CSS de Leaflet van en `@layer base` y no fijan ancho ni alto (el fallo de multas: mapas de 2 px).

### Z4 — Marca, estilo y legales de Ododex

Igual que el R4 de `../recalls-web/ARCHITECTURE.md` y las secciones 2.2, 2.3 y 2.6 de `../multas-dgt/ARCHITECTURE.md`, en español:

- **Marca:**
  - `BrandLogo`;
  - `Header`: logo, separador, `SECTION_NAME` y conmutador de tema con `ododex-theme` y `data-theme`. Fila de navegación: "Mapa" (`/`), "Etiqueta DGT" (`/etiqueta-dgt/gasolina/2018` o la página índice que exista) y "Ciudades" (ancla de la lista de ciudades de la home);
  - `Footer`: legales, botón de consentimiento, fuentes (DGT, BOE, ordenanzas municipales) y aviso de sitio independiente y no oficial;
  - fuentes Inter y JetBrains Mono;
  - fuera "Radar ZBE", `radar-zbe.es` y el tema antiguo.
- **Estilo:**
  - tokens, `@theme inline` y clases de multas (`card`, `btn`, `tag`, `breadcrumbs`, etc.) en `@layer components`;
  - colores semánticos en los `.tsx`, salvo los colores oficiales de las etiquetas DGT (CERO, ECO, C y B), que se mantienen como tokens con nombre (`--dgt-cero`, etc.);
  - estados de acceso (permitido, restringido, prohibido) con `tag-green`, `tag-warning` o `tag-red`;
  - sin degradados ni colores de paleta fijos;
  - sin desbordamiento a 375 px.
- **Legales:**
  - `lib/legal.ts` (copia de multas);
  - páginas `/aviso-legal`, `/privacidad` y `/cookies` con `noindex, follow` y fuera del sitemap. Contenido: titular; objeto (información orientativa sobre ZBE y etiquetas DGT; la ordenanza municipal manda); no oficial (ni DGT ni ayuntamientos); la matrícula que se escribe se procesa solo en el navegador y no se envía a ningún servidor; tema en `localStorage`; AdSense con consentimiento; teselas de OpenStreetMap;
  - `AdSenseScript` y `ConsentSettingsButton`.

## 3. Orden

1. **Z1 + Z2 + Z3**: la web compila y exporta con la misma interfaz que hoy.
2. **Z4**: marca, estilo y legales.

## 4. Criterios de aceptación

- `npm test` pasa: las 35 pruebas actuales, adaptadas a las rutas nuevas, más estas:
  - `tests/site.test.ts`: `absoluteUrl`, `assetPath`, y `basePath` y `output` de `next.config.ts`;
  - `tests/client-logic.test.ts`: las funciones que sustituyen a la API devuelven lo mismo que devolvía cada ruta para 2-3 casos (una etiqueta, una marca o modelo, una matrícula válida y una inválida);
  - una prueba de que ningún fichero de `app/`, `components/` ni `lib/` contiene `/api/`, `cartocdn` ni `radar-zbe`;
  - en Z4: marca, colores, contraste y legales, como en multas.
- `npx tsc --noEmit` pasa.
- `npm run build` (con `NEXT_PUBLIC_SITE_URL=https://ododex.com`) genera `out/`:
  - `index.html`, `404.html` y `sitemap.xml`;
  - una página por ciudad, por ciudad y etiqueta, y por combustible y año.

  Hay que informar del número de ficheros.
- En pantalla (sesión principal):
  - el mapa nacional con teselas y polígonos;
  - una ciudad, ciudad con etiqueta y etiqueta DGT;
  - el selector de vehículo, la consulta por matrícula y las recomendaciones;
  - los legales;
  - todo en claro y oscuro, a 375 y 1280 px.

---

## Z5 — Mejoras de uso (18/11/2026)

Peticiones del titular tras la primera publicación.

### Z5.1 Selector de vehículo: marca, combustible y año

Problema: el selector solo ofrece los 49 vehículos de `data/reference-vehicles.json` (de BMW, solo el Serie 3). La etiqueta DGT no depende del modelo: depende del combustible, del año (y del mes si es diésel de 2015) y de la autonomía eléctrica de los híbridos enchufables (`getOfficialDgtBadge` en `lib/dgt-rules.ts`).

Nuevo selector (`components/VehicleSelector.tsx`, sin cambiar `lib/dgt-rules.ts`):

1. **Marca:** lista de `data/brands.json` (fichero nuevo), con buscador. La lista se forma con:
   - las 44 marcas de turismos de `../vehicle-stats/data/aggregated/brands.json` (matriculaciones DGT 2024-2026), normalizadas en mayúscula inicial ("TOYOTA" → "Toyota");
   - las marcas históricas habituales en España que falten (Rover, Daewoo, Saab, Lancia, Chevrolet, Chrysler, Dodge, Alfa Romeo, Smart, Mini, Jaguar, Land Rover, Porsche, Subaru, Mitsubishi, SsangYong, Infiniti, Lexus, Cupra, DS, Dacia y las que falten de las grandes);
   - la opción "Otra marca".

   El fichero lleva en su cabecera JSON un campo `fuente` que lo explica. La marca solo sirve para mostrar el resultado ("Tu BMW…"); no cambia la etiqueta.
2. **Modelo:** texto libre opcional. Solo se muestra en el resultado.
3. **Combustible:** gasolina, diésel, híbrido (HEV/MHEV), híbrido enchufable, eléctrico, GLP/GNC. Con híbrido enchufable aparece "Autonomía eléctrica (km)", numérico.
4. **Año de matriculación:** de `ANIO_MIN` (1990) al año actual. Con diésel de 2015 aparece "Mes de matriculación", porque la frontera Euro 6 es septiembre de 2015.
5. **Resultado:** `getOfficialDgtBadge({ fuel, year, month, electricRangeKm })` y la misma tarjeta de etiqueta y la misma evaluación de ciudades de hoy. El enlace a `/etiqueta-dgt/<combustible>/<año>` va solo si esa ruta existe (`lib/etiqueta-routes.ts`).

Se mantienen:

- la consulta por matrícula;
- el selector rápido de etiqueta.

Las recomendaciones de alternativas ECO o CERO siguen usando `data/reference-vehicles.json` como catálogo de candidatos, con los valores por defecto actuales de carrocería y potencia. El selector de los 49 vehículos desaparece. El vehículo de ejemplo de la home pasa a ser una selección de marca, combustible y año (Audi, diésel, 2012 → B) que se ve en el HTML exportado.

### Z5.2 Página de ciudades y botón "Ciudades"

- Página nueva `app/ciudades/page.tsx` (`/es/zbe/ciudades`):
  - las 152 ciudades agrupadas por comunidad autónoma (campo `region`), en orden alfabético;
  - cada una con nombre, provincia, estado (activa o en tramitación, con `tag`) y enlace a `/[ciudad]`;
  - buscador en el cliente para filtrar por nombre;
  - metadatos y canonical con `absoluteUrl`, incluida en el sitemap;
  - JSON-LD `BreadcrumbList`.
- El enlace "Ciudades" de la cabecera y los JSON-LD que apuntaban a `/#ciudades` pasan a `/ciudades`.

### Z5.3 Selector de varias ciudades (home)

Sección nueva en la home, "Consulta varias ciudades" (`components/MultiCitySelector.tsx`):

- buscador con autocompletado para añadir ciudades como fichas (chips) que se pueden quitar, hasta `MAX_CIUDADES_SELECCIONADAS` (4), para no cargar demasiados mapas a la vez. Al llegar al máximo, un aviso visible lo dice;
- por cada ciudad, una tarjeta con:
  - estado de la ZBE, horario, multa, aparcamiento, perímetro y fuente con fecha de verificación (los mismos datos que `/[ciudad]`);
  - el acceso para la etiqueta seleccionada en ese momento en la home (permitido, restringido o prohibido), con `tag`;
  - el mapa de esa ciudad (`CityMiniMap`, con su polígono si lo tiene);
  - el enlace a su página;
- las tarjetas usan los datos ligeros de ciudad. Los polígonos se cargan con el mismo `import()` dinámico que ya usa el mapa nacional; no se añaden al paquete inicial.

### Z5.4 Mapa: limpieza y "Mi ubicación"

- Se eliminan de `components/SpainZbeMap.tsx`:
  - los botones "Zaragoza" y "Huesca" y sus funciones;
  - el botón "GeoJSON" y su estado: los perímetros se muestran siempre;
  - el texto "Trazado GeoJSON de cada ZBE…", que se sustituye por "Haz clic en una ZBE para ver su perímetro".
- Botón nuevo "Mi ubicación" en la barra del mapa, con icono `LocateFixed` de lucide y `aria-label`:
  - usa `navigator.geolocation.getCurrentPosition` (alta precisión desactivada y tiempo de espera `TIEMPO_ESPERA_UBICACION_MS`) solo cuando se pulsa;
  - centra el mapa en el usuario con un zoom de ciudad y pone un marcador ("Tu ubicación");
  - calcula la ZBE más cercana con la distancia de Haversine al centro (`lat`, `lng`) de cada ciudad, en una función pura `nearestZbe(lat, lng, ciudades)` en `lib/geo.ts`, con pruebas. Muestra "ZBE más cercana: <ciudad>, a <n> km" con el acceso para la etiqueta actual y el enlace a la ciudad;
  - los errores (permiso denegado, no disponible, tiempo agotado, navegador sin geolocalización) se muestran como aviso visible con `role="alert"` y un texto que dice qué hacer;
  - la ubicación no se guarda ni se envía a ningún sitio.
- `app/privacidad/page.tsx` añade que la ubicación, si se pide, se usa solo en el navegador para centrar el mapa y no se envía ni se guarda.

### Z5.5 Criterios de aceptación

- `npm test` pasa, con pruebas nuevas de:
  - `nearestZbe`: ciudad correcta y distancia aproximada para 2 puntos conocidos, y lista vacía;
  - `data/brands.json`: sin duplicados, en orden alfabético, con BMW, Seat y Rover, y "Otra marca" al final;
  - el selector: combustible y año dan la misma etiqueta que `getOfficialDgtBadge`, también para diésel de septiembre de 2015 frente a agosto y para un PHEV de 40 km frente a 39;
  - la página `/ciudades`: incluye las 152 ciudades y está en el sitemap;
  - ningún fichero contiene `focusZaragoza`, `focusHuesca` ni el texto "GeoJSON" en la interfaz.
- `npx tsc --noEmit` y `npm run build` pasan.
- En pantalla (sesión principal):
  - el selector con BMW, diésel y 2010 da B;
  - `/ciudades` funciona;
  - el selector de varias ciudades muestra 2 tarjetas con su mapa;
  - el mapa no tiene los botones eliminados;
  - "Mi ubicación" muestra su aviso si se deniega el permiso;
  - todo sin desbordamiento a 375 px.
