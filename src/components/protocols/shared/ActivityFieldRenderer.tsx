import React from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Checkbox,
  Alert,
  Paper,
  Chip,
  FormGroup,
  Button,
} from '@mui/material';
import type { Activity, ActivityRule } from '../../../types';

// Tipo local para errores de validación
interface ValidationError {
  activityId: string;
  activityName: string;
  rule: ActivityRule;
  currentValue?: any;
}
import {
  normalizeTime,
  formatTimeInput,
  isValidTime,
  addMinutesToTime,
  handleDateFieldClick,
  dateFieldStyles,
  preventNumberInputScroll,
} from './visitFormUtils';
import { MedicationTrackingField } from './MedicationTrackingField';

// Tipos para las props del componente
interface MedicationErrorState {
  includeInHistory: boolean;
  comment: string;
}

interface ActivityFieldRendererProps {
  activity: Activity;
  formValues: Record<string, any>;
  validationErrors: ValidationError[];
  showValidation: boolean;
  handleChange: (key: string, value: any, index?: number) => void;
  // Funciones opcionales
  evaluateFormula?: (formula: string, values: Record<string, any>) => number | null;
  shouldShowDateTimeError?: (activity: Activity, index?: number) => { date: boolean; time: boolean };
  // Para medication tracking
  medicationErrors?: Record<string, Record<string, MedicationErrorState>>;
  setMedicationErrors?: React.Dispatch<React.SetStateAction<Record<string, Record<string, MedicationErrorState>>>>;
  getVisitDate?: () => Date;
  // Wrapper opcional (usado en PatientVisitForm para el botón de descripción)
  fieldWrapper?: (
    fieldElement: React.ReactNode,
    activity: Activity,
    index?: number
  ) => React.ReactNode;
}

/**
 * Componente que renderiza un campo de actividad individual
 */
export const ActivityFieldRenderer: React.FC<ActivityFieldRendererProps> = ({
  activity,
  formValues,
  validationErrors,
  showValidation,
  handleChange,
  evaluateFormula,
  shouldShowDateTimeError,
  medicationErrors = {},
  setMedicationErrors,
  getVisitDate,
  fieldWrapper,
}) => {
  const value = formValues[activity.id];
  const activityErrors = validationErrors.filter(e => e.activityId === activity.id);

  // Wrapper por defecto que no hace nada
  const wrapField = (element: React.ReactNode, index?: number) => {
    if (fieldWrapper) {
      return fieldWrapper(element, activity, index);
    }
    return element;
  };

  // Función helper para errores de fecha/hora por defecto
  const getDateTimeError = (index?: number) => {
    if (shouldShowDateTimeError) {
      return shouldShowDateTimeError(activity, index);
    }
    // Comportamiento por defecto
    return { date: false, time: false };
  };

  const renderSingleField = (index?: number) => {
    const fieldValue = index !== undefined ? (Array.isArray(value) ? value[index] : '') : value;
    const fieldId = index !== undefined ? `${activity.id}-${index}` : activity.id;

    switch (activity.fieldType) {
      case 'text_short':
        return wrapField(
          <TextField
            fullWidth
            value={fieldValue || ''}
            onChange={(e) => handleChange(activity.id, e.target.value, index)}
            placeholder="Ingrese texto..."
            error={showValidation && activity.required && !fieldValue}
            helperText={showValidation && activity.required && !fieldValue ? 'Campo requerido' : ''}
          />,
          index
        );

      case 'text_long':
        return wrapField(
          <TextField
            fullWidth
            multiline
            rows={4}
            value={fieldValue || ''}
            onChange={(e) => handleChange(activity.id, e.target.value, index)}
            placeholder="Ingrese observaciones..."
            error={showValidation && activity.required && !fieldValue}
            helperText={showValidation && activity.required && !fieldValue ? 'Campo requerido' : ''}
          />,
          index
        );

      case 'number_simple': {
        const hasRangeError = showValidation && activityErrors.some(e => 
          e.rule.condition === 'range'
        );
        return wrapField(
          <Box key={fieldId}>
            <TextField
              key={fieldId}
              id={fieldId}
              type="number"
              value={fieldValue || ''}
              onChange={(e) => {
                const newValue = e.target.value;
                handleChange(activity.id, newValue, index);
              }}
              onBlur={(e) => {
                const currentValue = formValues[activity.id];
                if (index !== undefined && Array.isArray(currentValue)) {
                  const arrayValue = [...currentValue];
                  arrayValue[index] = e.target.value;
                  handleChange(activity.id, arrayValue, index);
                } else if (index === undefined) {
                  handleChange(activity.id, e.target.value);
                }
              }}
              onWheel={preventNumberInputScroll}
              placeholder="0"
              error={showValidation && (activity.required && !fieldValue || hasRangeError)}
              helperText={
                showValidation && activity.required && !fieldValue 
                  ? 'Campo requerido' 
                  : ''
              }
              InputProps={{
                endAdornment: activity.measurementUnit ? (
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    {activity.measurementUnit}
                  </Typography>
                ) : null,
              }}
              sx={{ width: 250 }}
            />
          </Box>,
          index
        );
      }

      case 'number_compound': {
        const compoundValue = (typeof fieldValue === 'object' && fieldValue !== null && !Array.isArray(fieldValue))
          ? fieldValue
          : {};
        
        const compoundConfig = activity.compoundConfig;
        const fields = compoundConfig?.fields || [];
        
        const handleCompoundChange = (fieldName: string, val: string) => {
          const newCompoundValue = { ...compoundValue, [fieldName]: val };
          handleChange(activity.id, newCompoundValue, index);
        };
        
        return wrapField(
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {fields.length > 0 ? (
              fields.map((field) => (
                <TextField
                  key={field.name}
                  type="number"
                  label={field.label}
                  value={compoundValue[field.name] || ''}
                  onChange={(e) => handleCompoundChange(field.name, e.target.value)}
                  onWheel={preventNumberInputScroll}
                  placeholder="0"
                  error={showValidation && activity.required && (!compoundValue[field.name] || compoundValue[field.name] === '')}
                  helperText={
                    showValidation && activity.required && (!compoundValue[field.name] || compoundValue[field.name] === '')
                      ? 'Campo requerido'
                      : ''
                  }
                  InputProps={{
                    endAdornment: field.unit ? (
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                        {field.unit}
                      </Typography>
                    ) : null,
                  }}
                  sx={{ minWidth: 200 }}
                />
              ))
            ) : (
              <Alert severity="warning">
                No hay campos configurados para este número compuesto.
              </Alert>
            )}
          </Box>,
          index
        );
      }

      case 'select_single': {
        const isMultiple = activity.selectMultiple === true;
        const hasError = isMultiple
          ? showValidation && activity.required && (!fieldValue || fieldValue.length === 0)
          : showValidation && activity.required && !fieldValue;
        
        return wrapField(
          <FormControl component="fieldset" error={hasError}>
            {isMultiple ? (
              <FormGroup>
                {activity.options?.map((option) => (
                  <FormControlLabel
                    key={option.value}
                    control={
                      <Checkbox
                        checked={Array.isArray(fieldValue) && fieldValue.includes(option.value)}
                        onChange={(e) => {
                          const currentValues = Array.isArray(fieldValue) ? fieldValue : [];
                          const newValues = e.target.checked
                            ? [...currentValues, option.value]
                            : currentValues.filter(v => v !== option.value);
                          handleChange(activity.id, newValues, index);
                        }}
                      />
                    }
                    label={option.label}
                  />
                ))}
              </FormGroup>
            ) : (
              <RadioGroup
                value={fieldValue || ''}
                onChange={(e) => handleChange(activity.id, e.target.value, index)}
              >
                {activity.options?.map((option) => (
                  <FormControlLabel
                    key={option.value}
                    value={option.value}
                    control={<Radio />}
                    label={option.label}
                  />
                ))}
              </RadioGroup>
            )}
            {hasError && (
              <Typography variant="caption" color="error">
                Campo requerido
              </Typography>
            )}
          </FormControl>,
          index
        );
      }

      case 'boolean':
        return wrapField(
          <FormControlLabel
            control={
              <Checkbox
                checked={!!fieldValue}
                onChange={(e) => handleChange(activity.id, e.target.checked, index)}
              />
            }
            label="Sí / Activado"
          />,
          index
        );

      case 'datetime': {
        const isOldDate = (activity.fieldType as string) === 'date';
        const isOldTime = (activity.fieldType as string) === 'time';
        
        const includeDate = activity.datetimeIncludeDate !== undefined ? activity.datetimeIncludeDate : 
                          (isOldDate || (activity.fieldType === 'datetime' && activity.datetimeIncludeDate !== false));
        const includeTime = activity.datetimeIncludeTime !== undefined ? activity.datetimeIncludeTime : 
                          (isOldTime || (activity.fieldType === 'datetime' && activity.datetimeIncludeTime !== false));
        
        const dateKey = index !== undefined ? `${activity.id}_date_${index}` : `${activity.id}_date`;
        const timeKey = index !== undefined ? `${activity.id}_time_${index}` : `${activity.id}_time`;
        const dateValue = formValues[dateKey] || '';
        const timeValue = formValues[timeKey] || '';
        
        return wrapField(
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {includeDate && (
              <TextField
                type="date"
                label="Fecha"
                value={dateValue}
                onChange={(e) => {
                  handleChange(dateKey, e.target.value, undefined);
                }}
                onClick={handleDateFieldClick}
                InputLabelProps={{ shrink: true }}
                error={showValidation && activity.required && includeDate && !dateValue}
                helperText={showValidation && activity.required && includeDate && !dateValue ? 'Campo requerido' : ''}
                sx={{ minWidth: 200, ...dateFieldStyles }}
              />
            )}
            {includeTime && (
              <TextField
                type="text"
                label="Hora"
                placeholder="HH:MM"
                value={normalizeTime(timeValue)}
                onChange={(e) => {
                  const formatted = formatTimeInput(e.target.value);
                  handleChange(timeKey, formatted, undefined);
                }}
                onBlur={(e) => {
                  const timeValueNormalized = normalizeTime(e.target.value);
                  if (timeValueNormalized && !isValidTime(timeValueNormalized)) {
                    handleChange(timeKey, '', undefined);
                  } else {
                    handleChange(timeKey, timeValueNormalized, undefined);
                  }
                }}
                InputLabelProps={{ shrink: true }}
                inputProps={{ 
                  maxLength: 5,
                  pattern: '[0-9]{2}:[0-9]{2}'
                }}
                error={showValidation && activity.required && includeTime && !timeValue}
                helperText={
                  showValidation && activity.required && includeTime && !timeValue 
                    ? 'Campo requerido' 
                    : 'Formato: HH:MM (ej: 14:30)'
                }
                sx={{ minWidth: 200 }}
              />
            )}
          </Box>,
          index
        );
      }

      case 'file':
        return wrapField(
          <Box>
            <input
              type="file"
              id={fieldId}
              onChange={(e) => {
                const file = e.target.files?.[0];
                handleChange(activity.id, file?.name || '', index);
              }}
              style={{ display: 'none' }}
            />
            <label htmlFor={fieldId}>
              <Button variant="outlined" component="span">
                Seleccionar archivo...
              </Button>
            </label>
            {fieldValue && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Archivo: {fieldValue}
              </Typography>
            )}
            {showValidation && activity.required && !fieldValue && (
              <Typography variant="caption" color="error" display="block">
                Campo requerido
              </Typography>
            )}
          </Box>,
          index
        );

      case 'calculated': {
        const calculatedValue = evaluateFormula && activity.calculationFormula 
          ? evaluateFormula(activity.calculationFormula, formValues)
          : null;
        
        let displayValue = '';
        if (calculatedValue !== null && !isNaN(calculatedValue)) {
          const decimalPlaces = activity.decimalPlaces ?? 2;
          displayValue = calculatedValue.toFixed(decimalPlaces);
        } else {
          displayValue = '—';
        }
        
        return wrapField(
          <Box>
            <TextField
              type="text"
              value={displayValue}
              InputProps={{
                readOnly: true,
                startAdornment: activity.measurementUnit ? (
                  <Box component="span" sx={{ mr: 1, color: 'text.secondary' }}>
                    {activity.measurementUnit}
                  </Box>
                ) : null,
              }}
              fullWidth
              label="Valor Calculado"
              helperText={
                activity.calculationFormula
                  ? `Calculado automáticamente: ${activity.calculationFormula}`
                  : 'No hay fórmula configurada'
              }
              sx={{
                '& .MuiInputBase-input': {
                  backgroundColor: 'action.hover',
                  fontWeight: 'medium',
                },
              }}
            />
          </Box>,
          index
        );
      }

      case 'medication_tracking': {
        const config = activity.medicationTrackingConfig;
        if (!config) {
          return wrapField(
            <Alert severity="warning">
              No hay configuración de medicación. Edite la actividad para configurarla.
            </Alert>,
            index
          );
        }

        const handleMedChange = (field: string, val: any) => {
          const medValue = typeof fieldValue === 'object' && fieldValue !== null ? fieldValue : {};
          const newValue = { ...medValue, [field]: val };
          handleChange(activity.id, newValue, index);
        };
        
        return wrapField(
          <MedicationTrackingField
            activityId={activity.id}
            config={config}
            value={fieldValue}
            onChange={handleMedChange}
            showValidation={showValidation}
            required={activity.required || false}
            medicationErrors={medicationErrors[activity.id] || {}}
            onMedicationErrorChange={(errorId, state) => {
              if (setMedicationErrors) {
                setMedicationErrors(prev => ({
                  ...prev,
                  [activity.id]: {
                    ...prev[activity.id],
                    [errorId]: state,
                  },
                }));
              }
            }}
            getVisitDate={getVisitDate}
          />,
          index
        );
      }

      default:
        return (
          <Typography variant="body2" color="text.secondary">
            [Campo tipo: {activity.fieldType}]
          </Typography>
        );
    }
  };

  // Renderizar campos de fecha/hora globales para mediciones múltiples
  const renderGlobalDateTimeFields = () => {
    if (!activity.allowMultiple) return null;
    if (!((activity.requireDate && activity.requireDatePerMeasurement === false) || 
          (activity.requireTime && activity.requireTimePerMeasurement === false))) {
      return null;
    }

    return (
      <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Fecha/Hora para todas las mediciones:
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {activity.requireDate && activity.requireDatePerMeasurement === false && (() => {
            const dateError = getDateTimeError().date;
            return (
              <TextField
                type="date"
                label="Fecha de realización (común a todas las mediciones)"
                value={formValues[`${activity.id}_date`] || ''}
                onChange={(e) => handleChange(`${activity.id}_date`, e.target.value)}
                onClick={handleDateFieldClick}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 200, ...dateFieldStyles }}
                error={dateError}
                helperText={dateError ? 'La fecha es obligatoria cuando se ingresa un valor' : ''}
              />
            );
          })()}
          {activity.requireTime && activity.requireTimePerMeasurement === false && (() => {
            const timeError = getDateTimeError().time;
            return (
              <TextField
                type="text"
                label="Hora de realización (común a todas las mediciones)"
                placeholder="HH:MM"
                value={normalizeTime(formValues[`${activity.id}_time`] || '')}
                onChange={(e) => {
                  const formatted = formatTimeInput(e.target.value);
                  handleChange(`${activity.id}_time`, formatted);
                }}
                onBlur={(e) => {
                  const timeValue = normalizeTime(e.target.value);
                  if (timeValue && !isValidTime(timeValue)) {
                    handleChange(`${activity.id}_time`, '');
                  } else {
                    handleChange(`${activity.id}_time`, timeValue);
                  }
                }}
                InputLabelProps={{ shrink: true }}
                inputProps={{ 
                  maxLength: 5,
                  pattern: '[0-9]{2}:[0-9]{2}'
                }}
                size="small"
                sx={{ minWidth: 200 }}
                error={timeError}
                helperText={
                  timeError 
                    ? 'La hora es obligatoria cuando se ingresa un valor' 
                    : 'Formato: HH:MM (ej: 14:30)'
                }
              />
            );
          })()}
        </Box>
      </Box>
    );
  };

  // Renderizar campos de fecha/hora por medición
  const renderPerMeasurementDateTimeFields = (index: number) => {
    if (!((activity.requireDate && activity.requireDatePerMeasurement !== false) || 
          (activity.requireTime && activity.requireTimePerMeasurement !== false))) {
      return null;
    }

    return (
      <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {activity.requireDate && activity.requireDatePerMeasurement !== false && (() => {
          const dateError = getDateTimeError(index).date;
          return (
            <TextField
              type="date"
              label="Fecha de realización"
              value={formValues[`${activity.id}_date_${index}`] || ''}
              onChange={(e) => handleChange(`${activity.id}_date_${index}`, e.target.value)}
              onClick={handleDateFieldClick}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ minWidth: 200, ...dateFieldStyles }}
              error={dateError}
              helperText={dateError ? 'La fecha es obligatoria cuando se ingresa un valor' : ''}
            />
          );
        })()}
        {activity.requireTime && activity.requireTimePerMeasurement !== false && (() => {
          const timeError = getDateTimeError(index).time;
          const hasTimeInterval = activity.timeIntervalMinutes && activity.timeIntervalMinutes > 0;
          const isFirstMeasurement = index === 0;
          
          if (hasTimeInterval && !isFirstMeasurement) {
            const firstTime = normalizeTime(formValues[`${activity.id}_time_0`] || '');
            const calculatedTime = firstTime && isValidTime(firstTime)
              ? addMinutesToTime(firstTime, activity.timeIntervalMinutes! * index)
              : '';
            return (
              <TextField
                type="text"
                label="Hora de realización"
                value={calculatedTime}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 200 }}
                InputProps={{
                  readOnly: true,
                }}
                helperText={`Calculada automáticamente (+${activity.timeIntervalMinutes! * index} min desde la primera)`}
              />
            );
          }
          
          return (
            <TextField
              type="text"
              label="Hora de realización"
              placeholder="HH:MM"
              value={normalizeTime(formValues[`${activity.id}_time_${index}`] || '')}
              onChange={(e) => {
                const formatted = formatTimeInput(e.target.value);
                handleChange(`${activity.id}_time_${index}`, formatted);
              }}
              onBlur={(e) => {
                const timeValue = normalizeTime(e.target.value);
                if (timeValue && !isValidTime(timeValue)) {
                  handleChange(`${activity.id}_time_${index}`, '');
                } else {
                  handleChange(`${activity.id}_time_${index}`, timeValue);
                }
              }}
              InputLabelProps={{ shrink: true }}
              inputProps={{ 
                maxLength: 5,
                pattern: '[0-9]{2}:[0-9]{2}'
              }}
              size="small"
              sx={{ minWidth: 200 }}
              error={timeError}
              helperText={
                hasTimeInterval && isFirstMeasurement
                  ? 'Las demás horas se calcularán automáticamente'
                  : timeError 
                    ? 'La hora es obligatoria cuando se ingresa un valor' 
                    : 'Formato: HH:MM (ej: 14:30)'
              }
            />
          );
        })()}
      </Box>
    );
  };

  // Renderizar campos de fecha/hora para actividades no-múltiples
  const renderSingleActivityDateTimeFields = () => {
    if (activity.allowMultiple) return null;
    if (!activity.requireDate && !activity.requireTime) return null;

    return (
      <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {activity.requireDate && (() => {
          const dateError = getDateTimeError().date;
          return (
            <TextField
              type="date"
              label="Fecha en que se realizó la actividad"
              value={formValues[`${activity.id}_date`] || ''}
              onChange={(e) => handleChange(`${activity.id}_date`, e.target.value)}
              onClick={handleDateFieldClick}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ minWidth: 200, ...dateFieldStyles }}
              error={dateError}
              helperText={dateError ? 'La fecha es obligatoria cuando se ingresa un valor' : ''}
            />
          );
        })()}
        {activity.requireTime && (() => {
          const timeError = getDateTimeError().time;
          return (
            <TextField
              type="text"
              label="Hora en que se realizó la actividad"
              placeholder="HH:MM"
              value={normalizeTime(formValues[`${activity.id}_time`] || '')}
              onChange={(e) => {
                const formatted = formatTimeInput(e.target.value);
                handleChange(`${activity.id}_time`, formatted);
              }}
              onBlur={(e) => {
                const timeValue = normalizeTime(e.target.value);
                if (timeValue && !isValidTime(timeValue)) {
                  handleChange(`${activity.id}_time`, '');
                } else {
                  handleChange(`${activity.id}_time`, timeValue);
                }
              }}
              InputLabelProps={{ shrink: true }}
              inputProps={{ 
                maxLength: 5,
                pattern: '[0-9]{2}:[0-9]{2}'
              }}
              size="small"
              sx={{ minWidth: 200 }}
              error={timeError}
              helperText={
                timeError 
                  ? 'La hora es obligatoria cuando se ingresa un valor' 
                  : 'Formato: HH:MM (ej: 14:30)'
              }
            />
          );
        })()}
      </Box>
    );
  };

  return (
    <Paper key={activity.id} sx={{ p: 3, mb: 3 }}>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Typography variant="h6">
          {activity.name}
          {activity.required && <span style={{ color: 'red' }}> *</span>}
        </Typography>
        {activity.allowMultiple && (
          <Chip
            label={`Repetible (${activity.repeatCount}x)`}
            size="small"
            color="primary"
            variant="outlined"
          />
        )}
      </Box>

      {activity.helpText && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {activity.helpText}
        </Alert>
      )}

      {activity.allowMultiple ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {renderGlobalDateTimeFields()}
          
          {Array.from({ length: activity.repeatCount || 3 }).map((_, index) => (
            <Box key={index}>
              <Typography variant="subtitle2" gutterBottom>
                Medición {index + 1}:
              </Typography>
              {renderSingleField(index)}
              {renderPerMeasurementDateTimeFields(index)}
            </Box>
          ))}
        </Box>
      ) : (
        <>
          {renderSingleField()}
          {renderSingleActivityDateTimeFields()}
        </>
      )}

      {/* Mostrar errores de validación */}
      {showValidation && activityErrors.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {activityErrors.map((err, idx) => (
            <Alert 
              key={idx} 
              severity={err.rule.severity === 'error' ? 'error' : 'warning'}
              sx={{ mb: 1 }}
            >
              {err.rule.message}
            </Alert>
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default ActivityFieldRenderer;

