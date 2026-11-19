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

`subject` es el sujeto sin artículo: "un coche con etiqueta B", "un coche con etiqueta 0 CERO" o "un coche sin etiqueta". Lo define `SLUG_TO_BADGE.subject` en la página, y el título de la sección sale de `SLUG_TO_BADGE.groupTitle`: "Coches con etiqueta B en otras ZBE".

Palabras de estado, comunes a todas las frases:

- `allowed` → "puede entrar sin restricciones";
- `restricted` → "tiene restricciones";
- `banned` → "tiene prohibido el acceso".

Funciones:

- `badgeAccessCounts(badge, cities): { allowed: number; restricted: number; banned: number; total: number }`.
- `badgeNationalSentence(badge, cities, subject): string`.
  - Ejemplo: "De las 152 ZBE de España, un coche con etiqueta B puede entrar sin restricciones en 30, tiene restricciones en 121 y tiene prohibido el acceso en 1."
  - Solo nombra las categorías mayores que 0, en el orden allowed, restricted, banned, unidas con ", " y " y ".
  - Si todas son de un solo estado: "{Subject con mayúscula} {palabras} en las 152 ZBE de España."
- `sameRegionCities(city, cities, badge, limit = SAME_REGION_LIMIT): Array<{ slug: string; name: string; status: ZbeAccessStatus }>`.
  - Devuelve las ciudades de la misma comunidad, sin la propia. La comunidad se compara con `canonicalRegion(region)` de `lib/regions.ts`.
  - Ordenadas por nombre con `localeCompare(…, 'es')`.
  - `SAME_REGION_LIMIT = 8`.
- `regionSentence(city, cities, badge, subject): string | null`.
  - Ejemplo: "En Comunidad de Madrid hay 14 ZBE en el mapa. En 12 de las otras 13, un coche con etiqueta B tiene restricciones, igual que en Madrid."
  - Si ninguna otra lo comparte, la segunda frase es: "En ninguna de las otras 13, un coche con etiqueta B tiene restricciones como en Madrid."
  - Si todas lo comparten: "En todas las demás, un coche con etiqueta B tiene restricciones, igual que en Madrid."
  - Con una sola ciudad más, "las otras 1" no vale. La frase queda: "En la otra ZBE de la comunidad, {Ciudad}, un coche con etiqueta B también {palabras}" o "…, un coche con etiqueta B no {palabras}".
  - Devuelve `null` si la ciudad es la única de su comunidad.
  - La comunidad se escribe tal como la devuelve `canonicalRegion`.
- `badgeMetaTitle(badgeShortLabel, cityName, year): string`.
  - Formato: "Etiqueta B en la ZBE de Madrid: ¿puede entrar? (2026)".
  - `badgeShortLabel` vale "0 CERO", "ECO", "Etiqueta C", "Etiqueta B" o "Sin etiqueta".
  - Si pasa de `META_TITLE_MAX_LENGTH = 60` caracteres, se quita " (año)". Si aun así pasa, queda "Etiqueta B en la ZBE de {ciudad}".
- `badgeMetaDescription(input: { subject: string; cityName: string; status: ZbeAccessStatus; fineAmount: number; verified: boolean }): string`.
  - Máximo `META_DESCRIPTION_MAX_LENGTH = 160` caracteres.
  - Verificada: "{Subject con mayúscula} {veredicto} en la ZBE de {ciudad}. Multa: {fineAmount} €. Horario, excepciones y mapa."
  - Sin verificar: "{Subject con mayúscula} {veredicto} en la ZBE de {ciudad}. Normas orientativas: horario, excepciones y mapa."
  - Veredictos: "puede entrar sin restricciones", "puede entrar con condiciones" o "no puede entrar".
  - Si pasa del límite, se recorta en el último espacio antes de 159 caracteres y se añade "…".

### Z7.3 Cambios en `app/[ciudad]/[etiqueta]/page.tsx`

- `SLUG_TO_BADGE` incorpora `shortLabel` (los valores de Z7.2).
- `generateMetadata` usa `badgeMetaTitle(shortLabel, …, SEO_CURRENT_YEAR)` y `badgeMetaDescription` para `title`, `description` y `openGraph`. No cambian ni el `h1` ni las preguntas frecuentes.
- Sección nueva "{groupTitle} en otras ZBE" (por ejemplo, "Coches con etiqueta B en otras ZBE"). Va después de las excepciones y antes de las preguntas frecuentes. Contiene:
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
- Build: `out/madrid/b.html` contiene "Coches con etiqueta B en otras ZBE", `href="/es/gasolineras/provincia/madrid/madrid"` y un `<title>` de 60 caracteres o menos.

## Z8 — Perímetros oficiales de las grandes ciudades (19/11/2026)

Los perímetros de Barcelona, Valencia, Zaragoza y Málaga en `data/zbe-cities.json` son aproximados. Por ejemplo, Valencia figura con 3,2 km², pero su capa oficial tiene 27,4 km². Se sustituyen por las capas oficiales de cada ayuntamiento.

Las fuentes originales se versionan en `data/official-perimeters/`; la sesión principal ya las ha descargado:

| Ciudad (slug) | Fichero | Formato y CRS | Origen |
|---|---|---|---|
| barcelona | `barcelona.gpkg` | GeoPackage, tabla `2023_Ambit_ZBE_Barcelona`, columna `geom` MULTIPOLYGON, EPSG:25831 (UTM 31N, ETRS89); columnas `Ambit`, `Perimetre` y `Area` (m², 77 518 354,93) | Open Data BCN, "Àmbit ZBE Barcelona 2023" |
| valencia | `valencia.geojson` | GeoJSON EPSG:4326, 1 Polygon (`zona_zbe` = "València ZBE") | Geoportal de València, capa OPENDATA/Trafico/MapServer/240 |
| zaragoza | `zaragoza.geojson` | GeoJSON EPSG:4326, 2 MultiPolygon (`fase` = "FASE 1" y "FASE 2") que se solapan solo en parte | IDEZar, WFS `movilidad:MU1_ZBE_Zona_Bajas_Emisiones` |
| malaga | `malaga.geojson` | GeoJSON EPSG:4326, 4 entidades: `TIPZBE` 1 = ZBE general (`NOMZBE` "ZBE"); `TIPZBE` 2 = zonas de especial protección "CENTRO HISTORICO", "CAC" y "SOHO" | Datos abiertos de Málaga, `da_cartografiaZonaBajasEmisiones-4326.geojson` |

Las coordenadas pueden traer una tercera componente (altura), que se descarta. ETRS89 se trata como igual a WGS84: la diferencia, por debajo de un metro, no importa para este mapa.

Fuera de alcance:

- Madrid: el CSV de cámaras que hay no es un perímetro.
- Los textos de cada ciudad (`summary`, `rules`, `streets`, `schedule`), que no se tocan.

### Z8.1 `lib/perimeter-geometry.ts` (funciones puras, sin dependencias)

- `utmToWgs84(zone: number, easting: number, northing: number): { lat: number; lng: number }`:
  - Inversa de la proyección UTM, hemisferio norte, elipsoide GRS80 (a = 6378137, 1/f = 298.257222101).
  - Precisión mejor que 1e-6 grados.
  - Constantes con nombre (`UTM_SCALE_FACTOR = 0.9996`, `UTM_FALSE_EASTING = 500000`…).
- `parseGpkgGeometry(blob: Uint8Array): number[][][][]`:
  - Lee la cabecera GeoPackage: "GP", versión, flags, srs_id, y una envoltura cuyo tamaño depende de los bits 1-3 de flags (0, 32, 48, 48 o 64 bytes).
  - Después lee el WKB, respetando el orden de bytes de cada geometría.
  - Admite Polygon (3) y MultiPolygon (6), y siempre devuelve una lista de polígonos, cada uno como lista de anillos `[x, y][]`.
  - Cualquier otro tipo, o una cabecera que no empiece por "GP", lanza `Error` con un mensaje que diga qué se encontró.
- `simplifyRing(ring: [number, number][], toleranceMeters: number): [number, number][]`:
  - Douglas-Peucker sobre `[lng, lat]`, con las distancias en metros mediante una proyección equirectangular local.
  - Conserva el cierre (el primer punto igual al último) y nunca devuelve menos de 4 puntos.
- `ringAreaKm2(ring: [number, number][]): number`:
  - Área geodésica aproximada de un anillo `[lng, lat]`, con la misma fórmula esférica que Leaflet/Turf (radio 6 371 008,8 m).
  - Valor absoluto.
- `roundCoordinate(value: number): number`: 6 decimales.

### Z8.2 Script `scripts/import-official-perimeters.ts`

- Uso: `node --experimental-sqlite --import tsx scripts/import-official-perimeters.ts`.
  - Node 22.12 necesita la opción para `node:sqlite`.
  - Se añade el script npm `perimeters:import` con ese comando.
- Tabla `PERIMETER_SOURCES` (una entrada por ciudad) con:
  - `slug`;
  - `file`;
  - `format` ('geojson' | 'gpkg');
  - `utmZone` (solo gpkg: 31);
  - `perimeterName`;
  - `sourceName`;
  - `sourceUrl`;
  - una función o regla para nombrar cada entidad;
  - cuál es la entidad principal.

  Valores:

  - barcelona:
    - `perimeterName` "ZBE Rondes de Barcelona";
    - `sourceName` "Open Data BCN (Ajuntament de Barcelona)";
    - `sourceUrl` "https://opendata-ajuntament.barcelona.cat/data/es/dataset/zbe-ambit";
    - una entidad, de nombre "ZBE Rondes de Barcelona".
  - valencia:
    - `perimeterName` "ZBE de València";
    - `sourceName` "Geoportal del Ajuntament de València";
    - `sourceUrl` "https://geoportal.valencia.es/";
    - una entidad, de nombre "ZBE de València".
  - zaragoza:
    - `perimeterName` "ZBE de Zaragoza (fases 1 y 2)";
    - `sourceName` "IDEZar (Ayuntamiento de Zaragoza)";
    - `sourceUrl` "https://idezar-sig.zaragoza.es/servicios/geoserver/movilidad/wfs?service=WFS&version=2.0.0&request=GetCapabilities";
    - entidades "ZBE Zaragoza · Fase 1" y "ZBE Zaragoza · Fase 2";
    - la principal es la de mayor área (Fase 2).
  - malaga:
    - `perimeterName` "ZBE de Málaga";
    - `sourceName` "Datos Abiertos del Ayuntamiento de Málaga";
    - `sourceUrl` "https://datosabiertos.malaga.eu/dataset/sistema-de-informacion-cartografica-zona-bajas-emisiones";
    - la entidad principal es la de `TIPZBE` 1, con nombre "ZBE de Málaga";
    - las de `TIPZBE` 2 se llaman "Zona de especial protección: Centro Histórico", "…: CAC" y "…: Soho".
- Por cada ciudad:
  1. Lee las entidades. Si son GPKG, las pasa a `[lng, lat]` con `utmToWgs84`.
  2. Simplifica cada anillo con `SIMPLIFY_TOLERANCE_METERS = 5` y redondea con `roundCoordinate`.
  3. Si la ciudad pasa de `MAX_VERTICES_PER_CITY = 800` vértices en total, repite la simplificación duplicando la tolerancia hasta quedar por debajo. Informa por consola de la tolerancia final y de los vértices de cada ciudad.
  4. Sustituye en `data/zbe-cities.json`:
     - `geoJSON`: una FeatureCollection con una Feature por entidad, de tipo Polygon o MultiPolygon, con `properties: { nombre, descripcion }`. En `descripcion` va `city.summary` en la principal y el nombre de la zona en las demás.
     - `polygon`: el anillo exterior del polígono más grande de la entidad principal, como `[lat, lng][]`.
     - `areaKm2`: la suma de `ringAreaKm2` de los anillos exteriores de la entidad principal, menos los huecos, redondeada a 1 decimal.
     - `perimeterName`.
     - `perimeterSource`: `{ name, url, retrieved: '2026-11-19' }`.
  5. No toca ningún otro campo ni ninguna otra ciudad.
- El JSON se escribe con el mismo formato que tiene ahora (sangría, orden de claves y salto de línea final), para que el diff solo muestre los campos cambiados. Compruébalo con `git diff --stat`.
- Si falta un fichero, o una entidad esperada (por ejemplo, Málaga sin `TIPZBE` 1), el script lanza un error con la ciudad y el motivo, y no escribe nada.

### Z8.3 Tipo y mapas

- `CityData` (`lib/cities-repository.ts`) gana `perimeterSource?: { name: string; url: string; retrieved: string } | null`.
- `components/CityMiniMap.tsx`:
  - Acepta una prop opcional `geoJSON`. Si la recibe, dibuja todas sus entidades con `L.geoJSON`, con el mismo estilo que el polígono actual, y encuadra el mapa en sus límites.
  - Si no la recibe, mantiene el comportamiento actual con `polygon`.
  - `app/[ciudad]/page.tsx` y `app/[ciudad]/[etiqueta]/page.tsx` le pasan `city.geoJSON`.
- Debajo del mini mapa de las dos páginas, si hay `perimeterSource`, se muestra la línea "Perímetro oficial: {name}", con un enlace `<a rel="nofollow noopener noreferrer" target="_blank">` a `url`.
- `SpainZbeMap` ya pinta `geoJSON`: no se cambia.

### Z8.4 Criterios de aceptación

- `tests/perimeter-geometry.test.ts`:
  - `utmToWgs84(30, 729254.0972, 4372169.142)` da lat 39.468590647 y lng -0.334989633, con un error menor que 1e-6. Es el primer vértice de Valencia en EPSG:25830 y en EPSG:4326, publicado por la misma fuente.
  - `parseGpkgGeometry`:
    - con un blob construido en la prueba (cabecera sin envoltura y un Polygon WKB little-endian) devuelve los puntos;
    - con una cabecera "XX" lanza un error.
  - `simplifyRing` conserva el cierre, no baja de 4 puntos y quita un punto colineal.
  - `ringAreaKm2` de un cuadrado de 0,01° en el ecuador da ≈ 1,2364 km² (±0,1 %).
- `tests/city-data.test.ts` sigue pasando. En particular, ningún polígono es regular ni sintético.
- Prueba nueva en `tests/official-perimeters.test.ts`, sobre `data/zbe-cities.json`:
  - las cuatro ciudades tienen `perimeterSource`;
  - Barcelona tiene un `areaKm2` entre 76 y 79 (el GPKG dice 77,5);
  - Valencia, entre 26 y 29;
  - Málaga, entre 3,5 y 4,5;
  - Zaragoza tiene 2 entidades y Málaga 4;
  - ninguna ciudad pasa de 800 vértices;
  - todas las coordenadas están dentro de España (lat entre 27 y 44, lng entre -19 y 5).
- Build:
  - `out/valencia.html` contiene "Perímetro oficial";
  - el tamaño de `out/index.html` no crece más de un 15 % respecto al anterior (indica los dos tamaños).

## Z9 — Estado real de cada ZBE con Atlas ZBE (19/11/2026)

### Contexto

`data/zbe-cities.json` da casi todas las ciudades como ZBE activa con prohibiciones. El dataset abierto **Atlas ZBE** (https://atlaszbe.es, repositorio `marcc992/atlaszbe-datos`, licencia ODbL 1.0, contenidos DbCL 1.0) contrasta cada zona con fuentes oficiales. Cruzado con nuestras 152 ciudades:

- 91 tienen zona en Atlas ZBE. De ellas solo unas 57 multan hoy; el resto están en aviso, solo restringen en episodios de contaminación, aprobadas sin aplicar o suspendidas.
- 51 están en el inventario del MITECO **sin zona en vigor** (`en_tramite` o `pendiente`), pero nosotros les mostramos prohibiciones.
- 10 no salen por nombre. De ellas, 3 se resuelven con el código INE: palma = 07040, castellon = 12040, siero = 33066. Las otras 7 (torrent, portugalete, santurtzi, manacor, teruel, tudela, calahorra) no están en el inventario y se quedan con nuestros datos.

El titular ha aceptado la licencia, con estas condiciones:

- citar "Atlas ZBE" y sus fuentes en la web;
- `data/zbe-cities.json` pasa a ser una base de datos derivada bajo ODbL 1.0.

Los textos editoriales de Atlas ZBE (`editorial.resumen`, `calendario[].hito`, `excepciones[].descripcion`, etc.) **no se copian**. Los textos se generan a partir de los campos estructurados. La única excepción es `reglas[].nota`, que se puede mostrar como matiz de la regla.

Copia local de solo lectura en `data/atlaszbe/` (commit `272f81af7c`, del 15/11/2026): `zonas.json`, `municipios.json`, `meta.json`, `ATRIBUCION.md` y `LICENSE-DbCL`.

- El esquema completo está en https://github.com/marcc992/atlaszbe-datos/tree/main/schema.
- Campos que se usan de cada zona en `zonas.json` → `zonas[]`:
  - `id`, `nombre`, `municipioIne`, `municipio`, `estado`;
  - `estadoSancion`, con los valores sanciona | aviso | aprobada_sin_aplicar | solo_episodios | suspendida | sin_restricciones | sin_verificar;
  - `fechas { multasDesde, avisosHasta, proximoCambio }`;
  - `confianza`, con los valores alta | media | baja;
  - `reglas[]`;
  - `editorial.multa { importe, prontoPago }`;
  - `urlOficial`, `verificadoEl`;
  - `geometria`, en GeoJSON EPSG:4326 (MultiPolygon o Polygon) ya simplificada a unos 5 m;
  - `geometriaPrecision`, con los valores oficial | aproximada.
- `reglas[]`:
  - `acceso`: prohibido | solo_autorizados | condicionado | solo_aparcamiento;
  - `alcance`: zona | calles_senalizadas;
  - `etiquetas`: "0" | "ECO" | "C" | "B" | "A";
  - `perfil`: todos | no_domiciliados | domiciliados | residentes_zona;
  - `vehiculos`: "todos" o `{ tipos?: (turismo|moto|ciclomotor|furgoneta|camion|autobus)[], combustible?: diesel|gasolina }`;
  - `condicion`: siempre | episodio_contaminacion;
  - `sanciona`: boolean;
  - `desde` y `hasta`: fecha o null;
  - `horario`: `{ dias: L-V|L-S|L-D, tramos: [{desde, hasta}], festivos: boolean }` o null;
  - `nota`: string o null.
- `municipios.json` → `municipios[]`: `{ ine, nombre, provincia, ccaa, estadoInventario: vigente|en_tramite|pendiente|sin_dato, zonas: string[], inventarioActualizado }`.

Equivalencia de etiquetas: "0" es CERO, "ECO" es ECO, "C" es C, "B" es B y "A" es SIN_ETIQUETA.

### Z9.1 `lib/atlas-zbe.ts` (funciones puras, sin E/S)

Tipos `AtlasZone`, `AtlasRule` y `AtlasMunicipality`, que reflejan los campos anteriores.

- `matchCityToMunicipality(cityName, municipalities, overrides): AtlasMunicipality | null`.
  - Normaliza los nombres: sin tildes, minúsculas y solo `[a-z0-9 ]`.
  - Las variantes de un nombre son el nombre entero, cada parte separada por "/" o " - ", y cada una de esas sin artículo inicial (el, la, los, las, a, l).
  - Coincide si comparte alguna variante.
  - `overrides` es `Record<citySlug, ine>` y tiene prioridad.
  - La constante `ATLAS_INE_OVERRIDES = { palma: '07040', castellon: '12040', siero: '33066' }` se usa con el slug de la ciudad. Por eso la función recibe `{ slug, name }` en lugar de solo el nombre.
- `isRuleActive(rule, onDate): boolean`: `desde` es null o ≤ onDate, y `hasta` es null o ≥ onDate (`hasta` es el último día en vigor, inclusive: en los datos, la regla siguiente empieza al día siguiente). Las fechas son ISO `YYYY-MM-DD` y se comparan como texto.
- `pickMainZone(zones): AtlasZone`: la de mayor área según `ringAreaKm2` de `lib/perimeter-geometry.ts`, sumando los anillos exteriores. En caso de empate, la primera. Solo decide la geometría, la multa y el nombre de la zona principal; el estado de la ciudad sale de `cityEnforcementZone`.
- `cityEnforcementZone(zones): AtlasZone`: la zona con el `estadoSancion` más severo, con esta prioridad: sanciona > aviso > aprobada_sin_aplicar > solo_episodios > sin_restricciones > suspendida > sin_verificar. Si hay empate, gana la principal y después la primera. Con ella se calculan el estado, `status`, `enforcement` y la excepción de "todas allowed". Así se evita que una zona grande sin restricciones tape a una subzona que multa (Valencia, Alicante, Zaragoza, Salamanca, Ciudad Real, Jerez).
- `badgeAccessFromAtlas(badge, zones, mainZone, onDate): { status: ZbeAccessStatus; rules: AtlasRule[] }`. Tiene en cuenta las reglas de todas las zonas del municipio:
  - `rs` son las reglas activas en `onDate` con `condicion === 'siempre'` que incluyen la etiqueta.
  - `banned` si alguna regla de `rs` de la **zona principal** cumple a la vez: `acceso` ∈ {prohibido, solo_autorizados}, `perfil` ∈ {todos, no_domiciliados} y `alcance === 'zona'`.
  - `restricted` si `rs` no está vacía y no se da el caso anterior. Esto cubre subzonas, solo_aparcamiento, condicionado, domiciliados y calles señaladas.
  - `allowed` si `rs` está vacía.
  - Devuelve también las reglas que han decidido el estado, para redactar el motivo.
- `formatSpanishDate('2025-01-01') → '1 de enero de 2025'`.
- `scheduleText(horario): string`:
  - L-V → "De lunes a viernes", L-S → "De lunes a sábado", L-D → "Todos los días";
  - el tramo 00:00-24:00 → "a todas horas";
  - los demás tramos, "de 07:00 a 20:00", unidos con " y ";
  - si `festivos === false`, se añade ", excepto festivos";
  - `horario` null → "Horario no especificado".
- `ruleSentence(rule, ctx: { cityName: string; zoneName: string | null }): string`. Redacta la regla en una frase:
  - Sujeto. Etiquetas, en el orden A, B, C, ECO, 0: A → "sin etiqueta", B → "con etiqueta B", C → "con etiqueta C", ECO → "con etiqueta ECO", 0 → "con etiqueta 0 CERO". Las partes se unen con ", " y " y ", compartiendo "con etiqueta": "con etiqueta B y C". Si hay A y otras: "sin etiqueta y con etiqueta B".
  - Vehículos. Con `vehiculos.tipos`: turismo → "turismos", moto → "motos", ciclomotor → "ciclomotores", furgoneta → "furgonetas", camion → "camiones", autobus → "autobuses", unidos con ", " y " y ". Si no, "vehículos". Con `combustible`, se añade " diésel" o " de gasolina" tras el tipo.
  - Perfil: no_domiciliados → " no domiciliados en {ciudad}", domiciliados → " domiciliados en {ciudad}", residentes_zona → " que no residen en la zona". Ojo: `residentes_zona` significa que la regla afecta a quienes no residen. Si al probarlo con los datos reales no encaja, se usa " según su residencia en la zona" y se avisa en el informe.
  - Acceso: prohibido → "no pueden circular", solo_autorizados → "solo pueden entrar con autorización", condicionado → "pueden entrar con condiciones", solo_aparcamiento → "solo pueden entrar para aparcar en un aparcamiento".
  - Lugar: con `zoneName` → " en {zoneName}"; con `alcance === 'calles_senalizadas'` → " en las calles señalizadas".
  - Inicio: "Desde el {fecha}, " si hay `desde`.
  - Horario: ", " + `scheduleText` en minúscula inicial.
  - Si `sanciona === false`: " (en periodo de aviso, sin multa)".
  - La frase termina en "." y empieza en mayúscula.
  - Ejemplo: "Desde el 1 de enero de 2025, los turismos sin etiqueta no domiciliados en Madrid no pueden circular, todos los días a todas horas."
- `enforcementSummary(mainZone): { state, label, sentence }`. `label` es corto, para una etiqueta visual. Las frases van con fechas formateadas:
  - sanciona → "Se multa", "Las restricciones están en vigor y se multa{ desde el X si multasDesde}.";
  - aviso → "Periodo de aviso", "Hay restricciones, pero en periodo de aviso: todavía no se multa{ hasta el X si avisosHasta}.";
  - aprobada_sin_aplicar → "Aprobada, sin aplicar", "La ZBE está aprobada, pero las restricciones empiezan más adelante{: el X si proximoCambio o multasDesde}.";
  - solo_episodios → "Solo en episodios", "Solo hay restricciones durante los episodios de alta contaminación.";
  - suspendida → "Suspendida", "La ZBE está anulada o suspendida: ahora no hay restricciones.";
  - sin_restricciones → "Sin restricciones", "La zona existe, pero no restringe el acceso.";
  - sin_verificar → "Sin confirmar", "El estado de esta ZBE no está confirmado.".
- `inventorySummary(municipality): { state, label, sentence }`:
  - en_tramite → "En tramitación", "{Ciudad} tiene la ZBE en tramitación: todavía no hay restricciones de acceso por etiqueta.";
  - pendiente → "Pendiente", "{Ciudad} aún no ha aprobado su ZBE: todavía no hay restricciones de acceso por etiqueta.".
- `calendarEntries(zones, mainZone, cityName): Array<{ date: string; text: string; badges: DgtBadgeType[] }>`. Una entrada por cada regla con `desde` (texto `ruleSentence` sin el "Desde el …, " inicial y con mayúscula; `badges` = sus etiquetas convertidas). Además:
  - `multasDesde` → "Empiezan las multas." (`badges` vacío = general);
  - `avisosHasta` → "Termina el periodo de aviso.";
  - `proximoCambio` → "Próximo cambio previsto en la ZBE.".
  - Orden por fecha y sin duplicados exactos.

### Z9.2 Importación: `scripts/import-atlaszbe.ts` y datos

- Uso: `npx tsx scripts/import-atlaszbe.ts [--fecha YYYY-MM-DD]`. Sin `--fecha`, toma la fecha de hoy.
  - Script npm `atlaszbe:import`.
  - La fecha queda en cada ciudad como `enforcement.importedOn` y es la fecha con la que se evalúan las reglas.
- Lee `data/atlaszbe/zonas.json` y `municipios.json` y modifica `data/zbe-cities.json` conservando su formato: 2 espacios y sin salto de línea final, como ahora.
- **Ciudad con municipio y zonas** (`zonas` no vacío; solo se usan las zonas de ese municipio):
  - `enforcement`: `{ source: 'atlaszbe', state, label, sentence, finesFrom, warningUntil, nextChange, confidence, verifiedOn, officialUrl, importedOn, mainZoneName, calendar }`.
    - `state`, `label` y `sentence` salen de `enforcementSummary`.
    - `calendar` sale de `calendarEntries`.
  - `rules`: si `state` es `sin_verificar`, no se tocan. En los demás casos, para cada una de las 5 etiquetas:
    - `status` sale de `badgeAccessFromAtlas`. Excepción: si `state` es solo_episodios, suspendida o sin_restricciones, todas quedan en `allowed`.
    - `reason` se forma con las frases `ruleSentence` de las reglas que han decidido (como mucho 2) y la `nota` de la primera si existe.
    - Si queda `allowed`, `reason` es "No hay restricciones en vigor para esta etiqueta." más la `sentence` del estado cuando no es sanciona ni aviso.
  - `status`:
    - sanciona, aviso o solo_episodios → 'activa';
    - aprobada_sin_aplicar → 'en_tramitacion';
    - suspendida o sin_restricciones → 'suspendida'. Es un valor nuevo del tipo: revisa sus usos con grep en `app/`, `components/` y `lib/`, y dale texto "suspendida" donde se muestre.
  - `fineAmount`: `editorial.multa.importe` de la zona principal si no es null.
  - `schedule`: `scheduleText` de la primera regla activa `siempre` de cualquier zona del municipio (primero la de `cityEnforcementZone`) que restrinja alguna etiqueta. Si no hay ninguna, "Sin restricciones en vigor".
  - `sourceUrl`: `urlOficial` de la zona principal si existe. `sourceName`: "{mainZone.nombre} (fuente oficial, vía Atlas ZBE)".
  - Verificación: si `confianza === 'alta'` y `verificadoEl` tiene menos de 120 días respecto a `importedOn`, se pone `verificationStatus 'verified'` y `lastVerified = verificadoEl`. Si no, 'pending' y `null`. La prueba de `tests/city-data.test.ts` ya exige esto.
  - Geometría: si la ciudad **no** es una de Z8 (barcelona, valencia, zaragoza, malaga) y la zona principal tiene `geometriaPrecision === 'oficial'`:
    - `geoJSON` lleva una Feature por zona del municipio, con `properties { nombre: zona.nombre, descripcion: enforcement.sentence }`;
    - `polygon` es el anillo exterior del polígono mayor de la zona principal, en [lat,lng];
    - `areaKm2` se calcula como en Z8;
    - `perimeterName` es `mainZone.nombre`;
    - `perimeterSource` es `{ name: 'Atlas ZBE (geometría oficial)', url: urlOficial ?? 'https://atlaszbe.es', retrieved: importedOn }`;
    - se simplifica con `simplifyRing`, empezando en 5 m y con un tope de 800 vértices por ciudad, como en Z8. Reutiliza las funciones de `lib/perimeter-geometry.ts` y no dupliques el bucle: si hace falta, mueve el bucle de Z8 a una función exportada de esa librería.
    - En los demás casos no se toca la geometría.
- **Ciudad con municipio sin zonas** y `estadoInventario` en_tramite o pendiente:
  - `enforcement = { source: 'miteco', state, label, sentence, inventoryUpdated: inventarioActualizado, importedOn }`, con los valores de `inventorySummary`;
  - las 5 `rules` quedan en `allowed` y `reason` = `sentence`;
  - `status 'en_tramitacion'`;
  - `schedule` "Sin restricciones en vigor";
  - `polygon`, `geoJSON`, `areaKm2`, `perimeterName` y `streets` pasan a `null`, porque no hay zona aprobada y el perímetro anterior era aproximado;
  - `parkingCondition` pasa a `null`;
  - `exemptions` se queda vacío;
  - verificación: `verified` con `lastVerified = inventarioActualizado` si tiene menos de 120 días; si no, pending y null;
  - `sourceName` = "Inventario de ZBE del MITECO (vía Atlas ZBE)" y `sourceUrl` = "https://atlaszbe.es".
- Municipio con `sin_dato`, o ciudad sin municipio: no se toca nada y `enforcement` queda en `null`.
- `CityData` gana `enforcement?: CityEnforcement | null`, con el tipo exportado en `lib/cities-repository.ts`. `status` admite 'suspendida'.
- Al terminar, el script muestra un recuento por `enforcement.state`, por `source` y por etiqueta (allowed, restricted y banned), y la lista de ciudades sin municipio. Esa lista debe ser exactamente: torrent, portugalete, santurtzi, manacor, teruel, tudela, calahorra.
- Si falta un fichero, o un override apunta a un INE inexistente, lanza un error y no escribe nada.
- Licencia:
  - `data/LICENSE.md` explica que `data/zbe-cities.json` es una base de datos derivada de Atlas ZBE bajo ODbL 1.0 (enlace https://opendatacommons.org/licenses/odbl/1-0/), con los contenidos bajo DbCL 1.0, y lista las fuentes de `data/atlaszbe/ATRIBUCION.md`;
  - apartado en `README.md` con la licencia de los datos y cómo reimportar: actualizar la copia de `data/atlaszbe/` y ejecutar `npm run atlaszbe:import` y después `npm run perimeters:import`, en ese orden, para que las 4 ciudades de Z8 mantengan su geometría.

### Z9.3 Interfaz

- `components/EnforcementNotice.tsx` (`{ enforcement, cityName }`):
  - tarjeta con la etiqueta `label` y `sentence`;
  - si `source === 'atlaszbe'`: "Verificado el {fecha de verifiedOn} con fuentes oficiales" y un enlace a `officialUrl` con `rel="nofollow noopener noreferrer"` y `target="_blank"`;
  - si `source === 'miteco'`: "Según el inventario de ZBE del MITECO (actualizado el {fecha})";
  - colores con los tokens que ya existen: positive para suspendida, sin_restricciones, en_tramite y pendiente; warning para aviso, aprobada_sin_aplicar, solo_episodios y sin_verificar; negative para sanciona;
  - va en `app/[ciudad]/page.tsx` y `app/[ciudad]/[etiqueta]/page.tsx`, justo debajo del `h1`;
  - si `enforcement` es null, no se muestra.
- `components/ZbeCalendar.tsx` (`{ entries, cityName, badge?: DgtBadgeType }`):
  - sección "Calendario de la ZBE de {ciudad}" con una lista de fecha (`formatSpanishDate`) y texto;
  - con `badge`, solo las entradas generales (`badges` vacío) o las que incluyen esa etiqueta, con el título "Calendario para {groupTitle en minúscula} en {ciudad}";
  - las entradas futuras respecto a `importedOn` llevan la marca "Próximamente";
  - sin entradas no se muestra;
  - va en las dos páginas, después de la tarjeta de normativa o veredicto.
- Página de etiqueta:
  - el texto del veredicto ya sale de `rule.reason`;
  - la tarjeta "Multa" muestra "Sin multa" si `enforcement.state` no es sanciona;
  - la FAQ de multa, si `enforcement` existe y el estado no es sanciona, responde con `enforcement.sentence`.
- Atribución en todas las páginas de la sección: una línea en el pie (componente del pie que ya existe) con el texto "Datos de las ZBE: Atlas ZBE (ODbL 1.0), DGT, MITECO y ayuntamientos.". "Atlas ZBE" enlaza a https://atlaszbe.es y "ODbL 1.0" a la licencia.
- `generateMetadata` de la página de etiqueta no cambia: la descripción ya sale del estado de la regla.

### Z9.4 Criterios de aceptación

- `tests/atlas-zbe.test.ts`, con datos de prueba construidos en la propia prueba, que cubre:
  - `matchCityToMunicipality` con "Alcoy / Alcoi", "El Ejido" contra "Ejido, El", y el override;
  - `isRuleActive` en los bordes;
  - `badgeAccessFromAtlas`: banned en la zona principal, restricted en una subzona, restricted por solo_aparcamiento, allowed por episodio, allowed por regla futura y no_domiciliados → banned;
  - `ruleSentence` con el ejemplo de Madrid, con el plural de tipos y etiquetas, y con el aviso;
  - `scheduleText` en sus casos;
  - `enforcementSummary` e `inventorySummary` en todos los estados;
  - `calendarEntries`: orden y filtro por etiqueta.
- `tests/atlas-import.test.ts`, sobre `data/zbe-cities.json` ya importado:
  - madrid: `enforcement.state` = 'sanciona' y `rules.SIN_ETIQUETA.status` = 'banned';
  - ninguna ciudad con `enforcement.source === 'miteco'` tiene `polygon` ni reglas distintas de `allowed`;
  - las 7 ciudades sin municipio tienen `enforcement` null;
  - ningún `reason` contiene "undefined" ni "null";
  - todas las fechas de `calendar` son ISO válidas.
- `tests/city-data.test.ts` y el resto siguen pasando. Si alguna prueba antigua contradice los datos nuevos, por ejemplo una que espere B restringida en Madrid, se corrige la prueba para reflejar la fuente y se explica en el informe.
- Build:
  - `out/madrid.html` contiene "Se multa" y "Calendario de la ZBE de Madrid";
  - `out/gijon.html` contiene "En tramitación";
  - el pie contiene "Atlas ZBE".
