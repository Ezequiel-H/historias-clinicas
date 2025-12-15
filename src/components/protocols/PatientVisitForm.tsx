import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Checkbox,
  Alert,
  Chip,
  FormGroup,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Send as SendIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import type { Visit, Activity, ActivityRule } from '../../types';

interface PatientVisitFormProps {
  visit: Visit;
  protocolName: string;
  patientId: string;
  onComplete: (data: any) => void;
  onCancel: () => void;
}

interface ValidationError {
  activityId: string;
  activityName: string;
  rule: ActivityRule;
  currentValue?: any;
}

type ValidationFunction = (
  activity: Activity,
  value: any,
  formValues: Record<string, any>,
  index?: number
) => { isValid: boolean; error?: ValidationError };

export const PatientVisitForm: React.FC<PatientVisitFormProps> = ({
  visit,
  protocolName,
  patientId,
  onComplete,
  onCancel,
}) => {
  const activities = visit.activities || [];
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showValidation, setShowValidation] = useState(false);

  // Función helper para normalizar tiempo a formato HH:MM
  const normalizeTime = (timeValue: string): string => {
    if (!timeValue) return '';
    if (timeValue.length >= 5) {
      return timeValue.substring(0, 5);
    }
    return timeValue;
  };

  // Función para formatear tiempo mientras se escribe (HH:MM)
  const formatTimeInput = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 0) return '';
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.substring(0, 2)}:${numbers.substring(2)}`;
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
      const measurementValue = Array.isArray(value) ? value[index] : undefined;
      hasValue = measurementValue !== undefined && measurementValue !== null && measurementValue !== '';
    } else {
      if (activity.allowMultiple) {
        hasValue = Array.isArray(value) && value.some(v => v !== '' && v !== null && v !== undefined);
      } else {
        hasValue = value !== undefined && value !== null && value !== '' && 
                   !(Array.isArray(value) && value.every(v => v === '' || v === null || v !== undefined));
      }
    }
    
    if (!hasValue) return { date: false, time: false };
    
    let dateKey: string;
    let timeKey: string;
    
    if (activity.allowMultiple) {
      if (index !== undefined) {
        if (activity.requireDatePerMeasurement !== false) {
          dateKey = `${activity.id}_date_${index}`;
        } else {
          dateKey = `${activity.id}_date`;
        }
        if (activity.requireTimePerMeasurement !== false) {
          timeKey = `${activity.id}_time_${index}`;
        } else {
          timeKey = `${activity.id}_time`;
        }
      } else {
        dateKey = `${activity.id}_date`;
        timeKey = `${activity.id}_time`;
      }
    } else {
      dateKey = `${activity.id}_date`;
      timeKey = `${activity.id}_time`;
    }
    
    return {
      date: activity.requireDate ? (!formValues[dateKey] || formValues[dateKey] === '') : false,
      time: activity.requireTime ? (!formValues[timeKey] || formValues[timeKey] === '') : false,
    };
  };

  // Actualizar valores calculados automáticamente cuando cambien los valores del formulario
  const prevFormValuesRef = useRef<Record<string, any>>({});
  
  useEffect(() => {
    const calculatedActivityIds = activities
      .filter(a => a.fieldType === 'calculated')
      .map(a => a.id);
    
    const relevantValuesChanged = Object.keys(formValues).some(key => {
      if (calculatedActivityIds.includes(key)) return false;
      return formValues[key] !== prevFormValuesRef.current[key];
    });

    if (!relevantValuesChanged && Object.keys(prevFormValuesRef.current).length > 0) {
      return;
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
      const currentValues = formValues[activityId] || [];
      const newValues = [...currentValues];
      newValues[index] = value;
      newFormValues = { ...formValues, [activityId]: newValues };
    } else {
      newFormValues = { ...formValues, [activityId]: value };
    }
    
    if (activityId.includes('_time_0')) {
      const baseActivityId = activityId.replace('_time_0', '');
      const activity = activities.find(a => a.id === baseActivityId);
      if (activity && activity.allowMultiple && activity.requireTime && 
          activity.requireTimePerMeasurement !== false && activity.timeIntervalMinutes &&
          activity.repeatCount) {
        const firstTime = normalizeTime(value);
        if (firstTime && isValidTime(firstTime)) {
          for (let i = 1; i < activity.repeatCount; i++) {
            const calculatedTime = addMinutesToTime(firstTime, activity.timeIntervalMinutes * i);
            newFormValues[`${baseActivityId}_time_${i}`] = calculatedTime;
          }
        }
      }
    }
    
    setFormValues(newFormValues);
    
    if (showValidation) {
      revalidateForm(newFormValues);
    }
  };

  // Construir el array de funciones de validación para una actividad
  const buildValidationRules = (activity: Activity): ValidationFunction[] => {
    const rules: ValidationFunction[] = [];

    if (activity.required) {
      rules.push(validateRequired);
    }
    if (activity.requireDate) {
      rules.push(validateRequiredDate);
    }
    if (activity.requireTime) {
      rules.push(validateRequiredTime);
    }
    if (activity.options && activity.options.some(opt => opt.required)) {
      rules.push(validateRequiredOptions);
    }
    if (activity.options && activity.options.some(opt => opt.exclusive)) {
      rules.push(validateExclusiveOptions);
    }
    if (activity.validationRules && activity.validationRules.length > 0) {
      rules.push(validateCustomRules);
    }

    return rules;
  };

  const validateRequired: ValidationFunction = (activity, value, formValues, index) => {
    if (activity.fieldType === 'datetime') {
      const includeDate = activity.datetimeIncludeDate !== undefined ? activity.datetimeIncludeDate : true;
      const includeTime = activity.datetimeIncludeTime !== undefined ? activity.datetimeIncludeTime : false;
      
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
    
    if (activity.allowMultiple && index !== undefined) {
      const measurementValue = Array.isArray(value) ? value[index] : undefined;
      const hasMeasurementValue = measurementValue !== undefined && measurementValue !== null && measurementValue !== '';
      
      if (hasMeasurementValue) {
        return { isValid: true };
      }
      
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

  const validateRequiredDate: ValidationFunction = (activity, value, formValues, index) => {
    let hasValue = false;
    let dateKey: string;
    
    if (activity.allowMultiple) {
      if (index !== undefined) {
        const measurementValue = Array.isArray(value) ? value[index] : undefined;
        hasValue = measurementValue !== undefined && measurementValue !== null && measurementValue !== '';
        if (!hasValue) {
          return { isValid: true };
        }
        if (activity.requireDatePerMeasurement !== false) {
          dateKey = `${activity.id}_date_${index}`;
        } else {
          dateKey = `${activity.id}_date`;
        }
      } else {
        hasValue = Array.isArray(value) && value.some(v => v !== '' && v !== null && v !== undefined);
        if (!hasValue) {
          return { isValid: true };
        }
        dateKey = `${activity.id}_date`;
      }
    } else {
      hasValue = value !== undefined && value !== null && value !== '' && 
                 !(Array.isArray(value) && value.every(v => v === '' || v === null || v !== undefined));
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

  const validateRequiredTime: ValidationFunction = (activity, value, formValues, index) => {
    let hasValue = false;
    let timeKey: string;
    
    if (activity.allowMultiple) {
      if (index !== undefined) {
        const measurementValue = Array.isArray(value) ? value[index] : undefined;
        hasValue = measurementValue !== undefined && measurementValue !== null && measurementValue !== '';
        if (!hasValue) {
          return { isValid: true };
        }
        if (activity.requireTimePerMeasurement !== false) {
          timeKey = `${activity.id}_time_${index}`;
        } else {
          timeKey = `${activity.id}_time`;
        }
      } else {
        hasValue = Array.isArray(value) && value.some(v => v !== '' && v !== null && v !== undefined);
        if (!hasValue) {
          return { isValid: true };
        }
        timeKey = `${activity.id}_time`;
      }
    } else {
      hasValue = value !== undefined && value !== null && value !== '' && 
                 !(Array.isArray(value) && value.every(v => v === '' || v === null || v !== undefined));
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

  const validateCustomRules: ValidationFunction = (activity, value, formValues, index) => {
    if (!activity.validationRules || activity.validationRules.length === 0) {
      return { isValid: true };
    }

    let numericValue: number | null = null;
    
    if (activity.allowMultiple && index !== undefined && Array.isArray(value)) {
      const measurementValue = value[index];
      if (measurementValue !== '' && measurementValue !== null && !isNaN(Number(measurementValue))) {
        numericValue = Number(measurementValue);
      }
    } else if (activity.allowMultiple && Array.isArray(value)) {
      const numericValues = value.filter(v => v !== '' && v !== null && !isNaN(Number(v))).map(Number);
      if (numericValues.length > 0) {
        numericValue = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      }
    } else if (value !== '' && value !== null && !isNaN(Number(value))) {
      numericValue = Number(value);
    }
    
    if (numericValue === null) {
      return { isValid: true };
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
    const allErrors: ValidationError[] = [];
    
    for (const activity of activities) {
      const value = values[activity.id];
      
      if (activity.allowMultiple && activity.repeatCount) {
        for (let i = 0; i < activity.repeatCount; i++) {
          const errors = runValidations(activity, value, values, i);
          allErrors.push(...errors);
        }
        
        if ((activity.requireDate && activity.requireDatePerMeasurement === false) ||
            (activity.requireTime && activity.requireTimePerMeasurement === false)) {
          const globalErrors = runValidations(activity, value, values);
          allErrors.push(...globalErrors);
        }
      } else {
        const errors = runValidations(activity, value, values);
        allErrors.push(...errors);
      }
    }
    
    setValidationErrors(allErrors);
  };

  const evaluateFormula = (formula: string, activityValues: Record<string, any>): number | null => {
    try {
      const context: Record<string, number> = {};
      
      for (const [activityId, value] of Object.entries(activityValues)) {
        const activity = activities.find(a => a.id === activityId);
        if (activity) {
          const originalName = activity.name.toLowerCase().trim();
          const normalizedName = originalName.replace(/\s+/g, '');
          
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
            context[originalName] = numValue;
            if (normalizedName !== originalName) {
              context[normalizedName] = numValue;
            }
          }
        }
      }

      let processedFormula = formula.toLowerCase().trim();
      const sortedVars = Object.keys(context).sort((a, b) => b.length - a.length);
      
      for (const varName of sortedVars) {
        const escapedVar = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedVar}\\b`, 'gi');
        processedFormula = processedFormula.replace(regex, String(context[varName]));
      }

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
    
    const allErrors: ValidationError[] = [];
    
    for (const activity of activities) {
      const value = formValues[activity.id];
      
      if (activity.allowMultiple && activity.repeatCount) {
        for (let i = 0; i < activity.repeatCount; i++) {
          const errors = runValidations(activity, value, formValues, i);
          allErrors.push(...errors);
        }
        
        if ((activity.requireDate && activity.requireDatePerMeasurement === false) ||
            (activity.requireTime && activity.requireTimePerMeasurement === false)) {
          const globalErrors = runValidations(activity, value, formValues);
          allErrors.push(...globalErrors);
        }
      } else {
        const errors = runValidations(activity, value, formValues);
        allErrors.push(...errors);
      }
    }

    setValidationErrors(allErrors);

    const blockingErrors = allErrors.filter(e => e.rule.severity === 'error');
    if (blockingErrors.length === 0) {
      const formatNumericValue = (value: any, activity: Activity): any => {
        if (value === null || value === undefined || value === '') {
          return value;
        }

        if (activity.decimalPlaces === undefined) {
          return value;
        }

        const numericTypes = ['number_simple', 'number_compound', 'calculated'];
        if (!numericTypes.includes(activity.fieldType)) {
          return value;
        }

        const decimalPlaces = activity.decimalPlaces;

        if (Array.isArray(value)) {
          return value.map(v => {
            const num = parseFloat(v);
            if (isNaN(num)) return v;
            return num.toFixed(decimalPlaces);
          });
        }

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

        const num = parseFloat(value);
        if (isNaN(num)) return value;
        return num.toFixed(decimalPlaces);
      };

      const formData: any = {
        patientId,
        protocolName,
        visitName: visit.name,
        visitType: visit.type,
        activities: activities.map(activity => {
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

          if (activity.measurementUnit) {
            activityObj.measurementUnit = activity.measurementUnit;
          }

          if (activity.requireDate || activity.requireTime) {
            if (activity.allowMultiple) {
              const measurements: any[] = [];
              const repeatCount = activity.repeatCount || 3;
              
              const dateIsGlobal = activity.requireDate && activity.requireDatePerMeasurement === false;
              const timeIsGlobal = activity.requireTime && activity.requireTimePerMeasurement === false;
              
              for (let i = 0; i < repeatCount; i++) {
                const measurementValue = Array.isArray(formattedValue) ? formattedValue[i] : undefined;
                const measurementDate = dateIsGlobal 
                  ? formValues[`${activity.id}_date`]
                  : formValues[`${activity.id}_date_${i}`];
                
                let measurementTime: string | undefined;
                if (timeIsGlobal) {
                  measurementTime = formValues[`${activity.id}_time`];
                } else {
                  const hasTimeInterval = activity.timeIntervalMinutes && activity.timeIntervalMinutes > 0;
                  if (hasTimeInterval && i > 0) {
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
            activityObj.value = formattedValue;
          }

          return activityObj;
        }),
        validationErrors: allErrors.filter(e => e.rule.severity === 'warning'),
        timestamp: new Date().toISOString(),
      };
      
      onComplete(formData);
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
          return (
            <Box>
              <TextField
                type="number"
                value={fieldValue || ''}
                onChange={(e) => handleChange(activity.id, e.target.value, index)}
                placeholder="0"
                error={showValidation && activity.required && !fieldValue}
                helperText={showValidation && activity.required && !fieldValue ? 'Campo requerido' : ''}
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
                  No hay campos configurados para este número compuesto.
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
          
          return (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {includeDate && (
                <TextField
                  type="date"
                  label="Fecha"
                  value={dateValue}
                  onChange={(e) => {
                    handleChange(dateKey, e.target.value, undefined);
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
          const calculatedValue = activity.calculationFormula 
            ? evaluateFormula(activity.calculationFormula, formValues)
            : null;
          
          let displayValue = '';
          if (calculatedValue !== null && !isNaN(calculatedValue)) {
            const decimalPlaces = activity.decimalPlaces ?? 2;
            displayValue = calculatedValue.toFixed(decimalPlaces);
          } else {
            displayValue = '—';
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
                )}
              </Box>
            ))}
          </Box>
        ) : (
          <>
            {renderSingleField()}
            
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
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {visit.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Protocolo: {protocolName}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          ID Paciente: {patientId}
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          Complete todos los campos requeridos. Los datos no se guardarán en la base de datos, solo se generará un archivo JSON para descargar.
        </Alert>
      </Paper>

      {activities.length === 0 ? (
        <Alert severity="info">
          No hay campos configurados en esta visita.
        </Alert>
      ) : (
        <Box>
          {sortedActivities.map(activity => renderField(activity))}
        </Box>
      )}

      <Box display="flex" justifyContent="space-between" gap={2} sx={{ mt: 4 }}>
        <Button onClick={onCancel} variant="outlined" startIcon={<BackIcon />}>
          Volver
        </Button>
        <Box display="flex" gap={1} alignItems="center">
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
          <Button
            onClick={handleSubmit}
            variant="contained"
            startIcon={<SendIcon />}
            disabled={hasBlockingErrors}
          >
            {hasBlockingErrors ? 'Corregir Errores' : 'Completar Visita'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};


