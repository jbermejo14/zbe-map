import type { NextConfig } from 'next';

// Debe coincidir con BASE_PATH de lib/site.ts (lo comprueba tests/site.test.ts).
// No se importa de allí porque Next compila este fichero a ESM y no resuelve
// importaciones TypeScript sin extensión.
const BASE_PATH = '/es/zbe';

// Exportación estática: el sitio se publica como ficheros en Cloudflare (ver ../ododex-sitio).
// Sin servidor no hay redirects(): la web nunca se publicó con las URLs antiguas.
const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  output: 'export',
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
