import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'datum_uhrzeit',
    'treffpunkt',
    { row: ['guide_vorname', 'guide_nachname'], cols: '1fr 1fr' },
    'max_teilnehmer',
    'anmerkungen_tour',
  ],
  defaults: {
    'datum_uhrzeit': { kind: 'today', withTime: true },
    'max_teilnehmer': { kind: 'literal', value: 12 },
  },
  computed: {},
  numberFields: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
