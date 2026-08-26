import type { Touren, Buchungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface TourenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Touren;
  /** 1:N „Buchungen" (tour): VOLLE Liste — der Block filtert auf diesen Record. */
  buchungenList: Buchungen[];
  /** Zeilen-Klick → overlay.push auf das Buchungen-Detail (nie der Edit-Dialog). */
  onOpenBuchungen: (record: Buchungen) => void;
  /** Kontextuelles „+": öffnet den Buchungen-Dialog mit diesem Record vorgesetzt. */
  onAddBuchungen: () => void;
}

export function TourenDetails({
  record,
  buchungenList,
  onOpenBuchungen,
  onAddBuchungen,
}: TourenDetailsProps) {
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('touren', 'datum_uhrzeit')} value={record.fields.datum_uhrzeit} format="datetime" />
        <RecordField label={fieldLabel('touren', 'treffpunkt')} value={record.fields.treffpunkt} format="text" />
        <RecordField label={fieldLabel('touren', 'guide_vorname')} value={record.fields.guide_vorname} format="text" />
        <RecordField label={fieldLabel('touren', 'guide_nachname')} value={record.fields.guide_nachname} format="text" />
        <RecordField label={fieldLabel('touren', 'max_teilnehmer')} value={record.fields.max_teilnehmer} format="text" />
        <RecordField label={fieldLabel('touren', 'anmerkungen_tour')} value={record.fields.anmerkungen_tour} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('buchungen')}
        items={buchungenList.filter(r => extractRecordId(r.fields.tour) === record.record_id)}
        map={r => ({ name: r.fields.gast_vorname ?? appLabel('buchungen'), meta: undefined })}
        onOpen={onOpenBuchungen}
        onAdd={onAddBuchungen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.TOUREN} recordId={record.record_id} />
    </>
  );
}
