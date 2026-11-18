import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-800 bg-black py-10 text-neutral-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 text-xs">
          <div className="space-y-2">
            <span className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              Radar ZBE España
            </span>
            <p className="text-neutral-500 leading-relaxed">
              Consulta de Zonas de Bajas Emisiones (ZBE) con trazado de líneas perimetrales en mapa
              y cruce con microdatos oficiales de la DGT.
            </p>
          </div>

          <div>
            <h4 className="font-bold uppercase tracking-wider text-neutral-300 mb-2">
              Ciudades Principales
            </h4>
            <ul className="space-y-1.5 text-neutral-400">
              <li><Link href="/madrid" className="hover:text-orange-400">ZBE Madrid (Distrito Centro y M-30)</Link></li>
              <li><Link href="/barcelona" className="hover:text-orange-400">ZBE Rondas de Barcelona</Link></li>
              <li><Link href="/valencia" className="hover:text-orange-400">ZBE Valencia</Link></li>
              <li><Link href="/sevilla" className="hover:text-orange-400">ZBE Sevilla (Isla de la Cartuja)</Link></li>
              <li><Link href="/bilbao" className="hover:text-orange-400">ZBE Bilbao (Abando)</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold uppercase tracking-wider text-neutral-300 mb-2">
              Búsquedas Frecuentes
            </h4>
            <ul className="space-y-1.5 text-neutral-400">
              <li><Link href="/etiqueta-dgt/gasolina/2018" className="hover:text-orange-400">Etiqueta DGT de un gasolina de 2018</Link></li>
              <li><Link href="/etiqueta-dgt/diesel/2015" className="hover:text-orange-400">Etiqueta DGT de un diésel de 2015</Link></li>
              <li><Link href="/madrid/b" className="hover:text-orange-400">¿Puede entrar un coche con etiqueta B en Madrid?</Link></li>
              <li><Link href="/barcelona/c" className="hover:text-orange-400">¿Puede entrar un coche con etiqueta C en Barcelona?</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold uppercase tracking-wider text-neutral-300 mb-2">
              Marco Jurídico
            </h4>
            <p className="text-neutral-500 leading-relaxed">
              Ley 7/2021 de Cambio Climático y art. 76.z3 de la Ley de Seguridad Vial.
              Multa tipificada: 200 € (100 € por pronto pago).
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-500 gap-2">
          <p>© {new Date().getFullYear()} Radar ZBE España.</p>
          <p>Líneas perimetrales cartográficas aproximadas basadas en ordenanzas municipales públicas.</p>
        </div>
      </div>
    </footer>
  );
}
