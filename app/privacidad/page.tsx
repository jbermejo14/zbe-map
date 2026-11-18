import { Breadcrumbs } from '@/components/Breadcrumbs';
import { getTitular, valorOPendiente, type Titular } from '@/lib/legal';
import { legalLastReview, legalMetadata } from '@/lib/legal-page';
import { SITE_NAME } from '@/lib/site';

const RUTA = '/privacidad';
const URL_AEPD = 'https://www.aepd.es';

export const metadata = legalMetadata(
  RUTA,
  'Política de privacidad',
  `Cómo trata ${SITE_NAME} los datos personales conforme al RGPD.`
);

export default function PrivacidadPage() {
  const titular = getTitular();
  const dato = (campo: keyof Titular) => valorOPendiente(titular, campo);

  return (
    <div className="main-wrapper">
      <Breadcrumbs
        items={[
          { name: 'Inicio', url: '/' },
          { name: 'Privacidad', url: RUTA }
        ]}
      />
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4">Política de privacidad</h1>
      <div className="card legal-text">
        <h2>Responsable del tratamiento</h2>
        <p>
          Responsable: {dato('nombre')}, con NIF {dato('nif')} y domicilio en {dato('domicilio')}. Contacto: {dato('email')}.
        </p>

        <h2>Qué datos se tratan</h2>
        <p>
          Esta web no tiene cuentas de usuario ni envía formularios a ningún servidor. La matrícula que escribes se procesa solo en tu navegador y no se envía a ningún servidor: la estimación de la etiqueta DGT se calcula en tu dispositivo. Lo mismo ocurre con el vehículo que eliges. El tema claro u oscuro se guarda en el almacenamiento local de tu navegador.
        </p>
        <ul>
          <li>
            Mapas: para dibujar el mapa, tu navegador pide imágenes (teselas) a tile.openstreetmap.org, servicio de la Fundación OpenStreetMap. Ese tercero recibe tu dirección IP y los datos técnicos de la petición. No instala cookies. La base jurídica es el interés legítimo de mostrar el mapa.
          </li>
          <li>
            Capa «Satélite» del mapa: solo si eliges esa capa, tu navegador pide las imágenes a services.arcgisonline.com, servicio de Esri Global Inc. Ese tercero recibe tu dirección IP y los datos técnicos de la petición. No instala cookies. La base jurídica es el interés legítimo de mostrar el mapa.
          </li>
          <li>
            Correo electrónico: si nos escribes, usamos tu mensaje y tu dirección para responderte. La base jurídica es el interés legítimo o tu solicitud.
          </li>
          <li>
            Registros técnicos del servidor: el proveedor de alojamiento puede registrar la dirección IP y datos técnicos de la visita por motivos de seguridad. La base jurídica es el interés legítimo.
          </li>
          <li>
            Publicidad: si está activada, usamos Google AdSense (Google Ireland Ltd.), que puede instalar cookies y tratar datos del dispositivo solo si das tu consentimiento. Consulta la política de cookies.
          </li>
        </ul>

        <h2>Transferencias internacionales</h2>
        <p>
          Google y Esri pueden transferir datos a Estados Unidos. Lo hacen con cláusulas contractuales tipo de la Comisión Europea y, cuando aplica, bajo el Marco de Privacidad de Datos UE-EE. UU.
        </p>

        <h2>Plazos de conservación</h2>
        <p>
          Los correos se conservan el tiempo necesario para atender tu consulta y, después, durante los plazos legales de posible responsabilidad. Los registros técnicos se conservan según la política del proveedor de alojamiento. Los datos de publicidad dependen de Google y de tu consentimiento, que puedes retirar cuando quieras.
        </p>

        <h2>Tus derechos</h2>
        <p>
          Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad escribiendo a {dato('email')}, indicando el derecho que ejercitas. Puedes retirar el consentimiento en cualquier momento desde el botón «Configurar cookies» del pie de página, si está disponible.
        </p>

        <h2>Reclamaciones</h2>
        <p>
          Si crees que se han vulnerado tus derechos, puedes reclamar ante la Agencia Española de Protección de Datos (AEPD): <a href={URL_AEPD} target="_blank" rel="noopener noreferrer">aepd.es</a>.
        </p>

        <p className="text-xs text-muted">{legalLastReview()}</p>
      </div>
    </div>
  );
}
