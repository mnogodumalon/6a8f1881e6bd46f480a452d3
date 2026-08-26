// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Touren {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    datum_uhrzeit?: string; // Format: YYYY-MM-DD oder ISO String
    treffpunkt?: string;
    guide_vorname?: string;
    guide_nachname?: string;
    max_teilnehmer?: number;
    anmerkungen_tour?: string;
  };
}

export interface Buchungen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    tour?: RecordUrl; // applookup -> URL zu 'Touren' Record
    gast_vorname?: string;
    gast_nachname?: string;
    gast_email?: string;
    gast_telefon?: string;
    anzahl_plaetze?: number;
    anmerkungen_buchung?: string;
  };
}

export const APP_IDS = {
  TOUREN: '6a8f186cb6712f5c640370b5',
  BUCHUNGEN: '6a8f186e6ae6a1276cbe94bb',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'touren': {
    'datum_uhrzeit': 'date/datetimeminute',
    'treffpunkt': 'string/text',
    'guide_vorname': 'string/text',
    'guide_nachname': 'string/text',
    'max_teilnehmer': 'number',
    'anmerkungen_tour': 'string/textarea',
  },
  'buchungen': {
    'tour': 'applookup/select',
    'gast_vorname': 'string/text',
    'gast_nachname': 'string/text',
    'gast_email': 'string/email',
    'gast_telefon': 'string/tel',
    'anzahl_plaetze': 'number',
    'anmerkungen_buchung': 'string/textarea',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateTouren = StripLookup<Touren['fields']>;
export type CreateBuchungen = StripLookup<Buchungen['fields']>;