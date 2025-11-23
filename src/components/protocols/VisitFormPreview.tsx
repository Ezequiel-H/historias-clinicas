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

// Tipo para funciones de validación estandarizadas
type ValidationFunction = (
  activity: Activity,
  value: any,
  formValues: Record<string, any>,
  index?: number
) => { isValid: boolean; error?: ValidationError };

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

  // Resetear el formulario cuando se abre/cierra el modal
  useEffect(() => {
    if (!open) {
      setFormValues({});
      setValidationErrors([]);
      setShowValidation(false);
      setShowSuccessToast(false);
    }
  }, [open]);

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

  // ============================================
  // FUNCIONES DE VALIDACIÓN ESTANDARIZADAS
  // ============================================

  /**
   * Construye el array de funciones de validación para una actividad
   */
  const buildValidationRules = (activity: Activity): ValidationFunction[] => {
    const rules: ValidationFunction[] = [];

    // 1. Validación de campo requerido
    if (activity.required) {
      rules.push(validateRequired);
    }

    // 2. Validación de fecha requerida (si hay valor)
    if (activity.requireDate) {
      rules.push(validateRequiredDate);
    }

    // 3. Validación de hora requerida (si hay valor)
    if (activity.requireTime) {
      rules.push(validateRequiredTime);
    }

    // 4. Validación de opciones obligatorias
    if (activity.options && activity.options.some(opt => opt.required)) {
      rules.push(validateRequiredOptions);
    }

    // 5. Validación de opciones excluyentes
    if (activity.options && activity.options.some(opt => opt.exclusive)) {
      rules.push(validateExclusiveOptions);
    }

    // 6. Validación de reglas personalizadas (validationRules)
    if (activity.validationRules && activity.validationRules.length > 0) {
      rules.push(validateCustomRules);
    }

    return rules;
  };

  /**
   * Valida que el campo requerido tenga un valor
   */
  const validateRequired: ValidationFunction = (activity, value, _formValues, index) => {
    // Para campos repetibles con índice específico, validar solo esa medición
    if (activity.allowMultiple && index !== undefined) {
      const measurementValue = Array.isArray(value) ? value[index] : undefined;
      const hasMeasurementValue = measurementValue !== undefined && measurementValue !== null && measurementValue !== '';
      
      if (hasMeasurementValue) {
        return { isValid: true };
      }
      
      // Para campos repetibles, no mostrar error por medición individual si hay otras con valor
      // Solo validar si es la primera medición o si todas están vacías
      if (index === 0 || (Array.isArray(value) && value.every(v => v === '' || v === null || v === undefined))) {
        return {
          isValid: false,
          error: {
            activityId: activity.id,
            activityName: activity.name,
            rule: {
              id: `required_${index}`,
              name: 'Campo requerido',
              condition: 'equals',
              value: '',
              severity: 'error',
              message: `El campo "${activity.name}" requiere al menos una medición.`,
              isActive: true,
            },
          },
        };
      }
      
      return { isValid: true };
    }
    
    // Para campos simples o validación general de repetibles
    const hasValue = value !== undefined && value !== null && value !== '' && 
                    !(Array.isArray(value) && value.every(v => v === '' || v === null || v === undefined));
    
    if (hasValue) {
      return { isValid: true };
    }

    return {
      isValid: false,
      error: {
        activityId: activity.id,
        activityName: activity.name,
        rule: {
          id: 'required',
          name: 'Campo requerido',
          condition: 'equals',
          value: '',
          severity: 'error',
          message: `El campo "${activity.name}" es obligatorio.`,
          isActive: true,
        },
      },
    };
  };

  /**
   * Valida que la fecha esté presente cuando hay valor en el campo principal
   */
  const validateRequiredDate: ValidationFunction = (activity, value, formValues, index) => {
    const hasValue = value !== undefined && value !== null && value !== '' && 
                    !(Array.isArray(value) && value.every(v => v === '' || v === null || v === undefined));
    
    if (!hasValue) {
      return { isValid: true }; // No validar si no hay valor principal
    }

    let dateKey: string;
    let measurementValue: any;
    
    if (activity.allowMultiple && index !== undefined) {
      measurementValue = Array.isArray(value) ? value[index] : undefined;
      const hasMeasurementValue = measurementValue !== undefined && measurementValue !== null && measurementValue !== '';
      if (!hasMeasurementValue) {
        return { isValid: true }; // No validar si esta medición específica no tiene valor
      }
      dateKey = `${activity.id}_date_${index}`;
    } else if (activity.allowMultiple) {
      // Para campos repetibles sin índice específico, validar todas las mediciones
      // Esta validación se hará por cada índice en el bucle principal
      return { isValid: true };
    } else {
      dateKey = `${activity.id}_date`;
    }

    const dateValue = formValues[dateKey];
    if (dateValue && dateValue !== '') {
      return { isValid: true };
    }

    const measurementText = index !== undefined ? ` en la medición ${index + 1}` : '';
    return {
      isValid: false,
      error: {
        activityId: activity.id,
        activityName: activity.name,
        rule: {
          id: `required_date${index !== undefined ? `_${index}` : ''}`,
          name: 'Fecha requerida',
          condition: 'equals',
          value: '',
          severity: 'error',
          message: `La fecha es obligatoria cuando se ingresa un valor${measurementText} en "${activity.name}".`,
          isActive: true,
        },
      },
    };
  };

  /**
   * Valida que la hora esté presente cuando hay valor en el campo principal
   */
  const validateRequiredTime: ValidationFunction = (activity, value, formValues, index) => {
    const hasValue = value !== undefined && value !== null && value !== '' && 
                    !(Array.isArray(value) && value.every(v => v === '' || v === null || v === undefined));
    
    if (!hasValue) {
      return { isValid: true }; // No validar si no hay valor principal
    }

    let timeKey: string;
    let measurementValue: any;
    
    if (activity.allowMultiple && index !== undefined) {
      measurementValue = Array.isArray(value) ? value[index] : undefined;
      const hasMeasurementValue = measurementValue !== undefined && measurementValue !== null && measurementValue !== '';
      if (!hasMeasurementValue) {
        return { isValid: true }; // No validar si esta medición específica no tiene valor
      }
      timeKey = `${activity.id}_time_${index}`;
    } else if (activity.allowMultiple) {
      // Para campos repetibles sin índice específico, validar todas las mediciones
      return { isValid: true };
    } else {
      timeKey = `${activity.id}_time`;
    }

    const timeValue = formValues[timeKey];
    if (timeValue && timeValue !== '') {
      return { isValid: true };
    }

    const measurementText = index !== undefined ? ` en la medición ${index + 1}` : '';
    return {
      isValid: false,
      error: {
        activityId: activity.id,
        activityName: activity.name,
        rule: {
          id: `required_time${index !== undefined ? `_${index}` : ''}`,
          name: 'Hora requerida',
          condition: 'equals',
          value: '',
          severity: 'error',
          message: `La hora es obligatoria cuando se ingresa un valor${measurementText} en "${activity.name}".`,
          isActive: true,
        },
      },
    };
  };

  /**
   * Valida que las opciones obligatorias estén seleccionadas
   */
  const validateRequiredOptions: ValidationFunction = (activity, value) => {
    if (!activity.options) {
      return { isValid: true };
    }

    const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);
    const requiredOptions = activity.options.filter(opt => opt.required);
    
    for (const requiredOpt of requiredOptions) {
      if (!selectedValues.includes(requiredOpt.value)) {
        return {
          isValid: false,
          error: {
          activityId: activity.id,
          activityName: activity.name,
          rule: {
              id: `required_${requiredOpt.value}`,
              name: 'Opción obligatoria no seleccionada',
              condition: 'equals',
              value: requiredOpt.value,
            severity: 'error',
              message: `La opción "${requiredOpt.label}" debe ser seleccionada obligatoriamente para que el paciente califique para este protocolo.`,
            isActive: true,
          },
          },
        };
      }
    }

    return { isValid: true };
  };

  /**
   * Valida que no se hayan seleccionado opciones excluyentes
   */
  const validateExclusiveOptions: ValidationFunction = (activity, value) => {
    if (!activity.options) {
      return { isValid: true };
    }

    const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);
    const exclusiveOptions = activity.options.filter(opt => opt.exclusive);
    
    for (const exclusiveOpt of exclusiveOptions) {
      if (selectedValues.includes(exclusiveOpt.value)) {
        return {
          isValid: false,
          error: {
            activityId: activity.id,
            activityName: activity.name,
            rule: {
              id: `exclusive_${exclusiveOpt.value}`,
              name: 'Opción excluyente seleccionada',
              condition: 'equals',
              value: exclusiveOpt.value,
              severity: 'error',
              message: `La opción "${exclusiveOpt.label}" es excluyente. Si el paciente tiene esta condición, NO califica para este protocolo.`,
              isActive: true,
            },
          },
        };
      }
    }

    return { isValid: true };
  };

  /**
   * Valida las reglas personalizadas (validationRules)
   */
  const validateCustomRules: ValidationFunction = (activity, value, formValues) => {
    if (!activity.validationRules || activity.validationRules.length === 0) {
      return { isValid: true };
    }

    // Obtener el valor numérico a validar
    let numericValue: number | null = null;
    
    if (activity.allowMultiple && Array.isArray(value)) {
      const numericValues = value.filter(v => v !== '' && v !== null && !isNaN(Number(v))).map(Number);
      if (numericValues.length > 0) {
        numericValue = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      }
    } else if (value !== '' && value !== null && !isNaN(Number(value))) {
      numericValue = Number(value);
    }
    
    if (numericValue === null) {
      return { isValid: true }; // No validar si no hay valor
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
        return {
          isValid: false,
          error: {
          activityId: activity.id,
          activityName: activity.name,
          rule,
          currentValue: numericValue,
          },
        };
      }
    }

    return { isValid: true };
  };

  /**
   * Ejecuta todas las validaciones para una actividad
   */
  const runValidations = (
    activity: Activity,
    value: any,
    formValues: Record<string, any>,
    index?: number
  ): ValidationError[] => {
    const validationRules = buildValidationRules(activity);
    const errors: ValidationError[] = [];

    for (const validationRule of validationRules) {
      const result = validationRule(activity, value, formValues, index);
      if (!result.isValid && result.error) {
        errors.push(result.error);
      }
    }

    return errors;
  };

  const revalidateForm = (values: Record<string, any>) => {
    // Validar reglas de todas las actividades usando el sistema estandarizado
    const allErrors: ValidationError[] = [];
    
    for (const activity of activities) {
      const value = values[activity.id];
      
        if (activity.allowMultiple && activity.repeatCount) {
        // Para campos repetibles, validar cada medición individualmente
          for (let i = 0; i < activity.repeatCount; i++) {
          const errors = runValidations(activity, value, values, i);
          allErrors.push(...errors);
          }
        } else {
        // Para campos simples
        const errors = runValidations(activity, value, values);
        allErrors.push(...errors);
      }
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

  const handleSubmit = () => {
    setShowValidation(true);
    
    // Ejecutar todas las validaciones usando el sistema estandarizado
    const allErrors: ValidationError[] = [];
    
    for (const activity of activities) {
      const value = formValues[activity.id];
      
      if (activity.allowMultiple && activity.repeatCount) {
        // Para campos repetibles, validar cada medición individualmente
        for (let i = 0; i < activity.repeatCount; i++) {
          const errors = runValidations(activity, value, formValues, i);
          allErrors.push(...errors);
              }
            } else {
              // Para campos simples
        const errors = runValidations(activity, value, formValues);
        allErrors.push(...errors);
      }
    }

    setValidationErrors(allErrors);

    // Verificar si hay errores bloqueantes
    const blockingErrors = allErrors.filter(e => e.rule.severity === 'error');
    if (blockingErrors.length === 0) {
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
          const hasRangeError = showValidation && activityErrors.some(e => 
            e.rule.condition === 'range'
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
          return (
            <FormControl component="fieldset" error={showValidation && activity.required && (!fieldValue || fieldValue.length === 0)}>
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

        {activity.description && (
          <Typography variant="body2" color="text.secondary" paragraph>
            {activity.description}
          </Typography>
        )}

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
              <Button
                onClick={handleSubmit}
                variant="contained"
                startIcon={<SendIcon />}
              >
                Validar Formulario
              </Button>
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
        >
          Formulario válido! Todos los campos requeridos están completos y no hay errores de validación.
        </Alert>
      </Snackbar>
    </Dialog>
  );
};

