import type { Buchungen, Touren } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { IconPencil } from '@tabler/icons-react';
import { t, appLabel, fieldLabel, lookupLabel } from '@/i18n';

interface BuchungenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Buchungen | null;
  onEdit: (record: Buchungen) => void;
  tourenList: Touren[];
}

export function BuchungenViewDialog({ open, onClose, record, onEdit, tourenList }: BuchungenViewDialogProps) {
  function getTourenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return tourenList.find(r => r.record_id === id)?.fields.treffpunkt ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('view_entity', { entity: appLabel('buchungen') })}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            {t('edit_button')}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('buchungen', 'tour')}</Label>
            <p className="text-sm">{getTourenDisplayName(record.fields.tour)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('buchungen', 'gast_vorname')}</Label>
            <p className="text-sm">{record.fields.gast_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('buchungen', 'gast_nachname')}</Label>
            <p className="text-sm">{record.fields.gast_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('buchungen', 'gast_email')}</Label>
            <p className="text-sm">{record.fields.gast_email ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('buchungen', 'gast_telefon')}</Label>
            <p className="text-sm">{record.fields.gast_telefon ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('buchungen', 'anzahl_plaetze')}</Label>
            <p className="text-sm">{record.fields.anzahl_plaetze ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('buchungen', 'anmerkungen_buchung')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.anmerkungen_buchung ?? '—'}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.BUCHUNGEN} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}