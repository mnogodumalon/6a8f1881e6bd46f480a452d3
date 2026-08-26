import { useMemo, useState, useCallback } from 'react';
import { format, parseISO, isToday, isBefore, isAfter, startOfDay, endOfDay, addDays } from 'date-fns';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { tx, appLabel, dateFnsLocale } from '@/i18n';
import { formatDateTime } from '@/lib/formatters';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { LivingAppsService } from '@/services/livingAppsService';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { Button } from '@/components/ui/button';
import {
  CalendarWidget,
  type CalendarEvent,
} from '@/components/widgets/CalendarWidget';
import {
  IconCalendar,
  IconUsers,
  IconAlertTriangle,
  IconPlus,
  IconMapPin,
  IconUserCheck,
  IconClockHour4,
} from '@tabler/icons-react';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { touren, setTouren, buchungen, tourenMap, fetchAll } = data;
  const crud = useEntityCrud(data);
  const enrichedBuchungen = crud.enriched.buchungen;
  const clock = useClock();

  const [filterKey, setFilterKey] = useState<'heute' | 'diese_woche' | null>(null);

  // --- Berechnungen ---
  const today = startOfDay(clock);
  const weekEnd = endOfDay(addDays(today, 6));

  const tourHeute = useMemo(
    () => touren.filter(t => t.fields.datum_uhrzeit && isToday(parseISO(t.fields.datum_uhrzeit))),
    [touren, clock],
  );

  const tourDieseWoche = useMemo(
    () => touren.filter(t => {
      if (!t.fields.datum_uhrzeit) return false;
      const d = parseISO(t.fields.datum_uhrzeit);
      return isAfter(d, today) && isBefore(d, weekEnd);
    }),
    [touren, clock],
  );

  // Touren ohne Guide
  const ohneGuide = useMemo(
    () => touren.filter(t => {
      if (!t.fields.datum_uhrzeit) return false;
      const d = parseISO(t.fields.datum_uhrzeit);
      return isAfter(d, today) && (!t.fields.guide_vorname || !t.fields.guide_nachname);
    }),
    [touren, clock],
  );

  // Buchungen je Tour
  const buchungenByTour = useMemo(() => {
    const m = new Map<string, number>();
    buchungen.forEach(b => {
      const id = b.fields.tour ? (b.fields.tour.match(/([a-f0-9]{24})$/i)?.[1] ?? '') : '';
      if (id) m.set(id, (m.get(id) ?? 0) + (b.fields.anzahl_plaetze ?? 1));
    });
    return m;
  }, [buchungen]);

  // Touren die fast voll sind (>= 80%)
  const fastVoll = useMemo(
    () => touren.filter(t => {
      if (!t.fields.datum_uhrzeit || !t.fields.max_teilnehmer) return false;
      const d = parseISO(t.fields.datum_uhrzeit);
      if (isBefore(d, today)) return false;
      const gebucht = buchungenByTour.get(t.record_id) ?? 0;
      return gebucht / t.fields.max_teilnehmer >= 0.8;
    }),
    [touren, buchungenByTour, clock],
  );

  // Hero: Touren heute ohne Guide
  const heroTouren = useMemo(
    () => tourHeute.filter(t => !t.fields.guide_vorname || !t.fields.guide_nachname),
    [tourHeute],
  );

  // Gesamtbuchungen (Plätze) diese Woche
  const plaetzeDieseWoche = useMemo(() => {
    const wochentourIds = new Set([...tourHeute, ...tourDieseWoche].map(t => t.record_id));
    return buchungen.reduce((sum, b) => {
      const id = b.fields.tour ? (b.fields.tour.match(/([a-f0-9]{24})$/i)?.[1] ?? '') : '';
      return wochentourIds.has(id) ? sum + (b.fields.anzahl_plaetze ?? 1) : sum;
    }, 0);
  }, [buchungen, tourHeute, tourDieseWoche]);

  // --- Kalender Events ---
  const calEvents = useMemo<CalendarEvent[]>(() => {
    return touren
      .filter(t => !!t.fields.datum_uhrzeit)
      .map(t => {
        const gebucht = buchungenByTour.get(t.record_id) ?? 0;
        const max = t.fields.max_teilnehmer ?? 0;
        const auslastung = max > 0 ? gebucht / max : 0;
        const d = parseISO(t.fields.datum_uhrzeit!);
        const vergangen = isBefore(d, today);
        const guideName = [t.fields.guide_vorname, t.fields.guide_nachname].filter(Boolean).join(' ') || null;
        const tone: CalendarEvent['tone'] = vergangen
          ? 'default'
          : !guideName
          ? 'destructive'
          : auslastung >= 1
          ? 'warning'
          : auslastung >= 0.8
          ? 'primary'
          : 'success';

        return {
          id: `tour:${t.record_id}`,
          start: t.fields.datum_uhrzeit!,
          title: t.fields.treffpunkt ?? tx('Tour'),
          subtitle: guideName ?? tx('Kein Guide'),
          tone,
        };
      });
  }, [touren, buchungenByTour, clock]);

  // --- Drag: Termin verschieben ---
  const handleEventDrop = useCallback(async (eventId: string, newStart: string) => {
    const rid = eventId.split(':')[1];
    if (!rid) return;
    const prev = touren.find(t => t.record_id === rid);
    if (!prev) return;
    const prevStart = prev.fields.datum_uhrzeit;
    // Optimistic
    setTouren(ts => ts.map(t => t.record_id === rid ? { ...t, fields: { ...t.fields, datum_uhrzeit: newStart } } : t));
    try {
      await LivingAppsService.updateTourenEntry(rid, { datum_uhrzeit: newStart });
      undoToast(tx`Tour verschoben`, () => {
        setTouren(ts => ts.map(t => t.record_id === rid ? { ...t, fields: { ...t.fields, datum_uhrzeit: prevStart } } : t));
        void LivingAppsService.updateTourenEntry(rid, { datum_uhrzeit: prevStart });
      });
    } catch {
      await fetchAll();
    }
  }, [touren, setTouren, fetchAll]);

  // --- Kontext-Zeile ---
  const kontextZeile = useMemo(() => {
    if (tourHeute.length === 0) return tx('Heute keine Touren geplant.');
    const orte = namen(tourHeute.map(t => t.fields.treffpunkt ?? ''));
    return tx`Heute ${tourHeute.length === 1 ? tx('eine Tour') : `${tourHeute.length} ${tx('Touren')}`} — ${orte}`;
  }, [tourHeute]);

  // Aside-Liste: heutige + bevorstehende Touren
  const listeTouren = useMemo(() => {
    const filter = filterKey === 'heute' ? tourHeute : filterKey === 'diese_woche' ? tourDieseWoche : [...tourHeute, ...tourDieseWoche];
    return filter.slice(0, 8).map(t => {
      const gebucht = buchungenByTour.get(t.record_id) ?? 0;
      const max = t.fields.max_teilnehmer ?? 0;
      const guideName = [t.fields.guide_vorname, t.fields.guide_nachname].filter(Boolean).join(' ');
      return {
        id: t.record_id,
        title: t.fields.treffpunkt ?? tx('Unbekannter Treffpunkt'),
        secondLine: (
          <span className="flex items-center gap-1 text-muted-foreground text-xs">
            <IconClockHour4 size={12} className="shrink-0" />
            {formatDateTime(t.fields.datum_uhrzeit)}
            {guideName && <> · <IconUserCheck size={12} className="shrink-0" />{guideName}</>}
            {max > 0 && <> · <span className={gebucht >= max ? 'text-amber-600 font-medium' : ''}>{gebucht}/{max}</span></>}
          </span>
        ),
        action: {
          label: tx('Buchen'),
          onClick: () => crud.buchungen.openCreate({ tour: t.record_id }),
        },
      };
    });
  }, [touren, tourHeute, tourDieseWoche, buchungenByTour, filterKey]);

  // Aside-Liste: Buchungen heute
  const listeBuchungenHeute = useMemo(() => {
    const tourHeuteIds = new Set(tourHeute.map(t => t.record_id));
    return enrichedBuchungen
      .filter(b => {
        const id = b.fields.tour ? (b.fields.tour.match(/([a-f0-9]{24})$/i)?.[1] ?? '') : '';
        return tourHeuteIds.has(id);
      })
      .slice(0, 6)
      .map(b => ({
        id: b.record_id,
        title: [b.fields.gast_vorname, b.fields.gast_nachname].filter(Boolean).join(' ') || tx('Unbekannter Gast'),
        secondLine: (
          <span className="text-xs text-muted-foreground">
            {b.tourName || tx('Tour')}
            {b.fields.anzahl_plaetze != null && ` · ${b.fields.anzahl_plaetze} ${tx('Plätze')}`}
          </span>
        ),
      }));
  }, [enrichedBuchungen, tourHeute]);

  return (
    <div className="space-y-6">
      {/* Seitenkopf */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{gruss(clock)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{kontextZeile}</p>
        </div>
        <Button
          onClick={() => crud.touren.openCreate({})}
          className="shrink-0 flex items-center gap-2"
        >
          <IconPlus size={16} className="shrink-0" />
          <span className="hidden sm:inline">{tx('Neue Tour')}</span>
        </Button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={heroTouren.length > 0 && (
          <HeroBanner
            icon={<IconAlertTriangle size={18} />}
            action={{
              label: tx('Guide zuweisen'),
              onClick: () => crud.touren.openEdit(heroTouren[0]),
            }}
          >
            {tx`${namen(heroTouren.map(t => t.fields.treffpunkt ?? ''))} — Guide fehlt noch!`}
          </HeroBanner>
        )}
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Heute')}
              value={tourHeute.length}
              icon={<IconCalendar size={16} className="shrink-0" />}
              tone={tourHeute.length > 0 ? 'primary' : 'default'}
              onClick={() => setFilterKey(f => f === 'heute' ? null : 'heute')}
              active={filterKey === 'heute'}
            />
            <StatStripItem
              title={tx('Diese Woche')}
              value={tourDieseWoche.length}
              icon={<IconMapPin size={16} className="shrink-0" />}
              tone="default"
              onClick={() => setFilterKey(f => f === 'diese_woche' ? null : 'diese_woche')}
              active={filterKey === 'diese_woche'}
            />
            <StatStripItem
              title={tx('Gäste diese Woche')}
              value={plaetzeDieseWoche}
              icon={<IconUsers size={16} className="shrink-0" />}
              tone="default"
            />
            <StatStripItem
              title={tx('Fast ausgebucht')}
              value={fastVoll.length}
              icon={<IconAlertTriangle size={16} className="shrink-0" />}
              tone={fastVoll.length > 0 ? 'warning' : 'default'}
            />
          </StatStrip>
        }
        primary={
          <CalendarWidget
            events={calEvents}
            defaultView="week"
            locale={dateFnsLocale()}
            dayStartHour={7}
            dayEndHour={22}
            onEventClick={ev => {
              const rid = ev.id.split(':')[1];
              const tour = touren.find(t => t.record_id === rid);
              if (tour) crud.touren.openDetail(tour);
            }}
            onEventDrop={handleEventDrop}
            onEmptyClick={date => {
              crud.touren.openCreate({ datum_uhrzeit: format(date, "yyyy-MM-dd'T'HH:mm") });
            }}
          />
        }
        aside={
          <>
            <WorkList
              title={filterKey === 'heute' ? tx('Heutige Touren') : filterKey === 'diese_woche' ? tx('Touren diese Woche') : tx('Aktuelle Touren')}
              items={listeTouren}
              onItemClick={id => {
                const tour = touren.find(t => t.record_id === id);
                if (tour) crud.touren.openDetail(tour);
              }}
              empty={{
                text: tx('Keine Touren in diesem Zeitraum'),
                action: {
                  label: tx('Tour anlegen'),
                  onClick: () => crud.touren.openCreate({}),
                },
              }}
            />
            <WorkList
              title={tx('Buchungen heute')}
              items={listeBuchungenHeute}
              onItemClick={id => {
                const b = enrichedBuchungen.find(b => b.record_id === id);
                if (b) crud.buchungen.openDetail(b);
              }}
              empty={{
                text: tx('Noch keine Buchungen für heute'),
                action: {
                  label: tx('Buchung eintragen'),
                  onClick: () => crud.buchungen.openCreate({}),
                },
              }}
            />
          </>
        }
      />

      {crud.surfaces}
    </div>
  );
}
