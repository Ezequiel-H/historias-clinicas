import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
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
  Snackbar,
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import type { Activity, ActivityRule } from '../../types';

interface VisitFormPreviewProps {
  open: boolean;
  onClose: () => void;
  visitName: string;
  activities: Activity[];
}

interface ValidationError {
  activityId: string;
  activityName: string;
  rule: ActivityRule;
  currentValue?: any;
}

export const VisitFormPreview: React.FC<VisitFormPreviewProps> = ({
  open,
  onClose,
  visitName,
  activities,
}) => {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showValuesDialog, setShowValuesDialog] = useState(false);
  const [validatedFormData, setValidatedFormData] = useState<any>(null);
  const [customOptionTexts, setCustomOptionTexts] = useState<Record<string, string>>({});

  // Resetear el formulario cuando se abre/cierra el modal
  useEffect(() => {
    if (!open) {
      setFormValues({});
      setValidationErrors([]);
      setShowValidation(false);
      setCustomOptionTexts({});
    }
  }, [open]);

  // Función helper para normalizar tiempo a formato HH:MM
  const normalizeTime = (timeValue: string): string => {
    if (!timeValue) return '';
    // Si tiene formato HH:MM:SS, tomar solo HH:MM
    if (timeValue.length >= 5) {
      return timeValue.substring(0, 5);
    }
    return timeValue;
  };

  // Función para formatear tiempo mientras se escribe (HH:MM)
  const formatTimeInput = (value: string): string => {
    // Remover todo excepto números
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length === 0) return '';
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.substring(0, 2)}:${numbers.substring(2)}`;
    
    // Limitar a 4 dígitos (HHMM)
    return `${numbers.substring(0, 2)}:${numbers.substring(2, 4)}`;
  };

  // Función para validar formato de tiempo HH:MM
  const isValidTime = (time: string): boolean => {
    if (!time || time.length !== 5) return false;
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    return !isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59;
  };

  // Función helper para verificar si debe mostrarse error en fecha/hora
  const shouldShowDateTimeError = (activity: Activity, index?: number): { date: boolean, time: boolean } => {
    if (!showValidation) return { date: false, time: false };
    
    const value = formValues[activity.id];
    let hasValue = false;
    
    if (index !== undefined) {
      // Para campos repetibles
      const measurementValue = Array.isArray(value) ? value[index] : undefined;
      hasValue = measurementValue !== undefined && measurementValue !== null && measurementValue !== '';
    } else {
      // Para campos simples
      hasValue = value !== undefined && value !== null && value !== '' && 
                 !(Array.isArray(value) && value.every(v => v === '' || v === null || v === undefined));
    }
    
    if (!hasValue) return { date: false, time: false };
    
    const dateKey = index !== undefined ? `${activity.id}_date_${index}` : `${activity.id}_date`;
    const timeKey = index !== undefined ? `${activity.id}_time_${index}` : `${activity.id}_time`;
    
    return {
      date: activity.requireDate ? (!formValues[dateKey] || formValues[dateKey] === '') : false,
      time: activity.requireTime ? (!formValues[timeKey] || formValues[timeKey] === '') : false,
    };
  };

  const handleChange = (activityId: string, value: any, index?: number) => {
    let newFormValues: Record<string, any>;
    
    if (index !== undefined) {
      // Para campos repetibles
      const currentValues = formValues[activityId] || [];
      const newValues = [...currentValues];
      newValues[index] = value;
      newFormValues = { ...formValues, [activityId]: newValues };
    } else {
      newFormValues = { ...formValues, [activityId]: value };
    }
    
    setFormValues(newFormValues);
    
    // Re-validar en tiempo real si ya se mostró la validación
    if (showValidation) {
      revalidateForm(newFormValues);
    }
  };

  const revalidateForm = (values: Record<string, any>) => {
    // Validar reglas de todas las actividades
    const allErrors: ValidationError[] = [];
    for (const activity of activities) {
      const value = values[activity.id];
      const errors = validateActivity(activity, value);
      allErrors.push(...errors);
    }
    setValidationErrors(allErrors);
  };

  const evaluateFormula = (formula: string, activityValues: Record<string, any>): number | null => {
    try {
      // Crear un objeto con los valores de las actividades numéricas
      const context: Record<string, number> = {};
      
      for (const [activityId, value] of Object.entries(activityValues)) {
        const activity = activities.find(a => a.id === activityId);
        if (activity) {
          // Normalizar el nombre de la actividad como variable (lowercase y trim)
          const originalName = activity.name.toLowerCase().trim();
          // También crear versión sin espacios para mayor flexibilidad
          const normalizedName = originalName.replace(/\s+/g, '');
          
          // Para campos repetibles, usar el promedio
          let numValue: number | undefined;
          if (Array.isArray(value)) {
            const numericValues = value.filter(v => v !== '' && v !== null && !isNaN(Number(v))).map(Number);
            if (numericValues.length > 0) {
              numValue = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
            }
          } else if (value !== '' && value !== null && !isNaN(Number(value))) {
            numValue = Number(value);
          }
          
          if (numValue !== undefined) {
            // Guardar con ambos nombres (original y sin espacios)
            context[originalName] = numValue;
            if (normalizedName !== originalName) {
              context[normalizedName] = numValue;
            }
          }
        }
      }

      // Reemplazar variables en la fórmula
      let processedFormula = formula.toLowerCase().trim();
      
      // Ordenar por longitud descendente para reemplazar primero las más largas
      // (evita que "peso total" se reemplace parcialmente por "peso")
      const sortedVars = Object.keys(context).sort((a, b) => b.length - a.length);
      
      for (const varName of sortedVars) {
        // Reemplazar la variable con su valor
        // Usar \b para word boundaries, pero escapar caracteres especiales
        const escapedVar = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedVar}\\b`, 'gi');
        processedFormula = processedFormula.replace(regex, String(context[varName]));
      }

      // Evaluar la fórmula de forma segura
      // Solo permitir números, operadores básicos y paréntesis
      if (!/^[\d\s+\-*/.()]+$/.test(processedFormula)) {
        return null;
      }

      // eslint-disable-next-line no-eval
      return eval(processedFormula);
    } catch (error) {
      return null;
    }
  };

  const validateActivity = (activity: Activity, value: any): ValidationError[] => {
    const errors: ValidationError[] = [];

    // Obtener el valor numérico a validar
    let numericValue: number | null = null;
    
    if (activity.allowMultiple && Array.isArray(value)) {
      // Para campos repetibles, calcular promedio de valores no vacíos
      const numericValues = value.filter(v => v !== '' && v !== null && !isNaN(Number(v))).map(Number);
      if (numericValues.length > 0) {
        numericValue = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      }
    } else if (value !== '' && value !== null && !isNaN(Number(value))) {
      numericValue = Number(value);
    }
    
    if (numericValue === null) {
      return errors; // No validar si no hay valor
    }

    // Validar rango de campos number_range con expectedMin/expectedMax
    if (activity.fieldType === 'number_range' && (activity.expectedMin !== undefined || activity.expectedMax !== undefined)) {
      let rangeViolated = false;
      let rangeMessage = '';

      if (activity.expectedMin !== undefined && numericValue < activity.expectedMin) {
        rangeViolated = true;
        rangeMessage = `El valor ${numericValue} está por debajo del mínimo esperado (${activity.expectedMin})`;
      } else if (activity.expectedMax !== undefined && numericValue > activity.expectedMax) {
        rangeViolated = true;
        rangeMessage = `El valor ${numericValue} está por encima del máximo esperado (${activity.expectedMax})`;
      }

      if (rangeViolated) {
        errors.push({
          activityId: activity.id,
          activityName: activity.name,
          rule: {
            name: 'Validación de Rango',
            condition: 'range',
            minValue: activity.expectedMin,
            maxValue: activity.expectedMax,
            severity: 'error',
            message: rangeMessage,
            isActive: true,
          },
          currentValue: numericValue,
        });
      }
    }

    // Validar reglas personalizadas
    if (!activity.validationRules || activity.validationRules.length === 0) {
      return errors;
    }

    for (const rule of activity.validationRules) {
      if (!rule.isActive) continue;

      let violated = false;

      switch (rule.condition) {
        case 'min':
          if (rule.minValue !== undefined && numericValue < rule.minValue) {
            violated = true;
          }
          break;
        
        case 'max':
          if (rule.maxValue !== undefined && numericValue > rule.maxValue) {
            violated = true;
          }
          break;
        
        case 'range':
          if (rule.minValue !== undefined && rule.maxValue !== undefined) {
            if (numericValue < rule.minValue || numericValue > rule.maxValue) {
              violated = true;
            }
          }
          break;
        
        case 'equals':
          if (rule.value !== undefined && numericValue !== Number(rule.value)) {
            violated = true;
          }
          break;
        
        case 'not_equals':
          if (rule.value !== undefined && numericValue === Number(rule.value)) {
            violated = true;
          }
          break;
        
        case 'formula':
          if (rule.formula) {
            // Usar operador por defecto si no está definido (para reglas viejas)
            const operator = rule.formulaOperator || '>';
            const formulaResult = evaluateFormula(rule.formula, formValues);
            
            if (formulaResult !== null) {
              switch (operator) {
                case '>':
                  violated = !(numericValue > formulaResult);
                  break;
                case '>=':
                  violated = !(numericValue >= formulaResult);
                  break;
                case '<':
                  violated = !(numericValue < formulaResult);
                  break;
                case '<=':
                  violated = !(numericValue <= formulaResult);
                  break;
                case '==':
                  violated = !(numericValue === formulaResult);
                  break;
                case '!=':
                  violated = !(numericValue !== formulaResult);
                  break;
              }
            }
          }
          break;
      }

      if (violated) {
        errors.push({
          activityId: activity.id,
          activityName: activity.name,
          rule,
          currentValue: numericValue,
        });
      }
    }

    return errors;
  };

  const handleSubmit = () => {
    setShowValidation(true);
    
    // Validar campos requeridos
    const missingRequired: string[] = [];
    for (const activity of activities) {
      if (activity.required) {
        const value = formValues[activity.id];
        if (value === undefined || value === null || value === '' || 
            (Array.isArray(value) && value.every(v => v === '' || v === null))) {
          missingRequired.push(activity.name);
        }
      }
    }

    // Validar fecha y hora cuando hay valor en el campo principal
    const dateTimeValidationErrors: ValidationError[] = [];
    for (const activity of activities) {
      const value = formValues[activity.id];
      const hasValue = value !== undefined && value !== null && value !== '' && 
                      !(Array.isArray(value) && value.every(v => v === '' || v === null || v === undefined));
      
      if (hasValue) {
        if (activity.allowMultiple && activity.repeatCount) {
          // Para campos repetibles, validar fecha y hora de cada medición que tenga valor
          for (let i = 0; i < activity.repeatCount; i++) {
            const measurementValue = Array.isArray(value) ? value[i] : undefined;
            const hasMeasurementValue = measurementValue !== undefined && measurementValue !== null && measurementValue !== '';
            
            if (hasMeasurementValue) {
              if (activity.requireDate) {
                const dateValue = formValues[`${activity.id}_date_${i}`];
                if (!dateValue || dateValue === '') {
                  dateTimeValidationErrors.push({
                    activityId: activity.id,
                    activityName: activity.name,
                    rule: {
                      id: `required_date_${i}`,
                      name: 'Fecha requerida',
                      condition: 'equals',
                      value: '',
                      severity: 'error',
                      message: `La fecha es obligatoria cuando se ingresa un valor en la medición ${i + 1} de "${activity.name}".`,
                      isActive: true,
                    },
                  });
                }
              }
              if (activity.requireTime) {
                const timeValue = formValues[`${activity.id}_time_${i}`];
                if (!timeValue || timeValue === '') {
                  dateTimeValidationErrors.push({
                    activityId: activity.id,
                    activityName: activity.name,
                    rule: {
                      id: `required_time_${i}`,
                      name: 'Hora requerida',
                      condition: 'equals',
                      value: '',
                      severity: 'error',
                      message: `La hora es obligatoria cuando se ingresa un valor en la medición ${i + 1} de "${activity.name}".`,
                      isActive: true,
                    },
                  });
                }
              }
            }
          }
        } else {
          // Para campos simples, validar fecha y hora si hay valor
          if (activity.requireDate) {
            const dateValue = formValues[`${activity.id}_date`];
            if (!dateValue || dateValue === '') {
              dateTimeValidationErrors.push({
                activityId: activity.id,
                activityName: activity.name,
                rule: {
                  id: `required_date`,
                  name: 'Fecha requerida',
                  condition: 'equals',
                  value: '',
                  severity: 'error',
                  message: `La fecha es obligatoria cuando se ingresa un valor en "${activity.name}".`,
                  isActive: true,
                },
              });
            }
          }
          if (activity.requireTime) {
            const timeValue = formValues[`${activity.id}_time`];
            if (!timeValue || timeValue === '') {
              dateTimeValidationErrors.push({
                activityId: activity.id,
                activityName: activity.name,
                rule: {
                  id: `required_time`,
                  name: 'Hora requerida',
                  condition: 'equals',
                  value: '',
                  severity: 'error',
                  message: `La hora es obligatoria cuando se ingresa un valor en "${activity.name}".`,
                  isActive: true,
                },
              });
            }
          }
        }
      }
    }

    // Validar opciones obligatorias y excluyentes
    const optionValidationErrors: ValidationError[] = [];
    for (const activity of activities) {
      if (activity.options && activity.options.length > 0) {
        const value = formValues[activity.id];
        const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);
        
        // Validar opciones obligatorias
        const requiredOptions = activity.options.filter(opt => opt.required);
        for (const requiredOpt of requiredOptions) {
          if (!selectedValues.includes(requiredOpt.value)) {
            optionValidationErrors.push({
              activityId: activity.id,
              activityName: activity.name,
              rule: {
                id: `required_${requiredOpt.value}`,
                name: `Opción obligatoria no seleccionada`,
                condition: 'equals',
                value: requiredOpt.value,
                severity: 'error',
                message: `La opción "${requiredOpt.label}" debe ser seleccionada obligatoriamente para que el paciente califique para este protocolo.`,
                isActive: true,
              },
            });
          }
        }
        
        // Validar opciones excluyentes
        const exclusiveOptions = activity.options.filter(opt => opt.exclusive);
        for (const exclusiveOpt of exclusiveOptions) {
          if (selectedValues.includes(exclusiveOpt.value)) {
            optionValidationErrors.push({
              activityId: activity.id,
              activityName: activity.name,
              rule: {
                id: `exclusive_${exclusiveOpt.value}`,
                name: `Opción excluyente seleccionada`,
                condition: 'equals',
                value: exclusiveOpt.value,
                severity: 'error',
                message: `La opción "${exclusiveOpt.label}" es excluyente. Si el paciente tiene esta condición, NO califica para este protocolo.`,
                isActive: true,
              },
            });
          }
        }
      }
    }

    // Validar reglas de todas las actividades
    const allErrors: ValidationError[] = [...optionValidationErrors, ...dateTimeValidationErrors];
    for (const activity of activities) {
      const value = formValues[activity.id];
      const errors = validateActivity(activity, value);
      allErrors.push(...errors);
    }

    setValidationErrors(allErrors);

    if (missingRequired.length === 0 && allErrors.filter(e => e.rule.severity === 'error').length === 0) {
      // Función helper para formatear valores numéricos
      const formatNumericValue = (value: any, activity: Activity): any => {
        if (value === null || value === undefined || value === '') {
          return value;
        }

        // Solo formatear si la actividad tiene decimalPlaces configurado
        if (activity.decimalPlaces === undefined) {
          return value;
        }

        const numericTypes = ['number_simple', 'number_range', 'number_compound'];
        if (!numericTypes.includes(activity.fieldType)) {
          return value;
        }

        const decimalPlaces = activity.decimalPlaces;

        // Si es un array (campos repetibles), formatear cada valor
        if (Array.isArray(value)) {
          return value.map(v => {
            const num = parseFloat(v);
            if (isNaN(num)) return v;
            // Devolver como string formateado para mantener los decimales en JSON
            return num.toFixed(decimalPlaces);
          });
        }

        // Si es un objeto (campo compuesto), formatear cada campo numérico
        if (typeof value === 'object' && value !== null) {
          const formatted: any = {};
          for (const key in value) {
            const num = parseFloat(value[key]);
            if (!isNaN(num)) {
              formatted[key] = num.toFixed(decimalPlaces);
            } else {
              formatted[key] = value[key];
            }
          }
          return formatted;
        }

        // Valor numérico simple
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        // Devolver como string formateado para mantener los decimales en JSON
        return num.toFixed(decimalPlaces);
      };

      // Construir objeto con los valores del formulario
      const formData: any = {
        visitName,
        activities: activities.map(activity => {
          const rawValue = formValues[activity.id];
          const formattedValue = formatNumericValue(rawValue, activity);
          
          const activityObj: any = {
            id: activity.id,
            name: activity.name,
            fieldType: activity.fieldType,
            value: formattedValue,
            helpText: activity.helpText, // Ayuda para el médico
            description: activity.description, // Instrucciones para la IA
          };

          // Incluir campos si existen en la actividad
          if (activity.measurementUnit) {
            activityObj.measurementUnit = activity.measurementUnit;
          }

          // Incluir fecha y hora si están configuradas
          if (activity.requireDate || activity.requireTime) {
            if (activity.allowMultiple) {
              // Para campos repetibles, construir array con fecha/hora por medición
              const measurements: any[] = [];
              const repeatCount = activity.repeatCount || 3;
              for (let i = 0; i < repeatCount; i++) {
                const measurementValue = Array.isArray(formattedValue) ? formattedValue[i] : undefined;
                const measurementDate = formValues[`${activity.id}_date_${i}`];
                const measurementTime = formValues[`${activity.id}_time_${i}`];
                
                if (measurementValue !== undefined || measurementDate || measurementTime) {
                  const measurement: any = {};
                  if (measurementValue !== undefined) {
                    measurement.value = measurementValue;
                  }
                  if (activity.requireDate && measurementDate) {
                    measurement.date = measurementDate;
                  }
                  if (activity.requireTime && measurementTime) {
                    measurement.time = normalizeTime(measurementTime);
                  }
                  measurements.push(measurement);
                }
              }
              if (measurements.length > 0) {
                activityObj.measurements = measurements;
              }
            } else {
              // Para campos simples
              const activityDate = formValues[`${activity.id}_date`];
              const activityTime = formValues[`${activity.id}_time`];
              if (activity.requireDate && activityDate) {
                activityObj.date = activityDate;
              }
              if (activity.requireTime && activityTime) {
                activityObj.time = normalizeTime(activityTime);
              }
            }
          }

          return activityObj;
        }),
        validationErrors: allErrors.filter(e => e.rule.severity === 'warning'),
        timestamp: new Date().toISOString(),
      };
      setValidatedFormData(formData);
      setShowSuccessToast(true);
    }
  };

  const renderField = (activity: Activity) => {
    const value = formValues[activity.id];
    const activityErrors = validationErrors.filter(e => e.activityId === activity.id);

    const renderSingleField = (index?: number) => {
      const fieldValue = index !== undefined ? (Array.isArray(value) ? value[index] : '') : value;
      const fieldId = index !== undefined ? `${activity.id}-${index}` : activity.id;

      switch (activity.fieldType) {
        case 'text_short':
          return (
            <TextField
              fullWidth
              value={fieldValue || ''}
              onChange={(e) => handleChange(activity.id, e.target.value, index)}
              placeholder="Ingrese texto..."
              error={showValidation && activity.required && !fieldValue}
              helperText={showValidation && activity.required && !fieldValue ? 'Campo requerido' : ''}
            />
          );

        case 'text_long':
          return (
            <TextField
              fullWidth
              multiline
              rows={4}
              value={fieldValue || ''}
              onChange={(e) => handleChange(activity.id, e.target.value, index)}
              placeholder="Ingrese observaciones..."
              error={showValidation && activity.required && !fieldValue}
              helperText={showValidation && activity.required && !fieldValue ? 'Campo requerido' : ''}
            />
          );

        case 'number_simple':
        case 'number_range':
          const hasRangeError = showValidation && activityErrors.some(e => 
            e.rule.condition === 'range' && e.rule.name === 'Validación de Rango'
          );
          return (
            <Box>
              <TextField
                type="number"
                value={fieldValue || ''}
                onChange={(e) => handleChange(activity.id, e.target.value, index)}
                placeholder="0"
                error={showValidation && (activity.required && !fieldValue || hasRangeError)}
                helperText={
                  showValidation && activity.required && !fieldValue 
                    ? 'Campo requerido' 
                    : activity.fieldType === 'number_range' && activity.expectedMin !== undefined && activity.expectedMax !== undefined
                    ? `Rango esperado: ${activity.expectedMin} - ${activity.expectedMax}${hasRangeError ? ' ⚠️' : ''}`
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
            </Box>
          );

        case 'select_single':
          return (
            <FormControl component="fieldset" error={showValidation && activity.required && !fieldValue}>
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
              {showValidation && activity.required && !fieldValue && (
                <Typography variant="caption" color="error">
                  Campo requerido
                </Typography>
              )}
            </FormControl>
          );

        case 'select_multiple':
          const currentValues = Array.isArray(fieldValue) ? fieldValue : [];
          const customOptionText = customOptionTexts[fieldId] || '';
          
          // Obtener opciones personalizadas (las que están en currentValues pero no en activity.options)
          const predefinedValues = activity.options?.map(opt => opt.value) || [];
          const customValues = currentValues.filter(v => !predefinedValues.includes(v));
          
          return (
            <FormControl component="fieldset" error={showValidation && activity.required && (!fieldValue || fieldValue.length === 0)}>
              <FormGroup>
                {/* Opciones precargadas */}
                {activity.options?.map((option) => (
                  <FormControlLabel
                    key={option.value}
                    control={
                      <Checkbox
                        checked={currentValues.includes(option.value)}
                        onChange={(e) => {
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
                
                {/* Opciones personalizadas agregadas por el médico */}
                {customValues.map((customValue, idx) => (
                  <FormControlLabel
                    key={`custom-${idx}-${customValue}`}
                    control={
                      <Checkbox
                        checked={true}
                        onChange={() => {
                          const newValues = currentValues.filter(v => v !== customValue);
                          handleChange(activity.id, newValues, index);
                        }}
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography>{customValue}</Typography>
                        <Chip label="Personalizada" size="small" color="primary" variant="outlined" />
                      </Box>
                    }
                  />
                ))}
                
                {/* Campo para agregar nueva opción personalizada (solo si está habilitado) */}
                {activity.allowCustomOptions && (
                  <Box display="flex" gap={1} alignItems="center" sx={{ mt: 1 }}>
                    <TextField
                      size="small"
                      placeholder="Agregar otra opción..."
                      value={customOptionText}
                      onChange={(e) => {
                        setCustomOptionTexts({
                          ...customOptionTexts,
                          [fieldId]: e.target.value,
                        });
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && customOptionText.trim()) {
                          const trimmedText = customOptionText.trim();
                          if (!currentValues.includes(trimmedText)) {
                            handleChange(activity.id, [...currentValues, trimmedText], index);
                            setCustomOptionTexts({
                              ...customOptionTexts,
                              [fieldId]: '',
                            });
                          }
                        }
                      }}
                      sx={{ flex: 1 }}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        if (customOptionText.trim()) {
                          const trimmedText = customOptionText.trim();
                          if (!currentValues.includes(trimmedText)) {
                            handleChange(activity.id, [...currentValues, trimmedText], index);
                            setCustomOptionTexts({
                              ...customOptionTexts,
                              [fieldId]: '',
                            });
                          }
                        }
                      }}
                      disabled={!customOptionText.trim() || currentValues.includes(customOptionText.trim())}
                    >
                      Agregar
                    </Button>
                  </Box>
                )}
              </FormGroup>
              {showValidation && activity.required && (!fieldValue || fieldValue.length === 0) && (
                <Typography variant="caption" color="error">
                  Campo requerido
                </Typography>
              )}
            </FormControl>
          );

        case 'boolean':
          return (
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!fieldValue}
                  onChange={(e) => handleChange(activity.id, e.target.checked, index)}
                />
              }
              label="Sí / Activado"
            />
          );

        case 'date':
          return (
            <TextField
              type="date"
              value={fieldValue || ''}
              onChange={(e) => handleChange(activity.id, e.target.value, index)}
              InputLabelProps={{ shrink: true }}
              error={showValidation && activity.required && !fieldValue}
              helperText={showValidation && activity.required && !fieldValue ? 'Campo requerido' : ''}
              sx={{ width: 250 }}
            />
          );

        case 'time':
          return (
            <TextField
              type="time"
              value={fieldValue || ''}
              onChange={(e) => handleChange(activity.id, e.target.value, index)}
              InputLabelProps={{ shrink: true }}
              error={showValidation && activity.required && !fieldValue}
              helperText={showValidation && activity.required && !fieldValue ? 'Campo requerido' : ''}
              sx={{ width: 250 }}
            />
          );

        case 'datetime':
          return (
            <TextField
              type="datetime-local"
              value={fieldValue || ''}
              onChange={(e) => handleChange(activity.id, e.target.value, index)}
              InputLabelProps={{ shrink: true }}
              error={showValidation && activity.required && !fieldValue}
              helperText={showValidation && activity.required && !fieldValue ? 'Campo requerido' : ''}
              sx={{ width: 250 }}
            />
          );

        case 'file':
          return (
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
            </Box>
          );

        default:
          return (
            <Typography variant="body2" color="text.secondary">
              [Campo tipo: {activity.fieldType}]
            </Typography>
          );
      }
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
            {Array.from({ length: activity.repeatCount || 3 }).map((_, index) => (
              <Box key={index}>
                <Typography variant="subtitle2" gutterBottom>
                  Medición {index + 1}:
                </Typography>
                {renderSingleField(index)}
                
                {/* Campos de fecha y hora para mediciones repetibles */}
                {(activity.requireDate || activity.requireTime) && (
                  <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {activity.requireDate && (() => {
                      const dateError = shouldShowDateTimeError(activity, index).date;
                      return (
                        <TextField
                          type="date"
                          label="Fecha de realización"
                          value={formValues[`${activity.id}_date_${index}`] || ''}
                          onChange={(e) => handleChange(`${activity.id}_date_${index}`, e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          size="small"
                          sx={{ minWidth: 200 }}
                          error={dateError}
                          helperText={dateError ? 'La fecha es obligatoria cuando se ingresa un valor' : ''}
                        />
                      );
                    })()}
                    {activity.requireTime && (() => {
                      const timeError = shouldShowDateTimeError(activity, index).time;
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
                              // Si el formato no es válido, limpiar el campo
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
                            timeError 
                              ? 'La hora es obligatoria cuando se ingresa un valor' 
                              : 'Formato: HH:MM (ej: 14:30)'
                          }
                        />
                      );
                    })()}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        ) : (
          <>
            {renderSingleField()}
            
            {/* Campos de fecha y hora para campos simples */}
            {(activity.requireDate || activity.requireTime) && (
              <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {activity.requireDate && (() => {
                  const dateError = shouldShowDateTimeError(activity).date;
                  return (
                    <TextField
                      type="date"
                      label="Fecha en que se realizó la actividad"
                      value={formValues[`${activity.id}_date`] || ''}
                      onChange={(e) => handleChange(`${activity.id}_date`, e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                      sx={{ minWidth: 200 }}
                      error={dateError}
                      helperText={dateError ? 'La fecha es obligatoria cuando se ingresa un valor' : ''}
                    />
                  );
                })()}
                {activity.requireTime && (() => {
                  const timeError = shouldShowDateTimeError(activity).time;
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
                          // Si el formato no es válido, limpiar el campo
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
            )}
          </>
        )}

        {/* Mostrar errores de validación para esta actividad */}
        {showValidation && activityErrors.length > 0 && (
          <Box sx={{ mt: 2 }}>
            {activityErrors.map((error, idx) => (
              <Alert 
                key={idx} 
                severity={error.rule.severity === 'error' ? 'error' : 'warning'}
                icon={error.rule.severity === 'error' ? <ErrorIcon /> : <WarningIcon />}
                sx={{ mb: 1 }}
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  {error.rule.name}
                </Typography>
                <Typography variant="body2">
                  {error.rule.message}
                </Typography>
                {error.currentValue !== undefined && (
                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                    Valor actual: {error.currentValue}
                  </Typography>
                )}
              </Alert>
            ))}
          </Box>
        )}
      </Paper>
    );
  };

  const hasBlockingErrors = validationErrors.some(e => e.rule.severity === 'error');
  const hasWarnings = validationErrors.some(e => e.rule.severity === 'warning');
  const sortedActivities = [...activities].sort((a, b) => a.order - b.order);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" component="div">
              Preview: {visitName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Complete el formulario para probar las validaciones
            </Typography>
          </Box>
          <Button onClick={onClose} startIcon={<CloseIcon />}>
            Cerrar
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {activities.length === 0 ? (
          <Alert severity="info">
            No hay campos configurados en esta visita. Agregue campos para poder probar el formulario.
          </Alert>
        ) : (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Este es un preview del formulario que verán los médicos. Complete los campos y haga clic en "Validar Formulario" para probar las reglas de validación.
              </Typography>
            </Alert>

            {sortedActivities.map(activity => renderField(activity))}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1, justifyContent: 'space-between' }}>
        <Box>
          {showValidation && (hasBlockingErrors || hasWarnings) && (
            <Box display="flex" gap={1} alignItems="center">
              {hasBlockingErrors && (
                <Chip
                  icon={<ErrorIcon />}
                  label={`${validationErrors.filter(e => e.rule.severity === 'error').length} Error${validationErrors.filter(e => e.rule.severity === 'error').length > 1 ? 'es' : ''}`}
                  color="error"
                  size="small"
                />
              )}
              {hasWarnings && (
                <Chip
                  icon={<WarningIcon />}
                  label={`${validationErrors.filter(e => e.rule.severity === 'warning').length} Alerta${validationErrors.filter(e => e.rule.severity === 'warning').length > 1 ? 's' : ''}`}
                  color="warning"
                  size="small"
                />
              )}
            </Box>
          )}
        </Box>
        <Box display="flex" gap={1}>
          <Button onClick={onClose} variant="outlined" startIcon={<CloseIcon />}>
            Cerrar
          </Button>
          {activities.length > 0 && (
            <>
              <Button
                onClick={() => setShowValuesDialog(true)}
                variant="outlined"
                startIcon={<CheckCircleIcon />}
                disabled={!validatedFormData}
              >
                Ver Objeto
              </Button>
              <Button
                onClick={handleSubmit}
                variant="contained"
                startIcon={<SendIcon />}
              >
                Validar Formulario
              </Button>
            </>
          )}
        </Box>
      </DialogActions>
      
      {/* Toast de validación exitosa */}
      <Snackbar
        open={showSuccessToast}
        autoHideDuration={5000}
        onClose={() => setShowSuccessToast(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setShowSuccessToast(false)}
          severity="success"
          sx={{ width: '100%', minWidth: 300 }}
          icon={<CheckCircleIcon />}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                setShowSuccessToast(false);
                setShowValuesDialog(true);
              }}
              sx={{ 
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Ver Objeto
            </Button>
          }
        >
          Formulario válido! Todos los campos requeridos están completos y no hay errores de validación.
        </Alert>
      </Snackbar>

      {/* Dialog para mostrar valores validados */}
      <Dialog
        open={showValuesDialog}
        onClose={() => setShowValuesDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CheckCircleIcon color="success" />
            <Typography variant="h6">Valores del Formulario</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Aquí están los valores completados en el formulario:
          </Typography>
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'grey.300',
              maxHeight: '60vh',
              overflow: 'auto',
            }}
          >
            <pre style={{ margin: 0, fontSize: '0.875rem', fontFamily: 'monospace' }}>
              {validatedFormData ? JSON.stringify(validatedFormData, null, 2) : 'Cargando...'}
            </pre>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowValuesDialog(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

