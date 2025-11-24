import React, { useState, useEffect, useRef } from 'react';
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
  Medication as MedicationIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
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
  const [showValuesDialog, setShowValuesDialog] = useState(false);
  const [validatedFormData, setValidatedFormData] = useState<any>(null);

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

  // Función para calcular la hora siguiente sumando minutos
  const addMinutesToTime = (time: string, minutesToAdd: number): string => {
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
      // Para campos simples o fecha/hora global
      if (activity.allowMultiple) {
        // Si es repetible y fecha/hora global, verificar si hay al menos una medición con valor
        hasValue = Array.isArray(value) && value.some(v => v !== '' && v !== null && v !== undefined);
      } else {
      hasValue = value !== undefined && value !== null && value !== '' && 
                 !(Array.isArray(value) && value.every(v => v === '' || v === null || v === undefined));
      }
    }
    
    if (!hasValue) return { date: false, time: false };
    
    // Determinar las claves según el modo (global o por medición)
    let dateKey: string;
    let timeKey: string;
    
    if (activity.allowMultiple) {
      if (index !== undefined) {
        // Modo por medición
        if (activity.requireDatePerMeasurement !== false) {
          dateKey = `${activity.id}_date_${index}`;
        } else {
          dateKey = `${activity.id}_date`; // Global
        }
        if (activity.requireTimePerMeasurement !== false) {
          timeKey = `${activity.id}_time_${index}`;
        } else {
          timeKey = `${activity.id}_time`; // Global
        }
      } else {
        // Modo global (sin índice)
        dateKey = `${activity.id}_date`;
        timeKey = `${activity.id}_time`;
      }
    } else {
      // Campos simples
      dateKey = `${activity.id}_date`;
      timeKey = `${activity.id}_time`;
    }
    
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
      setShowValuesDialog(false);
      setValidatedFormData(null);
    }
  }, [open]);

  // Actualizar valores calculados automáticamente cuando cambien los valores del formulario
  // Usamos un ref para evitar loops infinitos
  const prevFormValuesRef = useRef<Record<string, any>>({});
  
  useEffect(() => {
    // Solo actualizar si realmente cambió algún valor (no los calculados)
    const calculatedActivityIds = activities
      .filter(a => a.fieldType === 'calculated')
      .map(a => a.id);
    
    const relevantValuesChanged = Object.keys(formValues).some(key => {
      if (calculatedActivityIds.includes(key)) return false; // Ignorar cambios en campos calculados
      return formValues[key] !== prevFormValuesRef.current[key];
    });

    if (!relevantValuesChanged && Object.keys(prevFormValuesRef.current).length > 0) {
      return; // No hay cambios relevantes
    }

    const newFormValues = { ...formValues };
    let hasChanges = false;

    activities.forEach(activity => {
      if (activity.fieldType === 'calculated' && activity.calculationFormula) {
        const calculated = evaluateFormula(activity.calculationFormula, formValues);
        
        if (calculated !== null && !isNaN(calculated)) {
          const formattedValue = activity.decimalPlaces !== undefined
            ? Number(calculated.toFixed(activity.decimalPlaces))
            : calculated;
          
          if (newFormValues[activity.id] !== formattedValue) {
            newFormValues[activity.id] = formattedValue;
            hasChanges = true;
          }
        } else {
          // Si no se puede calcular, mantener vacío
          if (newFormValues[activity.id] !== undefined && newFormValues[activity.id] !== '') {
            newFormValues[activity.id] = '';
            hasChanges = true;
          }
        }
      }
    });

    if (hasChanges) {
      prevFormValuesRef.current = newFormValues;
      setFormValues(newFormValues);
    } else {
      prevFormValuesRef.current = formValues;
    }
  }, [formValues, activities]);

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
    
    // Si es un cambio de hora de la primera medición y hay intervalo configurado, calcular las demás
    if (activityId.includes('_time_0')) {
      const baseActivityId = activityId.replace('_time_0', '');
      const activity = activities.find(a => a.id === baseActivityId);
      if (activity && activity.allowMultiple && activity.requireTime && 
          activity.requireTimePerMeasurement !== false && activity.timeIntervalMinutes &&
          activity.repeatCount) {
        const firstTime = normalizeTime(value);
        if (firstTime && isValidTime(firstTime)) {
          // Calcular las horas de las demás mediciones
          for (let i = 1; i < activity.repeatCount; i++) {
            const calculatedTime = addMinutesToTime(firstTime, activity.timeIntervalMinutes * i);
            newFormValues[`${baseActivityId}_time_${i}`] = calculatedTime;
          }
        }
      }
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
  const validateRequired: ValidationFunction = (activity, value, formValues, index) => {
    // Para campos datetime, validar según datetimeIncludeDate y datetimeIncludeTime
    if (activity.fieldType === 'datetime') {
      const includeDate = activity.datetimeIncludeDate !== undefined ? activity.datetimeIncludeDate : true;
      const includeTime = activity.datetimeIncludeTime !== undefined ? activity.datetimeIncludeTime : false;
      
      // Determinar las claves de fecha y hora
      let dateKey: string;
      let timeKey: string;
      
      if (activity.allowMultiple && index !== undefined) {
        dateKey = `${activity.id}_date_${index}`;
        timeKey = `${activity.id}_time_${index}`;
      } else {
        dateKey = `${activity.id}_date`;
        timeKey = `${activity.id}_time`;
      }
      
      const dateValue = formValues[dateKey];
      const timeValue = formValues[timeKey];
      
      const hasDateValue = includeDate && dateValue !== undefined && dateValue !== null && dateValue !== '';
      const hasTimeValue = includeTime && timeValue !== undefined && timeValue !== null && timeValue !== '';
      
      // Si requiere ambos, ambos deben estar presentes
      if (includeDate && includeTime) {
        if (hasDateValue && hasTimeValue) {
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
              message: `El campo "${activity.name}" requiere fecha y hora.`,
              isActive: true,
            },
          },
        };
      }
      
      // Si solo requiere uno, ese debe estar presente
      if (includeDate && !hasDateValue) {
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
              message: `El campo "${activity.name}" requiere fecha.`,
              isActive: true,
            },
          },
        };
      }
      
      if (includeTime && !hasTimeValue) {
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
              message: `El campo "${activity.name}" requiere hora.`,
              isActive: true,
            },
          },
        };
      }
      
      return { isValid: true };
    }
    
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
    let hasValue = false;
    let dateKey: string;
    
    if (activity.allowMultiple) {
      if (index !== undefined) {
        // Validación por medición individual
        const measurementValue = Array.isArray(value) ? value[index] : undefined;
        hasValue = measurementValue !== undefined && measurementValue !== null && measurementValue !== '';
        if (!hasValue) {
          return { isValid: true }; // No validar si esta medición no tiene valor
        }
        // Determinar si es por medición o global
        if (activity.requireDatePerMeasurement !== false) {
          dateKey = `${activity.id}_date_${index}`;
        } else {
          dateKey = `${activity.id}_date`; // Global
        }
      } else {
        // Validación global: verificar si hay al menos una medición con valor
        hasValue = Array.isArray(value) && value.some(v => v !== '' && v !== null && v !== undefined);
        if (!hasValue) {
          return { isValid: true };
        }
        dateKey = `${activity.id}_date`; // Siempre global cuando no hay índice
      }
    } else {
      // Campo simple
      hasValue = value !== undefined && value !== null && value !== '' && 
                 !(Array.isArray(value) && value.every(v => v === '' || v === null || v === undefined));
      if (!hasValue) {
        return { isValid: true };
      }
      dateKey = `${activity.id}_date`;
    }

    const dateValue = formValues[dateKey];
    if (dateValue && dateValue !== '') {
      return { isValid: true };
    }

    const measurementText = activity.allowMultiple && index !== undefined && activity.requireDatePerMeasurement !== false
      ? ` en la medición ${index + 1}`
      : activity.allowMultiple && activity.requireDatePerMeasurement === false
      ? ' (fecha común para todas las mediciones)'
      : '';
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
    let hasValue = false;
    let timeKey: string;
    
    if (activity.allowMultiple) {
      if (index !== undefined) {
        // Validación por medición individual
        const measurementValue = Array.isArray(value) ? value[index] : undefined;
        hasValue = measurementValue !== undefined && measurementValue !== null && measurementValue !== '';
        if (!hasValue) {
          return { isValid: true }; // No validar si esta medición no tiene valor
        }
        // Determinar si es por medición o global
        if (activity.requireTimePerMeasurement !== false) {
          timeKey = `${activity.id}_time_${index}`;
        } else {
          timeKey = `${activity.id}_time`; // Global
        }
      } else {
        // Validación global: verificar si hay al menos una medición con valor
        hasValue = Array.isArray(value) && value.some(v => v !== '' && v !== null && v !== undefined);
        if (!hasValue) {
          return { isValid: true };
        }
        timeKey = `${activity.id}_time`; // Siempre global cuando no hay índice
      }
    } else {
      // Campo simple
      hasValue = value !== undefined && value !== null && value !== '' && 
                 !(Array.isArray(value) && value.every(v => v === '' || v === null || v === undefined));
      if (!hasValue) {
        return { isValid: true };
      }
      timeKey = `${activity.id}_time`;
    }

    const timeValue = formValues[timeKey];
    if (timeValue && timeValue !== '') {
      return { isValid: true };
    }

    const measurementText = activity.allowMultiple && index !== undefined && activity.requireTimePerMeasurement !== false
      ? ` en la medición ${index + 1}`
      : activity.allowMultiple && activity.requireTimePerMeasurement === false
      ? ' (hora común para todas las mediciones)'
      : '';
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
  const validateCustomRules: ValidationFunction = (activity, value, formValues, index) => {
    if (!activity.validationRules || activity.validationRules.length === 0) {
      return { isValid: true };
    }

    // Obtener el valor numérico a validar
    let numericValue: number | null = null;
    
    // Si hay un índice específico (campos repetibles), validar solo esa medición
    if (activity.allowMultiple && index !== undefined && Array.isArray(value)) {
      const measurementValue = value[index];
      if (measurementValue !== '' && measurementValue !== null && !isNaN(Number(measurementValue))) {
        numericValue = Number(measurementValue);
      }
    } else if (activity.allowMultiple && Array.isArray(value)) {
      // Si es repetible pero no hay índice, calcular promedio (para compatibilidad)
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
        // Crear un mensaje personalizado que incluya el número de medición si es repetible
        const measurementText = activity.allowMultiple && index !== undefined 
          ? ` (Medición ${index + 1})` 
          : '';
        const customRule = {
          ...rule,
          message: rule.message + measurementText,
        };
        
        return {
          isValid: false,
          error: {
          activityId: activity.id,
          activityName: activity.name,
            rule: customRule,
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
        
        // Si fecha/hora es global, validar también sin índice (una vez para todas)
        if ((activity.requireDate && activity.requireDatePerMeasurement === false) ||
            (activity.requireTime && activity.requireTimePerMeasurement === false)) {
          const globalErrors = runValidations(activity, value, values);
          allErrors.push(...globalErrors);
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
        
        // Si fecha/hora es global, validar también sin índice (una vez para todas)
        if ((activity.requireDate && activity.requireDatePerMeasurement === false) ||
            (activity.requireTime && activity.requireTimePerMeasurement === false)) {
          const globalErrors = runValidations(activity, value, formValues);
          allErrors.push(...globalErrors);
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
      // Función helper para formatear valores numéricos
      const formatNumericValue = (value: any, activity: Activity): any => {
        if (value === null || value === undefined || value === '') {
          return value;
        }

        // Solo formatear si la actividad tiene decimalPlaces configurado
        if (activity.decimalPlaces === undefined) {
          return value;
        }

        const numericTypes = ['number_simple', 'number_compound', 'calculated'];
        if (!numericTypes.includes(activity.fieldType)) {
          return value;
        }

        const decimalPlaces = activity.decimalPlaces;

        // Si es un array (campos repetibles), formatear cada valor
        if (Array.isArray(value)) {
          return value.map(v => {
            const num = parseFloat(v);
            if (isNaN(num)) return v;
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
        return num.toFixed(decimalPlaces);
      };

      // Construir objeto con los valores del formulario
      const formData: any = {
        visitName,
        activities: activities.map(activity => {
          // Para campos calculados, calcular el valor automáticamente
          let rawValue = formValues[activity.id];
          if (activity.fieldType === 'calculated' && activity.calculationFormula) {
            const calculated = evaluateFormula(activity.calculationFormula, formValues);
            if (calculated !== null && !isNaN(calculated)) {
              rawValue = calculated;
            }
          }
          
          const formattedValue = formatNumericValue(rawValue, activity);
          
          const activityObj: any = {
            id: activity.id,
            name: activity.name,
            fieldType: activity.fieldType,
            helpText: activity.helpText,
            description: activity.description,
          };

          // Incluir campos si existen en la actividad
          if (activity.measurementUnit) {
            activityObj.measurementUnit = activity.measurementUnit;
          }

          // Incluir fecha y hora si están configuradas
          if (activity.requireDate || activity.requireTime) {
            if (activity.allowMultiple) {
              // Para campos repetibles con fecha/hora, usar measurements
              const measurements: any[] = [];
              const repeatCount = activity.repeatCount || 3;
              
              // Determinar si fecha/hora es global o por medición
              const dateIsGlobal = activity.requireDate && activity.requireDatePerMeasurement === false;
              const timeIsGlobal = activity.requireTime && activity.requireTimePerMeasurement === false;
              
              for (let i = 0; i < repeatCount; i++) {
                const measurementValue = Array.isArray(formattedValue) ? formattedValue[i] : undefined;
                const measurementDate = dateIsGlobal 
                  ? formValues[`${activity.id}_date`]
                  : formValues[`${activity.id}_date_${i}`];
                
                // Para tiempo: si hay intervalo configurado y no es la primera medición, calcular automáticamente
                let measurementTime: string | undefined;
                if (timeIsGlobal) {
                  measurementTime = formValues[`${activity.id}_time`];
                } else {
                  const hasTimeInterval = activity.timeIntervalMinutes && activity.timeIntervalMinutes > 0;
                  if (hasTimeInterval && i > 0) {
                    // Calcular hora basada en la primera medición
                    const firstTime = normalizeTime(formValues[`${activity.id}_time_0`] || '');
                    if (firstTime && isValidTime(firstTime)) {
                      measurementTime = addMinutesToTime(firstTime, activity.timeIntervalMinutes * i);
                    }
                  } else {
                    measurementTime = formValues[`${activity.id}_time_${i}`];
                  }
                }
                
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
              activityObj.value = formattedValue;
              const activityDate = formValues[`${activity.id}_date`];
              const activityTime = formValues[`${activity.id}_time`];
              if (activity.requireDate && activityDate) {
                activityObj.date = activityDate;
              }
              if (activity.requireTime && activityTime) {
                activityObj.time = normalizeTime(activityTime);
              }
            }
          } else {
            // Si no hay fecha/hora, incluir value normalmente
            activityObj.value = formattedValue;
          }

          return activityObj;
        }),
        validationErrors: allErrors.filter(e => e.rule.severity === 'warning'),
        timestamp: new Date().toISOString(),
      };
      
      setValidatedFormData(formData);
      setShowSuccessToast(true);
    } else {
      // Si hay errores, limpiar el objeto validado
      setValidatedFormData(null);
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

        case 'number_compound': {
          // El valor debe ser un objeto con las claves de los campos compuestos
          const compoundValue = (typeof fieldValue === 'object' && fieldValue !== null && !Array.isArray(fieldValue))
            ? fieldValue
            : {};
          
          const compoundConfig = activity.compoundConfig;
          const fields = compoundConfig?.fields || [];
          
          const handleCompoundChange = (fieldName: string, value: string) => {
            const newCompoundValue = { ...compoundValue, [fieldName]: value };
            handleChange(activity.id, newCompoundValue, index);
          };
          
          return (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {fields.length > 0 ? (
                fields.map((field) => (
                  <TextField
                    key={field.name}
                    type="number"
                    label={field.label}
                    value={compoundValue[field.name] || ''}
                    onChange={(e) => handleCompoundChange(field.name, e.target.value)}
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
                  No hay campos configurados para este número compuesto. Configure los campos en la edición de la actividad.
                </Alert>
              )}
            </Box>
          );
        }

        case 'select_single': {
          const isMultiple = activity.selectMultiple === true;
          const hasError = isMultiple
            ? showValidation && activity.required && (!fieldValue || fieldValue.length === 0)
            : showValidation && activity.required && !fieldValue;
          
          return (
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
            </FormControl>
          );
        }

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

        case 'datetime':
          // Manejar migración de tipos antiguos (date, time) a datetime
          // Si vienen del backend con tipos antiguos, migrarlos
          const isOldDate = (activity.fieldType as string) === 'date';
          const isOldTime = (activity.fieldType as string) === 'time';
          
          const includeDate = activity.datetimeIncludeDate !== undefined ? activity.datetimeIncludeDate : 
                            (isOldDate || (activity.fieldType === 'datetime' && activity.datetimeIncludeDate !== false));
          const includeTime = activity.datetimeIncludeTime !== undefined ? activity.datetimeIncludeTime : 
                            (isOldTime || (activity.fieldType === 'datetime' && activity.datetimeIncludeTime !== false));
          
          // Obtener valores de fecha y hora si existen
          const dateKey = index !== undefined ? `${activity.id}_date_${index}` : `${activity.id}_date`;
          const timeKey = index !== undefined ? `${activity.id}_time_${index}` : `${activity.id}_time`;
          const dateValue = formValues[dateKey] || '';
          const timeValue = formValues[timeKey] || '';
          
          // Si solo hay uno, usar el valor principal
          const hasDateValue = dateValue !== '';
          const hasTimeValue = timeValue !== '';
          
          return (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {includeDate && (
                <TextField
                  type="date"
                  label="Fecha"
                  value={dateValue}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    handleChange(dateKey, newValue, undefined);
                  }}
                  InputLabelProps={{ shrink: true }}
                  error={showValidation && activity.required && includeDate && !dateValue}
                  helperText={showValidation && activity.required && includeDate && !dateValue ? 'Campo requerido' : ''}
                  sx={{ minWidth: 200 }}
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
            </Box>
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

        case 'calculated':
          // Calcular el valor automáticamente
          const calculatedValue = activity.calculationFormula 
            ? evaluateFormula(activity.calculationFormula, formValues)
            : null;
          
          // Formatear el valor según decimalPlaces
          let displayValue = '';
          if (calculatedValue !== null && !isNaN(calculatedValue)) {
            const decimalPlaces = activity.decimalPlaces ?? 2;
            displayValue = calculatedValue.toFixed(decimalPlaces);
          } else {
            displayValue = '—'; // Mostrar guión si no se puede calcular
          }
          
          return (
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
              {calculatedValue === null && activity.calculationFormula && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  No se pudo calcular el valor. Verifica que los campos necesarios estén completos.
                </Alert>
              )}
            </Box>
          );

        case 'medication_tracking': {
          const config = activity.medicationTrackingConfig;
          if (!config) {
            return (
              <Alert severity="warning">
                No hay configuración de medicación. Edite la actividad para configurarla.
              </Alert>
            );
          }
          
          // Obtener los valores del formulario
          const medValue = typeof fieldValue === 'object' && fieldValue !== null ? fieldValue : {};
          const lastVisitDate = medValue.lastVisitDate || '';
          const unitsDelivered = parseFloat(medValue.unitsDelivered) || 0;
          const unitsReturned = parseFloat(medValue.unitsReturned) || 0;
          
          // Calcular días desde la última visita
          let daysSinceLastVisit = 0;
          if (lastVisitDate) {
            const lastDate = new Date(lastVisitDate);
            const today = new Date();
            const diffTime = Math.abs(today.getTime() - lastDate.getTime());
            daysSinceLastVisit = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }
          
          // Calcular dosis diaria esperada
          const { amount, interval, hoursInterval } = config.frequency;
          let dailyDoses = 1;
          switch (interval) {
            case 'daily': dailyDoses = 1; break;
            case 'twice_daily': dailyDoses = 2; break;
            case 'three_times_daily': dailyDoses = 3; break;
            case 'every_x_hours': dailyDoses = hoursInterval ? Math.floor(24 / hoursInterval) : 1; break;
            case 'weekly': dailyDoses = 1/7; break;
            case 'custom': dailyDoses = config.expectedDailyDose || 1; break;
          }
          const dailyUnitsExpected = amount * dailyDoses;
          
          // Calcular unidades esperadas para el período
          const expectedUnits = daysSinceLastVisit * dailyUnitsExpected;
          
          // Calcular consumo real
          const actualConsumption = unitsDelivered - unitsReturned;
          
          // Calcular adherencia
          const adherencePercentage = expectedUnits > 0 
            ? Math.min(200, (actualConsumption / expectedUnits) * 100) 
            : 0;
          
          // Determinar estado de adherencia
          let adherenceStatus: 'good' | 'low' | 'high' | 'unknown' = 'unknown';
          let adherenceColor = 'text.secondary';
          let adherenceMessage = '';
          
          if (expectedUnits > 0 && unitsDelivered > 0) {
            if (adherencePercentage >= 80 && adherencePercentage <= 120) {
              adherenceStatus = 'good';
              adherenceColor = 'success.main';
              adherenceMessage = 'Adherencia adecuada al tratamiento';
            } else if (adherencePercentage < 80) {
              adherenceStatus = 'low';
              adherenceColor = 'warning.main';
              adherenceMessage = `Adherencia baja: el paciente consumió menos de lo esperado (${(expectedUnits - actualConsumption).toFixed(0)} ${config.dosageUnit} menos)`;
            } else {
              adherenceStatus = 'high';
              adherenceColor = 'error.main';
              adherenceMessage = `Consumo excesivo: el paciente consumió más de lo esperado (${(actualConsumption - expectedUnits).toFixed(0)} ${config.dosageUnit} de más)`;
            }
          }
          
          const handleMedChange = (field: string, value: any) => {
            const newValue = { ...medValue, [field]: value };
            handleChange(activity.id, newValue, index);
          };
          
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Info del medicamento */}
              <Alert severity="info" icon={<MedicationIcon />} sx={{ '& .MuiAlert-message': { width: '100%' } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {config.medicationName || 'Medicamento'}
                    </Typography>
                    <Typography variant="body2">
                      Dosis prescrita: {config.frequency.amount} {config.dosageUnit}{' '}
                      {interval === 'daily' && 'una vez al día'}
                      {interval === 'twice_daily' && 'dos veces al día'}
                      {interval === 'three_times_daily' && 'tres veces al día'}
                      {interval === 'every_x_hours' && `cada ${hoursInterval || '?'} horas`}
                      {interval === 'weekly' && 'una vez por semana'}
                      {interval === 'custom' && (config.frequency.customDescription || 'frecuencia personalizada')}
                    </Typography>
                  </Box>
                  <Chip 
                    label={`${dailyUnitsExpected.toFixed(dailyUnitsExpected % 1 === 0 ? 0 : 1)} ${config.dosageUnit}/día`}
                    color="primary"
                    size="small"
                  />
                </Box>
              </Alert>
              
              {/* Campos de entrada */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                <TextField
                  type="date"
                  label="Fecha de la última visita"
                  value={lastVisitDate}
                  onChange={(e) => handleMedChange('lastVisitDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  error={showValidation && activity.required && !lastVisitDate}
                  helperText={showValidation && activity.required && !lastVisitDate ? 'Campo requerido' : ''}
                />
                
                <TextField
                  type="number"
                  label={`${config.dosageUnit.charAt(0).toUpperCase() + config.dosageUnit.slice(1)} entregados`}
                  value={medValue.unitsDelivered || ''}
                  onChange={(e) => handleMedChange('unitsDelivered', e.target.value)}
                  inputProps={{ min: 0 }}
                  fullWidth
                  error={showValidation && activity.required && !medValue.unitsDelivered}
                  helperText="Cantidad entregada en la última visita"
                />
                
                <TextField
                  type="number"
                  label={`${config.dosageUnit.charAt(0).toUpperCase() + config.dosageUnit.slice(1)} devueltos hoy`}
                  value={medValue.unitsReturned || ''}
                  onChange={(e) => handleMedChange('unitsReturned', e.target.value)}
                  inputProps={{ min: 0 }}
                  fullWidth
                  helperText="Cantidad que devuelve el paciente"
                />
              </Box>
              
              {/* Panel de cálculos */}
              {(lastVisitDate || unitsDelivered > 0) && (
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    bgcolor: adherenceStatus === 'good' ? 'success.50' : 
                             adherenceStatus === 'low' ? 'warning.50' : 
                             adherenceStatus === 'high' ? 'error.50' : 'grey.50',
                    borderColor: adherenceStatus === 'good' ? 'success.main' : 
                                 adherenceStatus === 'low' ? 'warning.main' : 
                                 adherenceStatus === 'high' ? 'error.main' : 'grey.300',
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    📊 Cálculo de Adherencia al Tratamiento
                    {adherenceStatus === 'good' && <CheckCircleIcon color="success" fontSize="small" />}
                    {adherenceStatus === 'low' && <TrendingDownIcon color="warning" fontSize="small" />}
                    {adherenceStatus === 'high' && <TrendingUpIcon color="error" fontSize="small" />}
                  </Typography>
                  
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Días desde última visita:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {lastVisitDate ? `${daysSinceLastVisit} días` : '—'}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary">
                      Dosis esperadas (teoría):
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {lastVisitDate ? `${expectedUnits.toFixed(0)} ${config.dosageUnit}` : '—'}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary">
                      Consumo real (entregados − devueltos):
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {unitsDelivered > 0 ? `${actualConsumption.toFixed(0)} ${config.dosageUnit}` : '—'}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary">
                      Porcentaje de adherencia:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" sx={{ color: adherenceColor }}>
                      {expectedUnits > 0 && unitsDelivered > 0 
                        ? `${adherencePercentage.toFixed(1)}%` 
                        : '—'}
                    </Typography>
                  </Box>
                  
                  {adherenceMessage && (
                    <Alert 
                      severity={adherenceStatus === 'good' ? 'success' : adherenceStatus === 'low' ? 'warning' : 'error'}
                      sx={{ mt: 2 }}
                    >
                      {adherenceMessage}
                    </Alert>
                  )}
                  
                  {/* Diferencia detallada */}
                  {expectedUnits > 0 && unitsDelivered > 0 && actualConsumption !== expectedUnits && (
                    <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        <strong>Análisis:</strong> Se esperaba un consumo de {expectedUnits.toFixed(0)} {config.dosageUnit} 
                        ({dailyUnitsExpected.toFixed(1)}/día × {daysSinceLastVisit} días).
                        El paciente consumió {actualConsumption.toFixed(0)} {config.dosageUnit} 
                        (de {unitsDelivered} entregados, devolvió {unitsReturned}).
                        {actualConsumption < expectedUnits && (
                          <> Faltan {(expectedUnits - actualConsumption).toFixed(0)} {config.dosageUnit} por consumir.</>
                        )}
                        {actualConsumption > expectedUnits && (
                          <> Consumió {(actualConsumption - expectedUnits).toFixed(0)} {config.dosageUnit} de más.</>
                        )}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              )}
            </Box>
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
            {/* Campos de fecha y hora globales (una vez para todas las mediciones) */}
            {(activity.requireDate || activity.requireTime) && 
             ((activity.requireDate && activity.requireDatePerMeasurement === false) || 
              (activity.requireTime && activity.requireTimePerMeasurement === false)) && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Fecha/Hora para todas las mediciones:
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {activity.requireDate && activity.requireDatePerMeasurement === false && (() => {
                    const dateError = shouldShowDateTimeError(activity).date;
                    return (
                      <TextField
                        type="date"
                        label="Fecha de realización (común a todas las mediciones)"
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
                  {activity.requireTime && activity.requireTimePerMeasurement === false && (() => {
                    const timeError = shouldShowDateTimeError(activity).time;
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
            )}
            
            {Array.from({ length: activity.repeatCount || 3 }).map((_, index) => (
              <Box key={index}>
                <Typography variant="subtitle2" gutterBottom>
                  Medición {index + 1}:
                </Typography>
                {renderSingleField(index)}
                
                {/* Campos de fecha y hora por medición (solo si está configurado así) */}
                {((activity.requireDate && activity.requireDatePerMeasurement !== false) || 
                  (activity.requireTime && activity.requireTimePerMeasurement !== false)) && (
                  <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {activity.requireDate && activity.requireDatePerMeasurement !== false && (() => {
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
                    {activity.requireTime && activity.requireTimePerMeasurement !== false && (() => {
                      const timeError = shouldShowDateTimeError(activity, index).time;
                      const hasTimeInterval = activity.timeIntervalMinutes && activity.timeIntervalMinutes > 0;
                      const isFirstMeasurement = index === 0;
                      const shouldShowInput = !hasTimeInterval || isFirstMeasurement;
                      
                      // Si hay intervalo y no es la primera, mostrar solo lectura con la hora calculada
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
                      
                      // Campo editable para la primera medición (o todas si no hay intervalo)
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

