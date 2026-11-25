import { createRequire } from 'node:module';

/**
 * Las páginas importan CSS de Leaflet a través de sus componentes. Next lo procesa al compilar,
 * pero en las pruebas el cargador de TypeScript lo intentaría ejecutar como JavaScript.
 * Este módulo registra una extensión `.css` vacía; debe importarse antes que las páginas.
 */
const requireFromTests = createRequire(import.meta.url);
const nodeModule = requireFromTests('node:module') as { _extensions: Record<string, () => void> };

nodeModule._extensions['.css'] = () => {};
