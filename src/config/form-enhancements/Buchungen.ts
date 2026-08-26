import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [
    'tour',
    { row: ['gast_vorname', 'gast_nachname'], cols: '1fr 1fr' },
    'gast_email',
    'gast_telefon',
    'anzahl_plaetze',
    'anmerkungen_buchung',
  ],
  defaults: {
    'anzahl_plaetze': { kind: 'literal', value: 1 },
  },
  computed: {},
  numberFields: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
