# Radar ZBE España 🚗🗺️

**Radar ZBE España** ([radar-zbe.es](https://radar-zbe.es)) es una plataforma web y motor de SEO programático diseñada para que cualquier conductor en España consulte con veracidad y transparencia las restricciones de acceso, circulación y estacionamiento en las **152 Zonas de Bajas Emisiones (ZBE)** obligatorias bajo la Ley 7/2021 de Cambio Climático.

Toda la lógica de clasificación de distintivos ambientales se rige estrictamente por la **Resolución de 13 de abril de 2016 de la Dirección General de Tráfico (BOE núm. 96)**, y las normativas municipales cuentan con fuente oficial enlazada y fecha de verificación.

---

## 🌟 Características Principales

1. **Clasificación Ambiental Oficial DGT:**
   - Cero Emisiones (Azul): Eléctricos puros (BEV), pila de hidrógeno (FCEV), PHEV con autonomía $\ge 40\text{ km}$.
   - ECO (Verde/Azul): Híbridos no enchufables (HEV/MHEV), PHEV $< 40\text{ km}$, GLP/GNC matriculados a partir de 2006 (Euro 4 o superior).
   - Etiqueta C (Verde): Gasolina matriculados a partir de 2006 (Euro 4, 5 o 6) y Diésel matriculados a partir de septiembre de 2015 (Euro 6).
   - Etiqueta B (Amarilla): Gasolina matriculados entre 2001 y 2005 (Euro 3) y Diésel matriculados entre 2006 y agosto de 2015 (Euro 4 o 5).
   - Sin Distintivo (Categoría A): Gasolina anteriores a 2001, Diésel anteriores a 2006 y vehículos sin homologación mínima.

2. **Comprobador por Matrícula (Estimación Transparente):**
   - Estimación basada en la cronología de series de matriculación en España (sistema post-2000 y provincial).
   - Selector obligatorio de tipo de combustible (gasolina, diésel, híbrido, eléctrico) para cruzar datos reales sin adivinaciones.
   - Etiquetado explícito como **estimación** y enlace directo a la Sede Electrónica de la DGT (`https://sede.dgt.gob.es/es/vehiculos/distintivo-ambiental/`) para confirmación oficial vinculante.

3. **152 Ciudades ZBE Verificadas (`data/zbe-cities.json`):**
   - Cada municipio incluye: estado (`activa` o `en_tramitacion`), horario, importe real de la sanción según ordenanza municipal, periodo de aviso, exenciones tasadas, exigencia de parking y polígono geográfico.
   - Trazabilidad total: cada ficha muestra `sourceUrl` (portal o boletín oficial municipal), `sourceName` y `lastVerified` (fecha en formato ISO).

4. **SEO Programático Basado en Reglas Legales:**
   - `/etiqueta-dgt/[combustible]/[año]`: Clasificación ambiental oficial con desglose completo del acceso en las 152 ciudades de España (permitidas, restringidas y prohibidas).
   - `/zbe/[ciudad]/[etiqueta]`: Respuesta precisa y estructurada a la consulta "¿Puede entrar un coche con etiqueta X en la ZBE de Y?", con horario, multa y parking.
   - `/zbe/[ciudad]`: Guía integral de la ZBE del municipio con mapa interactivo y matriz de las 5 etiquetas.
   - Redirecciones permanentes 301 para URLs antiguas o descatalogadas.
   - Más de 1.000 páginas generadas estáticamente en el build (`SSG`).

5. **Arquitectura Serverless Sin Base de Datos en Runtime:**
   - Se ha eliminado la dependencia de SQLite y Prisma en runtime. Los datos se leen directamente de JSONs versionados en el repositorio (`data/zbe-cities.json` y `data/reference-vehicles.json`), garantizando compatibilidad 100% con Vercel, Cloudflare Pages o Docker.

6. **Monetización Honesta:**
   - Sin precios inventados ni parámetros de tracking ficticios.
   - Enlaces externos con `rel="nofollow noopener noreferrer"`. Parámetros de afiliación configurables mediante variables de entorno documentadas en `.env.example`.

---

## 🛠️ Requisitos Previos e Instalación

### Requisitos:
- Node.js v20.x o v22.x
- npm v10.x

### Instalación:
```bash
# 1. Clonar el repositorio y entrar en el directorio
cd zbe-map

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
```

---

## ⚙️ Variables de Entorno

Definidas y documentadas en `.env.example`:

| Variable | Descripción | Valor por defecto |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SITE_URL` | URL canónica base para SEO, canonical, sitemap y OpenGraph | `https://radar-zbe.es` |
| `NEXT_PUBLIC_MAP_TILE_URL_LIGHT` | URL de teselas del tema claro | CARTO `light_all` |
| `NEXT_PUBLIC_MAP_TILE_URL_DARK` | URL de teselas del tema oscuro | CARTO `dark_all` |
| `NEXT_PUBLIC_MAP_ATTRIBUTION` | Atribución del mapa (HTML) | OpenStreetMap contributors y CARTO |
| `AFFILIATE_CLICARS_TAG` | (Opcional) Tag de afiliación para el portal Clicars | *vacío* |
| `AFFILIATE_RENTING_TAG` | (Opcional) Tag de afiliación para Renting Finders | *vacío* |
| `AFFILIATE_TASACION_TAG` | (Opcional) Tag de afiliación para Compramostucoche | *vacío* |

---

## 🧪 Ejecución de Pruebas (Test Suite Sin Red)

El proyecto incluye una suite completa de pruebas unitarias que se ejecutan de forma local y **sin conexión a internet**:

```bash
npm test
```

### Qué verifican las pruebas:
1. `tests/dgt-rules.test.ts`:
   - Clasificación ambiental exacta según BOE núm. 96 (BEV, PHEV $\ge 40$ km vs $< 40$ km, HEV, Gas $\ge 2006$, fronteras Gasolina 2001/2006 y Diésel 2006/septiembre 2015).
   - Inclusión obligatoria de la cita legal oficial.
2. `tests/city-data.test.ts`:
   - Las 152 ciudades tienen `sourceUrl` oficial válida (HTTP/HTTPS).
   - Ninguna fecha `lastVerified` supera los 120 días de antigüedad.
   - Todas las ciudades tienen definidas reglas para las 5 etiquetas.
3. `tests/city-evaluation.test.ts`:
   - Evaluación ciudad $\times$ distintivo (ej. prohibición de Sin Etiqueta en Madrid y Barcelona, restricciones de parking para B y C).
4. `tests/slugs-404.test.ts`:
   - Manejo estricto de rutas: combustibles inválidos o años fuera de rango devuelven 404 (nunca sustitución de un vehículo por otro).
5. `tests/sitemap.test.ts`:
   - Generación de más de 1.000 URLs canónicas indexables para home, ciudades, ciudades $\times$ etiqueta y combustibles $\times$ año.

---

## 🗺️ Cómo Actualizar los Datos de las Ciudades ZBE

Todas las normativas municipales se encuentran versionadas en:
```
data/zbe-cities.json
```

Para actualizar o añadir una ordenanza municipal:
1. Edita el registro de la ciudad en `data/zbe-cities.json`.
2. Actualiza los campos:
   - `status`: `'activa'` o `'en_tramitacion'`
   - `fineAmount`: importe de la sanción (generalmente 200 €, o el estipulado en la ordenanza municipal).
   - `schedule`: horario exacto de aplicación (ej. `'Lunes a viernes de 7:00 a 20:00'`).
   - `parkingCondition`: condiciones de aparcamiento subterráneo obligatorio si aplica (ej. en Distrito Centro de Madrid).
   - `rules`: objeto con las reglas para `SIN_ETIQUETA`, `B`, `C`, `ECO`, `CERO`.
   - `sourceUrl`: enlace a la web municipal oficial o boletín oficial donde se publicó la ordenanza.
   - `sourceName`: nombre del portal municipal (ej. `'Ayuntamiento de Zaragoza - Movilidad'`).
   - `lastVerified`: fecha de verificación en formato `YYYY-MM-DD`.
3. Ejecuta los tests para certificar la integridad de los datos:
   ```bash
   npm test
   ```
4. Si el test pasa satisfactoriamente, compila para validar la regeneración de páginas:
   ```bash
   npm run build
   ```

---

## 🚀 Despliegue y Build

```bash
# Modo desarrollo local (puerto 3000)
npm run dev

# Compilar para producción (SSG)
npm run build

# Iniciar servidor de producción
npm start
```

---

## 🗺️ Mapas: proveedor de teselas y límites de uso

Las teselas y la atribución se configuran con `NEXT_PUBLIC_MAP_TILE_URL_LIGHT`, `NEXT_PUBLIC_MAP_TILE_URL_DARK` y `NEXT_PUBLIC_MAP_ATTRIBUTION` (valores por defecto en `.env.example`). Por defecto se usan los basemaps de **CARTO** (`light_all` / `dark_all`), que no necesitan clave.

Límites de uso a tener en cuenta:

- Los basemaps públicos de CARTO se ofrecen sujetos a sus términos de servicio: están pensados para proyectos pequeños o no comerciales. Un uso comercial o con mucho tráfico requiere un plan de CARTO o un proveedor propio (comprueba sus condiciones vigentes antes de publicar).
- La atribución a OpenStreetMap y CARTO es obligatoria y se muestra en el mapa; no la elimines.
- Si el proveedor configurado exige clave, las teselas se muestran con la marca de agua "API KEY REQUIRED". Cambia la URL por una que no la exija o añade la clave en la variable.

## 🛡️ Calidad de los datos

- `polygon` es `null` cuando no existe un perímetro oficial real; el mapa muestra solo un marcador en el centro. La prueba `tests/city-data.test.ts` falla si algún polígono es regular o copia la forma de otra ciudad (`lib/polygon-quality.ts`).
- `verificationStatus` es `verified` solo si `sourceUrl` es del ayuntamiento o de su boletín oficial; entonces `lastVerified` lleva fecha. Si no, es `pending`, `lastVerified` es `null` y la web muestra las normas como orientativas.
