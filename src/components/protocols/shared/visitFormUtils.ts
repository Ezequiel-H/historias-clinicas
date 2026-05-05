// Utilidades compartidas para formularios de visita

import type { Activity } from '../../../types';

/**
 * Fecha local en formato YYYY-MM-DD (válido para input type="date").
 */
export const getLocalDateStringForInput = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Asigna la fecha de hoy a campos datetime con `isVisitDate`, solo si `${id}_date` aún no existe en el mapa
 * (no pisa valores importados ni una fecha ya establecida).
 * No aplica a datetime repetible con fecha por medición (no coincide con el uso de fecha de visita global).
 */
export const mergeVisitDateDefaults = (
  prev: Record<string, any>,
  activities: Activity[],
): Record<string, any> => {
  let next: Record<string, any> | null = null;
  for (const a of activities) {
    if (a.fieldType !== 'datetime') continue;
    if (a.datetimeIncludeDate === false) continue;
    if (!a.isVisitDate) continue;
    if (a.allowMultiple && a.requireDatePerMeasurement !== false) continue;

    const key = `${a.id}_date`;
    if (key in prev) continue;

    if (!next) next = { ...prev };
    next[key] = getLocalDateStringForInput();
  }
  return next ?? prev;
};

/**
 * Normaliza tiempo a formato HH:MM
 */
export const normalizeTime = (timeValue: string): string => {
  if (!timeValue) return '';
  // Si tiene formato HH:MM:SS, tomar solo HH:MM
  if (timeValue.length >= 5) {
    return timeValue.substring(0, 5);
  }
  return timeValue;
};

/**
 * Formatea tiempo mientras se escribe (HH:MM)
 */
export const formatTimeInput = (value: string): string => {
  // Remover todo excepto números
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length === 0) return '';
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 4) return `${numbers.substring(0, 2)}:${numbers.substring(2)}`;
  
  // Limitar a 4 dígitos (HHMM)
  return `${numbers.substring(0, 2)}:${numbers.substring(2, 4)}`;
};

/**
 * Valida formato de tiempo HH:MM
 */
export const isValidTime = (time: string): boolean => {
  if (!time || time.length !== 5) return false;
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  return !isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59;
};

/**
 * Calcula la hora siguiente sumando minutos
 */
export const addMinutesToTime = (time: string, minutesToAdd: number): string => {
  if (!time || time.length !== 5) return '';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  if (isNaN(h) || isNaN(m)) return '';
  
  const totalMinutes = h * 60 + m + minutesToAdd;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  
  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
};

/**
 * Parsea fecha desde string YYYY-MM-DD en zona horaria local
 */
export const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  // month - 1 porque Date usa meses 0-indexados (0 = enero, 11 = diciembre)
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

/**
 * Abre el date picker nativo al hacer clic en el campo
 */
export const handleDateFieldClick = (e: React.MouseEvent<HTMLDivElement>) => {
  const input = e.currentTarget.querySelector('input[type="date"]') as HTMLInputElement;
  if (input && input.showPicker) {
    e.preventDefault();
    input.showPicker();
  }
};

/**
 * Estilos para campos de fecha clickeables
 */
export const dateFieldStyles = {
  cursor: 'pointer',
  '& input[type="date"]': {
    cursor: 'pointer',
    '&::-webkit-calendar-picker-indicator': {
      cursor: 'pointer',
      opacity: 1,
    },
  },
  '& .MuiInputBase-root': {
    cursor: 'pointer',
  },
};

/**
 * Previene que el scroll del mouse/trackpad cambie el valor de inputs numéricos
 * cuando están enfocados. Usar en el prop onWheel de TextField type="number".
 */
export const preventNumberInputScroll = (e: React.WheelEvent<HTMLDivElement>) => {
  // Prevenir que el scroll cambie el valor del input
  const target = e.target as HTMLInputElement;
  if (target.type === 'number') {
    target.blur();
  }
};

/**
 * Props comunes para inputs numéricos que previenen el cambio de valor al hacer scroll
 */
export const numberInputProps = {
  onWheel: preventNumberInputScroll,
};

