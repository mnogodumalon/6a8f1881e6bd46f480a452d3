/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'touren'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.touren.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.touren.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.touren.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.touren              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   touren: datum_uhrzeit, treffpunkt, guide_vorname, guide_nachname, max_teilnehmer, anmerkungen_tour  ·  ← buchungen (list + contextual +)
 *   buchungen: tour, gast_vorname, gast_nachname, gast_email, gast_telefon, anzahl_plaetze, anmerkungen_buchung  ·  → touren
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Touren, Buchungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichBuchungen } from '@/lib/enrich';
import type { EnrichedBuchungen } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { TourenDialog, type TourenDialogDefaults } from '@/components/dialogs/TourenDialog';
import { TourenDetails } from '@/components/details/TourenDetails';
import { BuchungenDialog, type BuchungenDialogDefaults } from '@/components/dialogs/BuchungenDialog';
import { BuchungenDetails } from '@/components/details/BuchungenDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'touren'; record: Touren }
  | { type: 'buchungen'; record: EnrichedBuchungen };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  touren: EntityCrudApi<Touren, TourenDialogDefaults>;
  buchungen: EntityCrudApi<Buchungen, BuchungenDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { touren: Touren[]; buchungen: EnrichedBuchungen[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  const [tourenDialog, setTourenDialog] = useState<{ defaults?: TourenDialogDefaults; editing?: Touren } | null>(null);
  const [buchungenDialog, setBuchungenDialog] = useState<{ defaults?: BuchungenDialogDefaults; editing?: Buchungen } | null>(null);
  const enrichedBuchungen = useMemo(() => enrichBuchungen(data.buchungen, { tourenMap: data.tourenMap }), [data.buchungen, data.tourenMap]);

  function detailTouren(record: Touren, push = false) {
    const item: OverlayItem = { type: 'touren', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitTouren(fields: Touren['fields']) {
    const editing = tourenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setTouren(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateTourenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('touren')} — ${t('crud_updated')}`, async () => {
        data.setTouren(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateTourenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createTourenEntry(fields);
      undoToast(`${appLabel('touren')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailBuchungen(record: Buchungen, push = false) {
    const rec = enrichedBuchungen.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'buchungen', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitBuchungen(fields: Buchungen['fields']) {
    const editing = buchungenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setBuchungen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateBuchungenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('buchungen')} — ${t('crud_updated')}`, async () => {
        data.setBuchungen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateBuchungenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createBuchungenEntry(fields);
      undoToast(`${appLabel('buchungen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <TourenDialog
        open={tourenDialog !== null}
        onClose={() => setTourenDialog(null)}
        onSubmit={submitTouren}
        defaultValues={tourenDialog?.defaults}
        recordId={tourenDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Touren']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Touren']}
      />
      <BuchungenDialog
        open={buchungenDialog !== null}
        onClose={() => setBuchungenDialog(null)}
        onSubmit={submitBuchungen}
        defaultValues={buchungenDialog?.defaults}
        recordId={buchungenDialog?.editing?.record_id}
        tourenList={data.touren}
        enablePhotoScan={AI_PHOTO_SCAN['Buchungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Buchungen']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'touren') {
            return (
              <>
                <RecordHeader title={top.record.fields.treffpunkt ?? appLabel('touren')} subtitle={top.record.fields.datum_uhrzeit ? formatDate(top.record.fields.datum_uhrzeit) : undefined} />
                <TourenDetails
                  record={top.record}
                  buchungenList={data.buchungen}
                  onOpenBuchungen={(r) => detailBuchungen(r, true)}
                  onAddBuchungen={() => setBuchungenDialog({ defaults: { tour: createRecordUrl(APP_IDS.TOUREN, top.record.record_id) } })}
                />
              </>
            );
          }
          if (top.type === 'buchungen') {
            return (
              <>
                <RecordHeader title={top.record.fields.gast_vorname ?? appLabel('buchungen')} subtitle={undefined} />
                <BuchungenDetails
                  record={top.record}
                  tourenList={data.touren}
                  onOpenTouren={(r) => detailTouren(r, true)}
                />
              </>
            );
          }
          return null;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'touren') setTourenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'buchungen') setBuchungenDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    touren: {
      openCreate: (defaults?: TourenDialogDefaults) => setTourenDialog({ defaults }),
      openEdit: (record: Touren) => setTourenDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Touren) => detailTouren(record, false),
    },
    buchungen: {
      openCreate: (defaults?: BuchungenDialogDefaults) => setBuchungenDialog({ defaults }),
      openEdit: (record: Buchungen) => setBuchungenDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Buchungen) => detailBuchungen(record, false),
    },
    enriched: { touren: data.touren, buchungen: enrichedBuchungen },
  };
}
