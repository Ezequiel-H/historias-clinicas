/**
 * Indica si la actividad no debe enviarse al redactor de historia clínica.
 * Acepta la clave antigua guardada en algunos documentos/API.
 */
export function isExcludedFromClinicalRedactor(activity: {
  excludeFromRedactor?: boolean;
  excludeFromAI?: boolean;
}): boolean {
  return activity.excludeFromRedactor === true || activity.excludeFromAI === true;
}
