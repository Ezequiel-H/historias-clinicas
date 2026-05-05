import type { Activity, ActivityRule, AdverseEventIntensity, AdverseEventItem, AdverseEventSeriousness } from '../../../types';
import { ADVERSE_EVENT_TYPE_OTHER } from '../../../types';

export interface AdverseEventRow {
  eventType: string;
  eventTypeOther: string;
  startDate: string;
  endDate: string;
  seriousness: string;
  seriousnessOther: string;
  intensity: string;
  relatedToBaselineDisease: boolean;
  relatedToStudyMedication: boolean;
  relatedToStudyProcedure: boolean;
}

export function createEmptyAdverseEventRow(): AdverseEventRow {
  return {
    eventType: '',
    eventTypeOther: '',
    startDate: '',
    endDate: '',
    seriousness: '',
    seriousnessOther: '',
    intensity: '',
    relatedToBaselineDisease: false,
    relatedToStudyMedication: false,
    relatedToStudyProcedure: false,
  };
}

export function normalizeAdverseEventRows(value: unknown): AdverseEventRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw: any) => ({
    eventType: typeof raw?.eventType === 'string' ? raw.eventType : '',
    eventTypeOther: typeof raw?.eventTypeOther === 'string' ? raw.eventTypeOther : '',
    startDate: typeof raw?.startDate === 'string' ? raw.startDate : '',
    endDate: typeof raw?.endDate === 'string' ? raw.endDate : '',
    seriousness: typeof raw?.seriousness === 'string' ? raw.seriousness : '',
    seriousnessOther: typeof raw?.seriousnessOther === 'string' ? raw.seriousnessOther : '',
    intensity: typeof raw?.intensity === 'string' ? raw.intensity : '',
    relatedToBaselineDisease: Boolean(raw?.relatedToBaselineDisease),
    relatedToStudyMedication: Boolean(raw?.relatedToStudyMedication),
    relatedToStudyProcedure: Boolean(raw?.relatedToStudyProcedure),
  }));
}

export function rowIsStarted(row: AdverseEventRow): boolean {
  return Boolean(
    row.eventType ||
      row.startDate ||
      row.endDate ||
      row.seriousness ||
      row.intensity ||
      row.eventTypeOther.trim() ||
      row.seriousnessOther.trim() ||
      row.relatedToBaselineDisease ||
      row.relatedToStudyMedication ||
      row.relatedToStudyProcedure
  );
}

const SERIOUSNESS_SET = new Set<string>(['serious', 'not_serious', 'other']);
const INTENSITY_SET = new Set<string>(['mild', 'moderate', 'severe']);

export function rowIsComplete(row: AdverseEventRow): boolean {
  if (!row.eventType) return false;
  if (row.eventType === ADVERSE_EVENT_TYPE_OTHER && !row.eventTypeOther.trim()) return false;
  if (!row.startDate.trim()) return false;
  if (!row.seriousness || !SERIOUSNESS_SET.has(row.seriousness)) return false;
  if (row.seriousness === 'other' && !row.seriousnessOther.trim()) return false;
  if (!row.intensity || !INTENSITY_SET.has(row.intensity)) return false;
  return true;
}

export function rowToPersistedItem(row: AdverseEventRow): AdverseEventItem | null {
  if (!rowIsComplete(row)) return null;
  return {
    eventType: row.eventType,
    eventTypeOther: row.eventType === ADVERSE_EVENT_TYPE_OTHER ? row.eventTypeOther.trim() : undefined,
    startDate: row.startDate.trim(),
    endDate: row.endDate.trim() || undefined,
    seriousness: row.seriousness as AdverseEventSeriousness,
    seriousnessOther: row.seriousness === 'other' ? row.seriousnessOther.trim() : undefined,
    intensity: row.intensity as AdverseEventIntensity,
    relatedToBaselineDisease: row.relatedToBaselineDisease,
    relatedToStudyMedication: row.relatedToStudyMedication,
    relatedToStudyProcedure: row.relatedToStudyProcedure,
  };
}

export function rowsToPersistedList(rows: AdverseEventRow[]): AdverseEventItem[] {
  return rows.map(rowToPersistedItem).filter((x): x is AdverseEventItem => x !== null);
}

export interface ValidationErrorShape {
  activityId: string;
  activityName: string;
  rule: ActivityRule;
}

export function validateAdverseEventsListRows(
  activity: Activity,
  value: unknown
): { isValid: true } | { isValid: false; error: ValidationErrorShape } {
  if (activity.fieldType !== 'adverse_events_list') return { isValid: true };

  const rows = normalizeAdverseEventRows(value);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (rowIsStarted(row) && !rowIsComplete(row)) {
      return {
        isValid: false,
        error: {
          activityId: activity.id,
          activityName: activity.name,
          rule: {
            id: `adverse_incomplete_${i}`,
            name: 'Evento incompleto',
            condition: 'equals',
            value: '',
            severity: 'error',
            message: `El evento adverso ${i + 1} en "${activity.name}" está incompleto. Complete tipo, fecha de inicio, seriedad, intensidad y relaciones.`,
            isActive: true,
          },
        },
      };
    }
  }

  if (activity.required) {
    const hasComplete = rows.some(rowIsComplete);
    if (!hasComplete) {
      return {
        isValid: false,
        error: {
          activityId: activity.id,
          activityName: activity.name,
          rule: {
            id: 'adverse_required',
            name: 'Campo requerido',
            condition: 'equals',
            value: '',
            severity: 'error',
            message: `Debe registrar al menos un evento adverso completo en "${activity.name}".`,
            isActive: true,
          },
        },
      };
    }
  }

  return { isValid: true };
}
