import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Radar ZBE España | Mapa Interactivo de Zonas de Bajas Emisiones y Consulta Etiqueta DGT',
  description:
    'Comprueba en qué ciudades y Zonas de Bajas Emisiones (ZBE) puede circular tu vehículo según su etiqueta oficial DGT (0, ECO, C, B o Sin Etiqueta). Mapa interactivo de España en tiempo real.',
  keywords: [
    'ZBE España',
    'Zonas de Bajas Emisiones',
    'Etiqueta DGT',
    'Distintivo Ambiental DGT',
    'Madrid ZBE',
    'Barcelona ZBE',
    'Restricciones coches etiqueta B',
    'Coches sin etiqueta',
    'Multas ZBE 200 euros',
  ],
  authors: [{ name: 'Radar ZBE España' }],
  metadataBase: new URL('https://radar-zbe.es'),
  openGraph: {
    title: 'Radar ZBE España | Buscador Visual y Mapa Interactivo ZBE',
    description:
      'Selecciona tu coche y descubre al instante en qué ciudades de España puedes entrar libremente, con restricciones o prohibición total.',
    type: 'website',
    locale: 'es_ES',
    siteName: 'Radar ZBE España',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
