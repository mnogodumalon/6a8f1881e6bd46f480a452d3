import type { Buchungen, Touren } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';

export interface BuchungenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Buchungen;
  /** N:1-Ziel „Touren": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  tourenList: Touren[];
  /** Klick auf die Touren-Relation → overlay.push auf dessen Detail. */
  onOpenTouren?: (record: Touren) => void;
}

export function BuchungenDetails({
  record,
  tourenList,
  onOpenTouren,
}: BuchungenDetailsProps) {
  const tourTarget = tourenList.find(r => r.record_id === extractRecordId(record.fields.tour));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('buchungen', 'gast_vorname')} value={record.fields.gast_vorname} format="text" />
        <RecordField label={fieldLabel('buchungen', 'gast_nachname')} value={record.fields.gast_nachname} format="text" />
        <RecordField label={fieldLabel('buchungen', 'gast_email')} value={record.fields.gast_email} format="email" />
        <RecordField label={fieldLabel('buchungen', 'gast_telefon')} value={record.fields.gast_telefon} format="text" />
        <RecordField label={fieldLabel('buchungen', 'anzahl_plaetze')} value={record.fields.anzahl_plaetze} format="text" />
        <RecordField label={fieldLabel('buchungen', 'anmerkungen_buchung')} value={record.fields.anmerkungen_buchung} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('buchungen', 'tour')}
          name={tourTarget?.fields.treffpunkt ?? '—'}
          meta={[tourTarget?.fields.guide_vorname, tourTarget?.fields.guide_nachname].filter(Boolean).join(' · ') || undefined}
          onClick={tourTarget && onOpenTouren ? () => onOpenTouren!(tourTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.BUCHUNGEN} recordId={record.record_id} />
    </>
  );
}
