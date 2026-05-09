import React from 'react';
import {
  TextFields as TextIcon,
  Numbers as NumberIcon,
  ToggleOn as ToggleIcon,
  CalendarToday as DateIcon,
  AttachFile as FileIcon,
  CheckBox as CheckboxIcon,
  Code as CodeIcon,
  Link as LinkIcon,
  Medication as MedicationIcon,
  Notes as NotesIcon,
  ReportProblem as ReportProblemIcon,
} from '@mui/icons-material';
import type { FieldType } from '../types';
import { FIELD_TYPE_VALUES } from '../types';

type FieldTypeUiRow = {
  label: string;
  description: string;
  color: string;
  Icon: React.ElementType;
};

const FIELD_TYPE_UI: Record<FieldType, FieldTypeUiRow> = {
  text_short: {
    label: 'Texto Corto',
    description: 'Campo de texto de una línea',
    color: '#1976d2',
    Icon: TextIcon,
  },
  text_long: {
    label: 'Texto Largo',
    description: 'Área de texto multilínea (observaciones)',
    color: '#1565c0',
    Icon: TextIcon,
  },
  constant: {
    label: 'Constante',
    description:
      'Texto fijo que se envía a la historia clínica sin pedir respuesta al médico',
    color: '#5d4037',
    Icon: NotesIcon,
  },
  number_simple: {
    label: 'Número Simple',
    description: 'Campo numérico (peso, temperatura)',
    color: '#2e7d32',
    Icon: NumberIcon,
  },
  number_compound: {
    label: 'Número Compuesto',
    description: 'Ej: Presión (Sistólica/Diastólica)',
    color: '#43a047',
    Icon: NumberIcon,
  },
  select_single: {
    label: 'Selección',
    description: 'Lista de opciones (configurable: única o múltiple)',
    color: '#7b1fa2',
    Icon: CheckboxIcon,
  },
  boolean: {
    label: 'Sí/No',
    description: 'Campo booleano simple',
    color: '#f57c00',
    Icon: ToggleIcon,
  },
  datetime: {
    label: 'Fecha y/o Hora',
    description: 'Selector de fecha, hora o ambos (configurable)',
    color: '#0288d1',
    Icon: DateIcon,
  },
  file: {
    label: 'Archivo Adjunto',
    description: 'Subir PDF, imagen, etc.',
    color: '#d32f2f',
    Icon: FileIcon,
  },
  conditional: {
    label: 'Campo Condicional',
    description: 'Se muestra según otra respuesta',
    color: '#4527a0',
    Icon: LinkIcon,
  },
  calculated: {
    label: 'Campo Calculado',
    description: 'Se calcula automáticamente basado en otros campos',
    color: '#d32f2f',
    Icon: CodeIcon,
  },
  medication_tracking: {
    label: 'Seguimiento de Medicación',
    description: 'Registro y cálculo de adherencia al tratamiento (pill count)',
    color: '#ed6c02',
    Icon: MedicationIcon,
  },
  adverse_events_list: {
    label: 'Lista de eventos adversos',
    description: 'Varios eventos con tipo, fechas, seriedad, intensidad y relación con estudio',
    color: '#c62828',
    Icon: ReportProblemIcon,
  },
};

export type FieldTypeFormOption = {
  value: FieldType;
  label: string;
  description: string;
  icon: React.ReactElement;
  color: string;
};

/** Opciones de tipo de campo para formularios (tarjetas con icono y color). Orden según {@link FIELD_TYPE_VALUES}. */
export const FIELD_TYPE_FORM_OPTIONS: FieldTypeFormOption[] = FIELD_TYPE_VALUES.map((value) => {
  const row = FIELD_TYPE_UI[value];
  const Icon = row.Icon;
  return {
    value,
    label: row.label,
    description: row.description,
    color: row.color,
    icon: <Icon />,
  };
});

/** Misma información sin iconos ni colores (selectores compactos). */
export const FIELD_TYPE_SELECT_OPTIONS: { value: FieldType; label: string; description: string }[] =
  FIELD_TYPE_FORM_OPTIONS.map(({ value, label, description }) => ({ value, label, description }));

/**
 * Tarjetas del paso "elegir tipo" en formularios de actividad (protocolo / plantilla).
 * Excluye `conditional`: ahí la visibilidad condicional se configura con el checkbox sobre otros tipos.
 */
export const FIELD_TYPE_ACTIVITY_FORM_CARDS = FIELD_TYPE_FORM_OPTIONS.filter(
  (o) => o.value !== 'conditional'
);
