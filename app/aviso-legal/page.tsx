import { Breadcrumbs } from '@/components/Breadcrumbs';
import { getTitular, valorOPendiente, type Titular } from '@/lib/legal';
import { legalLastReview, legalMetadata } from '@/lib/legal-page';
import { SITE_NAME } from '@/lib/site';

const RUTA = '/aviso-legal';

export const metadata = legalMetadata(
  RUTA,
  'Aviso legal',
  `Aviso legal e información del titular de ${SITE_NAME} conforme al artículo 10 de la LSSI.`
);

export default function AvisoLegalPage() {
  const titular = getTitular();
  const dato = (campo: keyof Titular) => valorOPendiente(titular, campo);

  return (
    <div className="main-wrapper">
      <Breadcrumbs
        items={[
          { name: 'Inicio', url: '/' },
          { name: 'Aviso legal', url: RUTA }
        ]}
      />
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4">Aviso legal</h1>
      <div className="card legal-text">
        <h2>Datos del titular</h2>
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI), se informa de que el titular de este sitio web es:
        </p>
        <ul>
          <li>Titular: {dato('nombre')}</li>
          <li>NIF: {dato('nif')}</li>
          <li>Domicilio: {dato('domicilio')}</li>
          <li>Correo electrónico de contacto: {dato('email')}</li>
          {titular.tipo === 'empresa' && <li>Datos del Registro Mercantil: {dato('registroMercantil')}</li>}
        </ul>

        <h2>Objeto del sitio</h2>
        <p>
          {SITE_NAME} ofrece información orientativa sobre las zonas de bajas emisiones (ZBE) de España y sobre las etiquetas ambientales de la DGT, con un mapa de perímetros y el cálculo de la etiqueta de un vehículo a partir de su combustible y su año de matriculación (o de la serie de su matrícula). Los perímetros y las condiciones de acceso son una referencia: la ordenanza municipal vigente es la que manda.
        </p>

        <h2>Carácter no oficial y orientativo</h2>
        <p>
          Este sitio es independiente. No es una web oficial de la Dirección General de Tráfico (DGT), de ningún ayuntamiento ni de ninguna otra administración pública. La etiqueta calculada para un vehículo es una estimación y no sustituye al distintivo que figura en el Registro de Vehículos de la DGT.
        </p>

        <h2>Limitación de responsabilidad</h2>
        <p>
          El titular procura que los datos sean correctos y estén actualizados, pero no garantiza su exactitud ni su vigencia. No se responsabiliza de las decisiones tomadas ni de las sanciones derivadas del uso de la información. Antes de circular o aparcar en una ZBE, contrasta las condiciones con la ordenanza y los carteles del ayuntamiento correspondiente.
        </p>

        <h2>Propiedad intelectual</h2>
        <p>
          Los textos, el diseño, el código, el logotipo y demás contenidos del sitio son propiedad del titular o se usan con autorización, y están protegidos por la normativa de propiedad intelectual. No se permite su reproducción, distribución o transformación sin permiso expreso, salvo para uso personal y citando la fuente. Los datos cartográficos del mapa son de los colaboradores de OpenStreetMap.
        </p>

        <h2>Enlaces a terceros</h2>
        <p>
          El sitio puede enlazar a páginas de terceros, como el BOE, la sede electrónica de la DGT o las webs municipales. El titular no controla esos sitios ni responde de su contenido o de sus políticas.
        </p>

        <h2>Legislación aplicable</h2>
        <p>
          Este aviso se rige por la legislación española. Para cualquier controversia serán competentes los juzgados y tribunales que correspondan conforme a la normativa aplicable.
        </p>

        <p className="text-xs text-muted">{legalLastReview()}</p>
      </div>
    </div>
  );
}
