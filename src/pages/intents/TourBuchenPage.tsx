/**
 * Tour buchen — 2-Schritt-Wizard.
 * Steps: 1) Tour wählen (nur zukünftige mit freien Plätzen) → 2) Gastdaten eingeben & Buchung speichern.
 * Reads: touren, buchungen. Writes: buchungen (createBuchungenEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */
import { useState, useMemo } from 'react';
import { format, parseISO, isAfter } from 'date-fns';
import { IconUsers, IconMapPin, IconUser, IconCalendar, IconCheck } from '@tabler/icons-react';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Touren } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { tx, dateFnsLocale } from '@/i18n';

export default function TourBuchenPage() {
  const { touren, buchungen, loading, error, fetchAll } = useDashboardData();

  const [step, setStep] = useState(1);
  const [selectedTour, setSelectedTour] = useState<Touren | null>(null);

  // Step 2 form state
  const [gastVorname, setGastVorname] = useState('');
  const [gastNachname, setGastNachname] = useState('');
  const [gastEmail, setGastEmail] = useState('');
  const [gastTelefon, setGastTelefon] = useState('');
  const [anzahlPlaetze, setAnzahlPlaetze] = useState(1);
  const [anmerkungen, setAnmerkungen] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const now = new Date();

  // Berechne gebuchte Plätze pro Tour
  const gebuchteplaetzeByTour = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of buchungen) {
      if (!b.fields.tour) continue;
      // Extract record id from URL (last path segment)
      const parts = b.fields.tour.split('/');
      const tourId = parts[parts.length - 1];
      const prev = map.get(tourId) ?? 0;
      map.set(tourId, prev + (b.fields.anzahl_plaetze ?? 0));
    }
    return map;
  }, [buchungen]);

  // Nur zukünftige Touren mit freien Plätzen
  const verfuegbareTouren = useMemo(() => {
    return touren.filter(t => {
      if (!t.fields.datum_uhrzeit) return false;
      const tourDate = parseISO(t.fields.datum_uhrzeit);
      if (!isAfter(tourDate, now)) return false;
      const max = t.fields.max_teilnehmer ?? 0;
      const gebucht = gebuchteplaetzeByTour.get(t.record_id) ?? 0;
      return max - gebucht > 0;
    });
  }, [touren, gebuchteplaetzeByTour, now]);

  const freePlaetze = selectedTour
    ? (selectedTour.fields.max_teilnehmer ?? 0) - (gebuchteplaetzeByTour.get(selectedTour.record_id) ?? 0)
    : 0;

  const anzahlError = anzahlPlaetze < 1
    ? tx('Mindestens 1 Platz erforderlich')
    : anzahlPlaetze > freePlaetze
    ? tx(tx`Nur noch ${freePlaetze} Plätze verfügbar`)
    : null;

  const handleSelectTour = (id: string) => {
    const tour = touren.find(t => t.record_id === id) ?? null;
    setSelectedTour(tour);
    setAnzahlPlaetze(1);
    setStep(2);
  };

  const handleSave = async () => {
    if (!selectedTour || anzahlError) return;
    setSaving(true);
    setSaveError(null);
    try {
      await LivingAppsService.createBuchungenEntry({
        tour: createRecordUrl('6a8f186cb6712f5c640370b5', selectedTour.record_id),
        gast_vorname: gastVorname,
        gast_nachname: gastNachname,
        gast_email: gastEmail || undefined,
        gast_telefon: gastTelefon || undefined,
        anzahl_plaetze: anzahlPlaetze,
        anmerkungen_buchung: anmerkungen || undefined,
      });
      await fetchAll();
      setDone(true);
    } catch {
      setSaveError(tx('Buchung konnte nicht gespeichert werden. Bitte nochmals versuchen.'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedTour(null);
    setGastVorname('');
    setGastNachname('');
    setGastEmail('');
    setGastTelefon('');
    setAnzahlPlaetze(1);
    setAnmerkungen('');
    setSaveError(null);
    setDone(false);
    setStep(1);
  };

  const canSubmit =
    !!selectedTour &&
    gastVorname.trim().length > 0 &&
    gastNachname.trim().length > 0 &&
    !anzahlError &&
    !saving;

  return (
    <IntentWizardShell
      title={tx('Tour buchen')}
      subtitle={tx('Einen Gast in zwei Schritten für eine Tour anmelden')}
      steps={[{ label: tx('Tour wählen') }, { label: tx('Gastdaten') }]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1 — Tour wählen */}
      {step === 1 && (
        <EntitySelectStep
          items={verfuegbareTouren.map(t => {
            const gebucht = gebuchteplaetzeByTour.get(t.record_id) ?? 0;
            const frei = (t.fields.max_teilnehmer ?? 0) - gebucht;
            const datumFormatiert = t.fields.datum_uhrzeit
              ? format(parseISO(t.fields.datum_uhrzeit), 'EEE, dd. MMM yyyy · HH:mm', { locale: dateFnsLocale() }) + ' Uhr'
              : '—';
            const guideName = [t.fields.guide_vorname, t.fields.guide_nachname].filter(Boolean).join(' ') || '—';
            return {
              id: t.record_id,
              title: datumFormatiert,
              subtitle: [t.fields.treffpunkt, guideName].filter(Boolean).join(' · '),
              icon: <IconCalendar size={20} className="text-primary shrink-0" />,
              stats: [
                { label: tx('Guide'), value: guideName },
                { label: tx('Freie Plätze'), value: `${frei} / ${t.fields.max_teilnehmer ?? 0}` },
              ],
            };
          })}
          onSelect={handleSelectTour}
          searchPlaceholder={tx('Tour suchen …')}
          emptyText={tx('Keine Touren mit freien Plätzen gefunden')}
          emptyIcon={<IconUsers size={32} className="text-muted-foreground" />}
        />
      )}

      {/* Step 2 — Gastdaten eingeben */}
      {step === 2 && (
        selectedTour ? (
          done ? (
            // Erfolg
            <div className="flex flex-col items-center py-16 gap-6 text-center">
              <div className="rounded-full bg-emerald-100 p-4">
                <IconCheck size={40} className="text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">{tx('Buchung gespeichert!')}</h2>
                <p className="text-muted-foreground text-sm">
                  {tx(tx`${gastVorname} ${gastNachname} wurde für die Tour am ${
                    selectedTour.fields.datum_uhrzeit
                      ? format(parseISO(selectedTour.fields.datum_uhrzeit), 'dd. MMM yyyy · HH:mm', { locale: dateFnsLocale() })
                      : '—'
                  } Uhr gebucht.`)}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleReset} variant="default">
                  {tx('Weitere Buchung anlegen')}
                </Button>
                <a href="#/">
                  <Button variant="outline">{tx('Zurück zum Dashboard')}</Button>
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tour-Zusammenfassung */}
              <div className="rounded-2xl border bg-secondary/40 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                  {tx('Gewählte Tour')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <IconCalendar size={16} className="text-primary shrink-0" />
                    <span>
                      {selectedTour.fields.datum_uhrzeit
                        ? format(parseISO(selectedTour.fields.datum_uhrzeit), 'EEE, dd. MMM yyyy · HH:mm', { locale: dateFnsLocale() }) + ' Uhr'
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IconMapPin size={16} className="text-primary shrink-0" />
                    <span className="truncate">{selectedTour.fields.treffpunkt ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IconUser size={16} className="text-primary shrink-0" />
                    <span>
                      {[selectedTour.fields.guide_vorname, selectedTour.fields.guide_nachname]
                        .filter(Boolean)
                        .join(' ') || '—'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <IconUsers size={16} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    {tx(tx`Noch ${freePlaetze} von ${selectedTour.fields.max_teilnehmer ?? 0} Plätzen frei`)}
                  </span>
                </div>
              </div>

              {/* Gastdaten-Formular */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="gast_vorname">
                    {tx('Vorname')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="gast_vorname"
                    value={gastVorname}
                    onChange={e => setGastVorname(e.target.value)}
                    placeholder={tx('Vorname des Gastes')}
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gast_nachname">
                    {tx('Nachname')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="gast_nachname"
                    value={gastNachname}
                    onChange={e => setGastNachname(e.target.value)}
                    placeholder={tx('Nachname des Gastes')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gast_email">{tx('E-Mail')}</Label>
                  <Input
                    id="gast_email"
                    type="email"
                    value={gastEmail}
                    onChange={e => setGastEmail(e.target.value)}
                    placeholder={tx('email@beispiel.de')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gast_telefon">{tx('Telefon')}</Label>
                  <Input
                    id="gast_telefon"
                    type="tel"
                    value={gastTelefon}
                    onChange={e => setGastTelefon(e.target.value)}
                    placeholder={tx('+49 …')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="anzahl_plaetze">
                    {tx('Anzahl Plätze')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="anzahl_plaetze"
                    type="number"
                    min={1}
                    max={freePlaetze}
                    value={anzahlPlaetze}
                    onChange={e => setAnzahlPlaetze(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                  {anzahlError && (
                    <p className="text-destructive text-xs">{anzahlError}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="anmerkungen">{tx('Anmerkungen')}</Label>
                <Textarea
                  id="anmerkungen"
                  value={anmerkungen}
                  onChange={e => setAnmerkungen(e.target.value)}
                  placeholder={tx('Besondere Wünsche oder Hinweise …')}
                  rows={3}
                />
              </div>

              {saveError && (
                <p className="text-destructive text-sm rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
                  {saveError}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={!canSubmit}
                >
                  {saving ? tx('Buchung wird gespeichert …') : tx('Buchung speichern')}
                </Button>
                <Button variant="outline" onClick={() => setStep(1)}>
                  {tx('Andere Tour wählen')}
                </Button>
              </div>
            </div>
          )
        ) : (
          // Fallback: Schritt 2 ohne ausgewählte Tour (z.B. Direktlink)
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">
              {tx('Dieser Schritt braucht eine Auswahl aus Schritt 1.')}
            </p>
            <Button variant="outline" onClick={() => setStep(1)}>
              {tx('Neu starten')}
            </Button>
          </div>
        )
      )}
    </IntentWizardShell>
  );
}
