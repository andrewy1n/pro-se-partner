/**
 * Reserved for workflows where `UD105_FIELDS` uses exact PDF AcroForm `field.name` strings
 * (from `scripts/extract-field-coords.mjs`) and values are read with a second indirection into
 * `buildCaseDataMap` keys. The shipped fill path uses semantic names in `ud105-field-coordinates.ts`
 * and does not import this map.
 *
 * If you switch to PDF-native names again, wire `fillByCoordinates` to:
 * `caseData[UD105_FIELD_NAME_MAP[field.name] ?? field.name]`.
 */
export const UD105_FIELD_NAME_MAP: Record<string, string> = {};
