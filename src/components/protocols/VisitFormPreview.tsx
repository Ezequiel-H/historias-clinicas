import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  Chip,
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
import {
  parseLocalDate,
  normalizeTime,
  isValidTime,
  addMinutesToTime,
  ActivityFieldRenderer,
  calculateMedicationAdherence,
  detectAdherenceProblems,
} from './shared';

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
  
  // Estado para manejar errores de adherencia y decisiones del médico
  const [medicationErrors, setMedicationErrors] = useState<Record<string, Record<string, {
    includeInHistory: boolean;
    comment: string;
  }>>>({});

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
      setMedicationErrors({});
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

          // Manejar campos datetime
          if (activity.fieldType === 'datetime') {
            const includeDate = activity.datetimeIncludeDate !== undefined ? activity.datetimeIncludeDate : true;
            const includeTime = activity.datetimeIncludeTime !== undefined ? activity.datetimeIncludeTime : false;
            
            if (activity.allowMultiple) {
              const measurements: any[] = [];
              const repeatCount = activity.repeatCount || 3;
              
              for (let i = 0; i < repeatCount; i++) {
                const measurementValue = Array.isArray(formattedValue) ? formattedValue[i] : undefined;
                const measurementDate = formValues[`${activity.id}_date_${i}`];
                const measurementTime = formValues[`${activity.id}_time_${i}`];
                
                if (measurementValue !== undefined || (includeDate && measurementDate) || (includeTime && measurementTime)) {
                  const measurement: any = {};
                  if (measurementValue !== undefined) {
                    measurement.value = measurementValue;
                  }
                  if (includeDate && measurementDate) {
                    measurement.date = measurementDate;
                  }
                  if (includeTime && measurementTime) {
                    measurement.time = normalizeTime(measurementTime);
                  }
                  measurements.push(measurement);
                }
              }
              if (measurements.length > 0) {
                activityObj.measurements = measurements;
              }
            } else {
              activityObj.value = formattedValue;
              const activityDate = formValues[`${activity.id}_date`];
              const activityTime = formValues[`${activity.id}_time`];
              if (includeDate && activityDate) {
                activityObj.date = activityDate;
              }
              if (includeTime && activityTime) {
                activityObj.time = normalizeTime(activityTime);
              }
            }
          } else if (activity.requireDate || activity.requireTime) {
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
                      measurementTime = addMinutesToTime(firstTime, (activity.timeIntervalMinutes ?? 0) * i);
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

          // Procesar medication_tracking: agregar adherencia y errores si el médico decidió incluirlos
          if (activity.fieldType === 'medication_tracking') {
            const medValue = typeof formattedValue === 'object' && formattedValue !== null ? formattedValue : {};
            const lastVisitDate = medValue.lastVisitDate || '';
            const unitsDelivered = medValue.unitsDelivered || '';
            const unitsReturned = medValue.unitsReturned || '';
            const tookMedicationToday = medValue.tookMedicationToday || false;
            
            if (activity.medicationTrackingConfig) {
              const visitDate = getVisitDate();
              const adherence = calculateMedicationAdherence(
                lastVisitDate,
                unitsDelivered,
                unitsReturned,
                tookMedicationToday,
                activity.medicationTrackingConfig,
                visitDate
              );
              
              if (adherence) {
                activityObj.medicationTracking = {
                  lastVisitDate,
                  unitsDelivered: parseFloat(unitsDelivered) || 0,
                  unitsReturned: parseFloat(unitsReturned) || 0,
                  tookMedicationToday,
                  adherence: {
                    daysElapsed: adherence.daysElapsed,
                    expectedConsumptionDays: adherence.expectedConsumptionDays,
                    expectedTotalDose: adherence.expectedTotalDose,
                    realConsumption: adherence.realConsumption,
                    adjustedConsumption: adherence.adjustedConsumption,
                    adherencePercentage: adherence.adherencePercentage !== null
                      ? parseFloat(adherence.adherencePercentage.toFixed(2))
                      : null,
                  },
                };
                
                // Agregar errores que el médico decidió incluir en la historia clínica
                const detectedProblems = detectAdherenceProblems(
                  activity.medicationTrackingConfig,
                  tookMedicationToday,
                  adherence
                );
                
                const activityMedErrors = medicationErrors[activity.id] || {};
                const errorsToInclude: Array<{
                  type: string;
                  message: string;
                  severity: 'error' | 'warning';
                  comment?: string;
                }> = [];
                
                for (const problem of detectedProblems) {
                  const errorState = activityMedErrors[problem.id];
                  if (errorState?.includeInHistory) {
                    errorsToInclude.push({
                      type: problem.id,
                      message: problem.message,
                      severity: problem.severity,
                      comment: errorState.comment || undefined,
                    });
                  }
                }

                if (errorsToInclude.length > 0) {
                  activityObj.medicationTracking.deviations = errorsToInclude;
                }
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
    } else {
      // Si hay errores, limpiar el objeto validado
      setValidatedFormData(null);
    }
  };

  // Función helper para obtener la fecha de la visita desde el campo isVisitDate
  const getVisitDate = (): Date => {
    const visitDateActivity = activities.find(act =>
      act.fieldType === 'datetime' &&
      act.isVisitDate === true &&
      act.datetimeIncludeDate === true
    );
    
    if (visitDateActivity) {
      const dateKey = `${visitDateActivity.id}_date`;
      const visitDateValue = formValues[dateKey];
      if (visitDateValue) {
        return parseLocalDate(visitDateValue);
      }
    }
    
    // Fallback: usar fecha actual
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
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

            {sortedActivities.map(activity => (
              <ActivityFieldRenderer
                key={activity.id}
                activity={activity}
                formValues={formValues}
                validationErrors={validationErrors}
                showValidation={showValidation}
                handleChange={handleChange}
                evaluateFormula={evaluateFormula}
                shouldShowDateTimeError={shouldShowDateTimeError}
                medicationErrors={medicationErrors}
                setMedicationErrors={setMedicationErrors}
                getVisitDate={getVisitDate}
              />
            ))}
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


