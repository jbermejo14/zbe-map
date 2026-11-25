import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AdSenseScript, getAdSenseClient } from '@/components/AdSenseScript';
import { getNetworkSections } from '@/lib/network';
import { fitTitle, socialMetadata } from '@/lib/seo-metadata';
import { getSiteUrl, SITE_NAME } from '@/lib/site';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-jetbrains',
  display: 'swap',
});

/**
 * Fija el tema antes de pintar para evitar el parpadeo: primero la elección guardada
 * y, si no hay, la preferencia del sistema. El try/catch cubre un localStorage no disponible.
 */
const THEME_SCRIPT = `
  (function() {
    var theme = null;
    try {
      var saved = localStorage.getItem('ododex-theme');
      if (saved === 'light' || saved === 'dark') theme = saved;
      if (!theme) {
        var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        theme = prefersDark ? 'dark' : 'light';
      }
    } catch (e) {
      theme = 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
  })();
`;

const DEFAULT_TITLE = fitTitle([
  'Zonas de bajas emisiones (ZBE) en España: mapa y etiqueta DGT',
  'Zonas de bajas emisiones en España: mapa y etiqueta DGT',
  'ZBE en España: mapa y etiqueta DGT',
]);
const DEFAULT_DESCRIPTION =
  'Comprueba en qué ciudades de España puede circular tu vehículo según su etiqueta ambiental de la DGT (0, ECO, C, B o sin etiqueta). Mapa interactivo de ZBE.';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    'ZBE España',
    'zonas de bajas emisiones',
    'etiqueta DGT',
    'distintivo ambiental DGT',
    'ZBE Madrid',
    'ZBE Barcelona',
    'restricciones coches etiqueta B',
    'coches sin etiqueta',
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  ...socialMetadata({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: '/',
    imageAlt: `${SITE_NAME} · Zonas de Bajas Emisiones`,
  }),
  // Sin `robots` global: indexar es el valor por defecto, y un `index, follow` aquí
  // se sumaría al `noindex` que Next pone en la página 404.
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer mostrarConsentimiento={getAdSenseClient() !== null} redSecciones={getNetworkSections()} />
        <AdSenseScript />
      </body>
    </html>
  );
}
