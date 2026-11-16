import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      // Redirecciones 301 específicas de slugs legacy de /puede-entrar a su página verificada equivalente
      {
        source: '/puede-entrar/audi-a4-2-0-tdi-en-madrid',
        destination: '/zbe/madrid/b',
        permanent: true,
      },
      {
        source: '/puede-entrar/audi-a4-2-0-tdi-en-barcelona',
        destination: '/zbe/barcelona/b',
        permanent: true,
      },
      {
        source: '/puede-entrar/seat-ibiza-en-madrid',
        destination: '/zbe/madrid/c',
        permanent: true,
      },
      {
        source: '/puede-entrar/seat-ibiza-en-barcelona',
        destination: '/zbe/barcelona/c',
        permanent: true,
      },
      {
        source: '/puede-entrar/volkswagen-golf-en-madrid',
        destination: '/zbe/madrid/c',
        permanent: true,
      },
      {
        source: '/puede-entrar/volkswagen-golf-en-valencia',
        destination: '/zbe/valencia/c',
        permanent: true,
      },
      {
        source: '/puede-entrar/toyota-corolla-en-madrid',
        destination: '/zbe/madrid/eco',
        permanent: true,
      },
      {
        source: '/puede-entrar/toyota-corolla-en-sevilla',
        destination: '/zbe/sevilla/eco',
        permanent: true,
      },
      {
        source: '/puede-entrar/renault-clio-en-bilbao',
        destination: '/zbe/bilbao/c',
        permanent: true,
      },
      {
        source: '/puede-entrar/:slug*',
        destination: '/',
        permanent: true,
      },
      // Redirección 301 legacy de modelos inventados a la ruta programática oficial
      {
        source: '/etiqueta-dgt/:marca((?!gasolina|diesel|hibrido|hibrido-enchufable|electrico|glp-gnc)[^/]+)/:modelo((?!\\d{4}$).*)',
        destination: '/etiqueta-dgt/gasolina/2018',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
