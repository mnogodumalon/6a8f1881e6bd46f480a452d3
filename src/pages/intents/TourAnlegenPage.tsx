/**
 * Tour anlegen — 1-Schritt-Formular.
 * Steps: 1) Tour-Details eingeben & speichern.
 * Reads: (keine — neuer Datensatz).
 * Writes: touren (createTourenEntry).
 * Composes: IntentWizardShell.
 */

import { useState } from 'react';
import { format, isAfter } from 'date-fns';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LivingAppsService } from '@/services/livingAppsService';
import { tx } from '@/i18n';
import { IconCheck, IconMapPin, IconUser, IconUsers, IconNotes, IconCalendar } from '@tabler/icons-react';

export default function TourAnlegenPage() {
  const [datumUhrzeit, setDatumUhrzeit] = useState('');
  const [treffpunkt, setTreffpunkt] = useState('');
  const [guideVorname, setGuideVorname] = useState('');
  const [guideNachname, setGuideNachname] = useState('');
  const [maxTeilnehmer, setMaxTeilnehmer] = useState<string>('');
  const [anmerkungen, setAnmerkungen] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isValid = () => {
    if (!datumUhrzeit || !treffpunkt || !guideVorname || !guideNachname || !maxTeilnehmer) return false;
    const num = parseInt(maxTeilnehmer, 10);
    if (isNaN(num) || num < 1) return false;
    // Datum muss in der Zukunft liegen
    try {
      if (!isAfter(new Date(datumUhrzeit), new Date())) return false;
    } catch {
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!isValid()) return;
    setSaving(true);
    setError(null);
    try {
      await LivingAppsService.createTourenEntry({
        datum_uhrzeit: datumUhrzeit,
        treffpunkt,
        guide_vorname: guideVorname,
        guide_nachname: guideNachname,
        max_teilnehmer: parseInt(maxTeilnehmer, 10),
        anmerkungen_tour: anmerkungen || undefined,
      });
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : tx('Fehler beim Speichern'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDatumUhrzeit('');
    setTreffpunkt('');
    setGuideVorname('');
    setGuideNachname('');
    setMaxTeilnehmer('');
    setAnmerkungen('');
    setError(null);
    setSuccess(false);
  };

  return (
    <IntentWizardShell
      title={tx('Neue Tour anlegen')}
      subtitle={tx('Alle Pflichtfelder ausfüllen und Tour speichern')}
      steps={[{ label: tx('Tour-Details') }]}
      currentStep={1}
      onStepChange={() => {}}
    >
      {success ? (
        <div className="flex flex-col items-center gap-6 py-12 text-center">
          <div className="rounded-full bg-emerald-100 p-4">
            <IconCheck size={40} className="text-emerald-600" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">{tx('Tour wurde angelegt!')}</h2>
            <p className="text-sm text-muted-foreground">
              {tx('Die Stadtführung ist jetzt im System gespeichert.')}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button variant="outline" onClick={handleReset}>
              {tx('Weitere Tour anlegen')}
            </Button>
            <Button asChild>
              <a href="#/">{tx('Zurück zum Dashboard')}</a>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 max-w-lg mx-auto">
          {/* Datum & Uhrzeit */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <IconCalendar size={16} className="shrink-0 text-muted-foreground" />
              {tx('Datum & Uhrzeit')}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              type="datetime-local"
              value={datumUhrzeit}
              onChange={e => setDatumUhrzeit(e.target.value)}
              min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
            />
            {datumUhrzeit && !isAfter(new Date(datumUhrzeit), new Date()) && (
              <p className="text-xs text-destructive">
                {tx('Datum muss in der Zukunft liegen')}
              </p>
            )}
          </div>

          {/* Treffpunkt */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <IconMapPin size={16} className="shrink-0 text-muted-foreground" />
              {tx('Treffpunkt')}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              value={treffpunkt}
              onChange={e => setTreffpunkt(e.target.value)}
              placeholder={tx('z. B. Hauptbahnhof, Eingang Nord')}
            />
          </div>

          {/* Guide */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <IconUser size={16} className="shrink-0 text-muted-foreground" />
              {tx('Guide')}
              <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={guideVorname}
                onChange={e => setGuideVorname(e.target.value)}
                placeholder={tx('Vorname')}
              />
              <Input
                value={guideNachname}
                onChange={e => setGuideNachname(e.target.value)}
                placeholder={tx('Nachname')}
              />
            </div>
          </div>

          {/* Max. Teilnehmer */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <IconUsers size={16} className="shrink-0 text-muted-foreground" />
              {tx('Max. Teilnehmer')}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min={1}
              value={maxTeilnehmer}
              onChange={e => setMaxTeilnehmer(e.target.value)}
              placeholder="15"
              className="max-w-[160px]"
            />
            {maxTeilnehmer && (parseInt(maxTeilnehmer, 10) < 1 || isNaN(parseInt(maxTeilnehmer, 10))) && (
              <p className="text-xs text-destructive">
                {tx('Mindestens 1 Teilnehmer erforderlich')}
              </p>
            )}
          </div>

          {/* Anmerkungen */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <IconNotes size={16} className="shrink-0 text-muted-foreground" />
              {tx('Anmerkungen')}
            </Label>
            <Textarea
              value={anmerkungen}
              onChange={e => setAnmerkungen(e.target.value)}
              placeholder={tx('Optionale Hinweise zur Tour …')}
              rows={3}
            />
          </div>

          {/* Fehler */}
          {error && (
            <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}

          {/* Speichern */}
          <div className="pt-2">
            <Button
              className="w-full sm:w-auto"
              disabled={!isValid() || saving}
              onClick={handleSave}
            >
              {saving ? tx('Wird gespeichert …') : tx('Tour anlegen')}
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
