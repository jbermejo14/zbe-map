import { formatSpanishDate } from '@/lib/atlas-zbe';
import type { CalendarEntry } from '@/lib/atlas-zbe';
import type { DgtBadgeType } from '@/lib/zbe-engine';

interface ZbeCalendarProps {
  entries: CalendarEntry[];
  cityName: string;
  /** Fecha ISO de la importación: las entradas posteriores se marcan como próximas. */
  importedOn: string;
  /** Etiqueta por la que filtrar; el título usa `badgeTitle`. */
  badge?: DgtBadgeType;
  /** Nombre del grupo de la etiqueta ("Coches con etiqueta B"), para el título. */
  badgeTitle?: string;
}

/** Entradas generales (sin etiquetas) o que incluyen la etiqueta indicada. */
function zbeCalendarFilter(entries: CalendarEntry[], badge?: DgtBadgeType): CalendarEntry[] {
  if (!badge) return entries;
  return entries.filter((entry) => entry.badges.length === 0 || entry.badges.includes(badge));
}

function zbeCalendarTitle(cityName: string, badge?: DgtBadgeType, badgeTitle?: string): string {
  if (badge && badgeTitle) return `Calendario para ${badgeTitle.charAt(0).toLowerCase()}${badgeTitle.slice(1)} en ${cityName}`;
  return `Calendario de la ZBE de ${cityName}`;
}

/** Calendario de hitos de la ZBE, ordenado como llega. No se muestra sin entradas. */
export function ZbeCalendar({ entries, cityName, importedOn, badge, badgeTitle }: ZbeCalendarProps) {
  const visible = zbeCalendarFilter(entries, badge);
  if (visible.length === 0) return null;

  return (
    <section className="mb-8 rounded-2xl border border-line bg-elevated/60 p-6">
      <h2 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">
        {zbeCalendarTitle(cityName, badge, badgeTitle)}
      </h2>
      <ol className="space-y-2">
        {visible.map((entry, index) => (
          <li key={`${index}-${entry.date}-${entry.text}`} className="text-sm text-secondary leading-relaxed">
            <time dateTime={entry.date} className="font-bold text-fg">
              {formatSpanishDate(entry.date)}
            </time>
            {entry.date > importedOn && <span className="tag tag-warning ml-2">Próximamente</span>}
            <span className="block">{entry.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
