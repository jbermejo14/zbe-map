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

Las recomendaciones de alternativas ECO o CERO siguen usando `data/reference-vehicles.json` como catálogo de candidatos, con los valores por defecto actuales de carrocería y potencia. El selector de los 49 vehículos desaparece.

**Sin vehículo por defecto (petición del titular):**

- La home arranca sin vehículo ni etiqueta seleccionados.
- El veredicto nacional, la tarjeta de etiqueta, la evaluación por ciudad y las recomendaciones muestran un estado vacío que invita a elegir ("Elige tu vehículo o tu etiqueta para ver dónde puedes circular").
- El mapa nacional se ve con los perímetros en el color neutro de la marca, sin colores de acceso, hasta que haya etiqueta.
- El vehículo o la etiqueta solo aparecen cuando el usuario elige marca, combustible y año, o una etiqueta directamente, o consulta una matrícula.

**Mejoras de uso del selector:**

- Los tres pasos (marca, combustible, año) se ven a la vez en una tarjeta. El resultado aparece en cuanto hay combustible y año (la marca es opcional), sin botón de "calcular".
- Botón "Empezar de nuevo", que vuelve al estado vacío.
- Cada campo con `<label>` asociado (`htmlFor` o `id`); todos los controles con un área táctil de 44 px o más.
- Junto al resultado, el enlace "Confirmar en la DGT" a la consulta oficial del distintivo (`DGT_LEGAL_SOURCE.dgtPortalUrl`, en una pestaña nueva con `rel="noopener noreferrer"`).
- La consulta por matrícula se mantiene, rotulada claramente como **estimación por la serie de la matrícula**. El campo de matrícula lleva `<label>` asociado (hoy no lo tiene). Su resultado rellena el combustible y el año del selector, de modo que el usuario puede corregirlos.


**Decisiones finales del titular (18/11/2026), que prevalecen sobre lo anterior de Z5.1:**

- El selector tiene solo **marca, combustible y año**, más el mes si es diésel de 2015 y la autonomía si es híbrido enchufable, porque las reglas los exigen. No hay campo de modelo ni selector rápido de etiqueta.
- **No se conecta ninguna API de matrículas.** No hay ninguna gratuita: la DGT no tiene API pública y las comerciales cobran unos 0,20 € por consulta. La matrícula se mantiene como **atajo para el año**: `resolveBadgeFromPlate` (`lib/plate-badge.ts`) estima el año por la serie con `lib/plate-lookup.ts` y calcula la etiqueta para gasolina y para diésel:
  - si coinciden, la muestra sin preguntar el combustible, con la nota de que en híbridos, eléctricos o de gas cambia;
  - si difieren, pide el combustible antes de mostrarla.
- Sin enlace a la DGT junto al resultado de la matrícula. "Confirmar en la DGT" se queda junto al resultado del selector.
- La matrícula y la ubicación se procesan solo en el navegador; lo dice la página de privacidad.

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
  - la home arranca sin vehículo ni etiqueta; con BMW, diésel y 2010 da B; "Empezar de nuevo" vuelve al estado vacío;
  - `/ciudades` funciona;
  - el selector de varias ciudades muestra 2 tarjetas con su mapa;
  - el mapa no tiene los botones eliminados;
  - "Mi ubicación" muestra su aviso si se deniega el permiso;
  - todo sin desbordamiento a 375 px.

---

## Z6 — Anuncios, afiliación y página de etiquetas (18/11/2026)

### Z6.1 Anuncios manuales

Se aplica la sección 8 de `../ododex-sitio/ARCHITECTURE.md` (componente `AdSlot`, reglas y pruebas). Posiciones:

- Home: después de la sección del selector y el mapa, antes de "Consulta varias ciudades"; y antes del pie.
- `/[ciudad]` y `/[ciudad]/[etiqueta]`: después de la tarjeta de veredicto o normativa, y al final del contenido.
- `/etiqueta-dgt` y `/etiqueta-dgt/[combustible]/[anio]`: después del resultado, y al final.
- `/ciudades`: después del buscador o de los primeros grupos, y al final.

### Z6.2 Sin afiliados hasta que existan

- La tarjeta "Tasación de tu coche actual" y los botones de las recomendaciones (segunda mano y renting) se muestran solo si existe su variable `NEXT_PUBLIC_AFFILIATE_*_TAG`. Sin ella no se renderizan, y nunca hay enlaces a `#`.
- Si una recomendación se queda sin ningún botón de afiliado, se muestra igual, solo con su información: es útil como alternativa de etiqueta ECO o CERO.
- Prueba: sin variables de afiliado, el HTML de la home exportada no contiene "Tasación" ni `href="#"`.

### Z6.3 Página "Etiqueta DGT" (`/etiqueta-dgt`)

Hoy el botón "Etiqueta DGT" de la cabecera lleva a `/etiqueta-dgt/gasolina/2018`, una ficha concreta que no explica nada general. Página índice nueva `app/etiqueta-dgt/page.tsx`:

- H1 "Etiqueta ambiental de la DGT: qué etiqueta tiene tu coche".
- Las cinco etiquetas (CERO, ECO, C, B, sin etiqueta), cada una con su pegatina (`DgtSticker`) y sus criterios en lenguaje claro: combustible, años y norma Euro. Los textos salen de `lib/dgt-rules.ts` o de sus constantes; si hay que escribirlos, se ciñen a la Resolución de 13 de abril de 2016 (BOE núm. 96), citada con enlace (`DGT_LEGAL_SOURCE`).
- Calculadora rápida en el cliente: combustible y año (más mes o autonomía cuando se exijan, igual que en el selector de la home), con la etiqueta resultante y un enlace a su ficha `/etiqueta-dgt/<combustible>/<año>` si la ruta existe. Reutiliza `lib/vehicle-selection.ts`, sin duplicar lógica.
- Tabla o rejilla de enlaces a las fichas por combustible y año (las generadas en `lib/etiqueta-routes.ts`), agrupadas por combustible.
- Metadatos y canonical con `absoluteUrl`; incluida en el sitemap; JSON-LD de migas.
- El enlace "Etiqueta DGT" de la cabecera pasa a `/etiqueta-dgt`. Las migas de `/etiqueta-dgt/[combustible]/[anio]` enlazan a `/etiqueta-dgt`.

### Z6.4 Criterios de aceptación

- `npm test` pasa, con pruebas de:
  - Z6.2, sin afiliados;
  - `/etiqueta-dgt`: renderiza las cinco etiquetas, y la cabecera enlaza a `/etiqueta-dgt`;
  - la calculadora rápida da la misma etiqueta que `getOfficialDgtBadge` en dos casos;
  - las de `AdSlot` de la sección 8.5.
- Build: `out/etiqueta-dgt.html` existe y está en el sitemap; `out/index.html` no contiene "Tasación".

## Z7 — Páginas ciudad y etiqueta menos repetidas (19/11/2026)

La auditoría SEO (`../ododex-sitio/docs/09-auditoria-seo-2026-11.md`) mide un 67 % de texto común entre las ~760 páginas `/[ciudad]/[etiqueta]`: solo cambian el nombre de la ciudad y la frase de la regla. Además, las descripciones tienen entre 185 y 240 caracteres y algunos títulos pasan de 90.

`data/zbe-cities.json` no trae calendario de fases ni aparcamientos disuasorios, y no se inventan. El texto nuevo sale de datos que sí existen: la comparación con otras ZBE y los enlaces a las secciones de gasolineras y puntos de recarga de ododex.com. Todas las páginas siguen siendo indexables.

### Z7.1 Enlaces a gasolineras y puntos de recarga del municipio

- Script `scripts/build-municipality-links.mjs`, en Node y sin dependencias:
  - Uso: `node scripts/build-municipality-links.mjs <dist-gasolineras> <dist-puntos-recarga>`. Los argumentos son las carpetas exportadas de `../ododex-sitio`.
  - Para cada ciudad de `data/zbe-cities.json` busca `<dist-gasolineras>/es/gasolineras/provincia/<provincia>/<municipio>.html` y `<dist-puntos-recarga>/es/puntos-recarga/provincia/<provincia>/<municipio>.html`.
  - Primero mira la tabla `MUNICIPALITY_LINK_OVERRIDES` (abajo). Si la ciudad no está en ella, prueba `<slug(province)>/<city.slug>`. `slug` quita las tildes, pasa a minúsculas, cambia por `-` cada tramo que no sea `[a-z0-9]` y quita los `-` de los extremos.
  - Si el fichero no existe, el valor es `null` y se avisa por consola con el slug y la ruta probada.
  - Escribe `data/municipality-links.json` así: `{ "<city.slug>": { "fuel": "<provincia>/<municipio>" | null, "charging": "<provincia>/<municipio>" | null } }`. Las claves van ordenadas por slug, con 2 espacios de sangría y salto de línea final.
  - Al terminar muestra cuántas ciudades tienen cada enlace.
- `MUNICIPALITY_LINK_OVERRIDES` (`slug → { fuel, charging }`; `null` significa que no hay página):

  | slug | fuel | charging |
  |---|---|---|
  | valencia | valencia-valencia/valencia | valencia-valencia/valencia |
  | alicante | alicante/alicante-alacant | alicante-alacant/alacant-alicante |
  | palma | balears-illes/palma-de-mallorca | balears-illes/palma |
  | las-palmas | palmas-las/palmas-de-gran-canaria-las | palmas-las/palmas-de-gran-canaria-las |
  | san-sebastian | gipuzkoa/donostia-san-sebastian | gipuzkoa/donostia-san-sebastian |
  | a-coruna | coruna-a/coruna-a | coruna-a/coruna-a |
  | hospitalet | barcelona/hospitalet-de-llobregat-l | barcelona/hospitalet-de-llobregat-l |
  | pamplona | navarra/pamplona-iruna | navarra/pamplona-iruna |
  | castellon | castellon-castello/castellon-de-la-plana-castello-de-la-plana | castellon-castello/castello-de-la-plana-castellon-de-la-plana |
  | elche | alicante/elche-elx | alicante-alacant/elx-elche |
  | santa-cruz-tenerife | santa-cruz-de-tenerife/santa-cruz-de-tenerife | santa-cruz-de-tenerife/santa-cruz-de-tenerife |
  | logrono | rioja-la/logrono | rioja-la/logrono |
  | las-rozas | madrid/rozas-de-madrid-las | madrid/rozas-de-madrid-las |
  | viladecans | barcelona/viladecans | null |
  | el-prat-de-llobregat | barcelona/prat-de-llobregat-el | barcelona/prat-de-llobregat-el |
  | el-puerto-de-santa-maria | cadiz/puerto-de-santa-maria-el | cadiz/puerto-de-santa-maria-el |
  | la-linea-de-la-concepcion | cadiz/linea-de-la-concepcion-la | cadiz/linea-de-la-concepcion-la |
  | el-ejido | almeria/ejido-el | almeria/ejido-el |
  | torrevieja | alicante/torrevieja | alicante-alacant/torrevieja |
  | orihuela | alicante/orihuela | alicante-alacant/orihuela |
  | torrent | valencia-valencia/torrent | valencia-valencia/torrent |
  | gandia | valencia-valencia/gandia | valencia-valencia/gandia |
  | paterna | valencia-valencia/paterna | valencia-valencia/paterna |
  | benidorm | alicante/benidorm | alicante-alacant/benidorm |
  | sagunto | valencia-valencia/sagunto-sagunt | valencia-valencia/sagunt-sagunto |
  | alcoy | alicante/alcoy-alcoi | alicante-alacant/alcoi-alcoy |
  | san-vicente-del-raspeig | alicante/san-vicente-del-raspeig-sant-vicent-del-raspeig | alicante-alacant/sant-vicent-del-raspeig-san-vicente-del-raspeig |
  | elda | alicante/elda | alicante-alacant/elda |
  | villarreal | castellon-castello/villarreal-vila-real | castellon-castello/vila-real |
  | vitoria-gasteiz | araba-alava/vitoria-gasteiz | araba-alava/vitoria-gasteiz |
  | santiago-de-compostela | coruna-a/santiago-de-compostela | coruna-a/santiago-de-compostela |
  | ferrol | coruna-a/ferrol | coruna-a/ferrol |
  | talavera-de-la-reina | toledo/talavera-de-la-reina | null |
  | telde | palmas-las/telde | palmas-las/telde |
  | santa-lucia-de-tirajana | palmas-las/santa-lucia-de-tirajana | palmas-las/santa-lucia-de-tirajana |
  | arrecife | palmas-las/arrecife | palmas-las/arrecife |
  | calvia | balears-illes/calvia | balears-illes/calvia |
  | ibiza | balears-illes/eivissa | balears-illes/eivissa |
  | manacor | balears-illes/manacor | balears-illes/manacor |
  | calahorra | rioja-la/calahorra | rioja-la/calahorra |
  | melilla | melilla/melilla | null |

- `data/municipality-links.json` se versiona. Es una foto fija: si cambian las secciones, se vuelve a generar a mano. El procedimiento está en `README.md`.
- `lib/municipality-links.ts`:
  - Constantes `FUEL_SECTION_PATH = '/es/gasolineras/provincia'` y `CHARGING_SECTION_PATH = '/es/puntos-recarga/provincia'`.
  - `getMunicipalityLinks(citySlug: string): { fuelHref: string | null; chargingHref: string | null }`. Devuelve rutas desde la raíz del dominio (`/es/gasolineras/provincia/madrid/madrid`), o `null` si no hay página o la ciudad no está en el JSON. No lanza errores.
- Estas rutas están fuera de `basePath`. Se enlazan con `<a href>` normal y nunca con `next/link`, que les añadiría `/es/zbe` delante.

### Z7.2 Textos de comparación: `lib/badge-page-insights.ts`

Funciones puras, sin JSX, que reciben la lista de ciudades (`CityData[]`). El estado de una ciudad para una etiqueta es `city.rules[badge]?.status ?? 'allowed'`, igual que en la página.

Palabras de estado, comunes a todas las frases:

- `allowed` → "puede entrar sin restricciones";
- `restricted` → "tiene restricciones";
- `banned` → "tiene prohibido el acceso".

Funciones:

- `badgeAccessCounts(badge, cities): { allowed: number; restricted: number; banned: number; total: number }`.
- `badgeNationalSentence(badge, cities, badgeLabel): string`.
  - Ejemplo: "De las 152 ZBE de España, la Etiqueta B puede entrar sin restricciones en 30, tiene restricciones en 121 y tiene prohibido el acceso en 1."
  - Solo nombra las categorías mayores que 0, en el orden allowed, restricted, banned, unidas con ", " y " y ".
  - Si todas son de un solo estado: "La Etiqueta X {palabras} en las 152 ZBE de España."
- `sameRegionCities(city, cities, badge, limit = SAME_REGION_LIMIT): Array<{ slug: string; name: string; status: ZbeAccessStatus }>`.
  - Devuelve las ciudades de la misma comunidad, sin la propia. La comunidad se compara con `canonicalRegion(region)` de `lib/regions.ts`.
  - Ordenadas por nombre con `localeCompare(…, 'es')`.
  - `SAME_REGION_LIMIT = 8`.
- `regionSentence(city, cities, badge, badgeLabel): string | null`.
  - Ejemplo: "En Comunidad de Madrid hay 14 ZBE en el mapa. En 12 de las otras 13, la Etiqueta B tiene restricciones, igual que en Madrid."
  - Si ninguna otra lo comparte, la segunda frase es: "En ninguna de las otras 13, la Etiqueta B tiene restricciones como en Madrid."
  - Si todas lo comparten: "En todas las demás, la Etiqueta B tiene restricciones, igual que en Madrid."
  - Con una sola ciudad más, "las otras 1" no vale. La frase queda: "En la otra ZBE de la comunidad, {Ciudad}, la Etiqueta B también {palabras}" o "…, la Etiqueta B no {palabras}".
  - Devuelve `null` si la ciudad es la única de su comunidad.
  - La comunidad se escribe tal como la devuelve `canonicalRegion`.
- `badgeMetaTitle(badgeShortLabel, cityName, year): string`.
  - Formato: "Etiqueta B en la ZBE de Madrid: ¿puede entrar? (2026)".
  - `badgeShortLabel` vale "0 CERO", "ECO", "Etiqueta C", "Etiqueta B" o "Sin etiqueta".
  - Si pasa de `META_TITLE_MAX_LENGTH = 60` caracteres, se quita " (año)". Si aun así pasa, queda "Etiqueta B en la ZBE de {ciudad}".
- `badgeMetaDescription(input: { badgeLabel: string; cityName: string; status: ZbeAccessStatus; fineAmount: number; verified: boolean }): string`.
  - Máximo `META_DESCRIPTION_MAX_LENGTH = 160` caracteres.
  - Verificada: "{Veredicto} con {badgeLabel} en la ZBE de {ciudad}. Multa: {fineAmount} €. Horario, excepciones y mapa."
  - Sin verificar: "{Veredicto} con {badgeLabel} en la ZBE de {ciudad}. Normas orientativas: horario, excepciones y mapa."
  - El veredicto es "Sí se puede entrar", "Se puede entrar con condiciones" o "No se puede entrar".
  - Si pasa del límite, se recorta en el último espacio antes de 159 caracteres y se añade "…".

### Z7.3 Cambios en `app/[ciudad]/[etiqueta]/page.tsx`

- `SLUG_TO_BADGE` incorpora `shortLabel` (los valores de Z7.2).
- `generateMetadata` usa `badgeMetaTitle(shortLabel, …, SEO_CURRENT_YEAR)` y `badgeMetaDescription` para `title`, `description` y `openGraph`. No cambian ni el `h1` ni las preguntas frecuentes.
- Sección nueva "La {label} en otras ZBE", con el texto exacto `La {badgeInfo.label} en otras ZBE`. Va después de las excepciones y antes de las preguntas frecuentes. Contiene:
  - un párrafo con `badgeNationalSentence` y, si no es `null`, `regionSentence`;
  - una rejilla con `sameRegionCities`. Cada elemento enlaza con `next/link` a `/{slug}/{etiqueta}` y muestra el nombre y una etiqueta de estado con la clase de `zbeUiAccessTagClass(status)` y los textos "Permitido", "Restringido" o "Prohibido";
  - si la lista está vacía, no hay rejilla.
- Sección nueva "Repostar y recargar en {ciudad}" (componente `components/MunicipalityServiceLinks.tsx`, props `{ citySlug, cityName }`), colocada justo antes de la sección "Comprobar otras etiquetas…". Contiene:
  - "Precios de las gasolineras de {ciudad} hoy" (`fuelHref`) y "Puntos de recarga en {ciudad}" (`chargingHref`), con `<a>` normal. Si falta uno, se omite ese enlace;
  - una línea con un enlace `next/link` a `/etiqueta-dgt`: "¿No sabes qué etiqueta tiene tu coche? Calcúlala";
  - si no hay ni `fuelHref` ni `chargingHref`, se muestra solo la línea de la etiqueta.
- Se mantienen los estilos de tarjeta que ya existen (`rounded-2xl border border-line bg-elevated/60 p-6`), sin colores nuevos.

### Z7.4 Cambios en `app/[ciudad]/page.tsx`

- El mismo `MunicipalityServiceLinks`, colocado antes del último bloque de enlaces o de la última `AdSlot`.

### Z7.5 Criterios de aceptación

- `npm test` pasa con `tests/badge-page-insights.test.ts`, que cubre:
  - recuentos y frase nacional: varias categorías, una sola y todas `allowed`;
  - comunidad: excluye la propia, orden, límite, `null` si es la única, "ninguna", "todas" y el caso de una sola ciudad más;
  - título: los tres niveles de recorte;
  - descripción: como máximo 160 caracteres en las 152 ciudades por 5 etiquetas con los datos reales, y sin "undefined";
  - `getMunicipalityLinks`: Madrid tiene los dos enlaces; un slug inexistente devuelve `null` y `null`; todas las rutas no nulas empiezan por `/es/gasolineras/provincia/` o por `/es/puntos-recarga/provincia/` y tienen exactamente dos segmentos después.
- `data/municipality-links.json` tiene las 152 ciudades. Al menos 145 tienen `fuel` y al menos 140 tienen `charging`.
- Build: `out/madrid/b.html` contiene "La Etiqueta B en otras ZBE", `href="/es/gasolineras/provincia/madrid/madrid"` y un `<title>` de 60 caracteres o menos.
