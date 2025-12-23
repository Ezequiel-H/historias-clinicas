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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Send as SendIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Add as AddIcon,
  Medication as MedicationIcon,
} from '@mui/icons-material';
import type { Visit, Activity, ActivityRule, MedicationTrackingConfig } from '../../types';

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
  const [activityDescriptions, setActivityDescriptions] = useState<Record<string, string>>({});
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [descriptionText, setDescriptionText] = useState('');

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

  const handleOpenDescriptionDialog = (activityId: string) => {
    const activity = activities.find(a => a.id === activityId);
    const currentDescription = activityDescriptions[activityId] || activity?.description || '';
    setEditingActivityId(activityId);
    setDescriptionText(currentDescription);
    setDescriptionDialogOpen(true);
  };

  const handleCloseDescriptionDialog = () => {
    setDescriptionDialogOpen(false);
    setEditingActivityId(null);
    setDescriptionText('');
  };

  const handleSaveDescription = () => {
    if (editingActivityId) {
      setActivityDescriptions(prev => ({
        ...prev,
        [editingActivityId]: descriptionText,
      }));
    }
    handleCloseDescriptionDialog();
  };

  // Función helper para parsear fecha local (formato YYYY-MM-DD)
  const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Función helper para calcular adherencia a medicación
  const calculateMedicationAdherence = (
    lastVisitDate: string,
    unitsDelivered: string,
    unitsReturned: string,
    tookMedicationToday: boolean,
    config: MedicationTrackingConfig
  ) => {
    if (!lastVisitDate || !unitsDelivered || unitsReturned === '' || !config.expectedDailyDose) {
      return null;
    }

    const visitDate = new Date(); // Fecha actual (día de la visita)
    const lastVisit = parseLocalDate(lastVisitDate);

    const totalDaysDifference = Math.floor((visitDate.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = totalDaysDifference > 0 ? totalDaysDifference - 1 : 0; 

    // Calculate expected consumption days
    let expectedConsumptionDays = daysElapsed;
    if (config.shouldConsumeOnDeliveryDay) expectedConsumptionDays += 1;
    if (config.shouldTakeOnVisitDay) expectedConsumptionDays += 1;

    // Total expected dose
    const expectedTotalDose = expectedConsumptionDays * config.expectedDailyDose;

    // Actual consumption
    const delivered = parseFloat(unitsDelivered) || 0;
    const returned = parseFloat(unitsReturned) || 0;
    const realConsumption = delivered - returned;

    // Adjusted consumption
    let adjustedConsumption = realConsumption;
    
    // Si el paciente tomó la medicación cuando NO debía, restar esa dosis del consumo
    if (!config.shouldTakeOnVisitDay && tookMedicationToday) {
      adjustedConsumption -= config.expectedDailyDose;
    }

    // Adherence percentage - SIEMPRE usar adjustedConsumption
    if (expectedTotalDose <= 0) return null;
    const adherencePercentage = (adjustedConsumption / expectedTotalDose) * 100;

    return {
      daysElapsed,
      expectedConsumptionDays,
      expectedTotalDose,
      realConsumption,
      adjustedConsumption,
      adherencePercentage,
      delivered,
      returned,
    };
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
          
          const editedDescription = activityDescriptions[activity.id] || activity.description;
          const activityObj: any = {
            id: activity.id,
            name: activity.name,
            fieldType: activity.fieldType,
            helpText: activity.helpText,
            description: editedDescription || activity.description,
          };

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
          } else if (activity.fieldType === 'medication_tracking') {
            // Procesar medication_tracking: agregar adherencia calculada
            const medValue = typeof formattedValue === 'object' && formattedValue !== null ? formattedValue : {};
            const lastVisitDate = medValue.lastVisitDate || '';
            const unitsDelivered = medValue.unitsDelivered || '';
            const unitsReturned = medValue.unitsReturned || '';
            const tookMedicationToday = medValue.tookMedicationToday || false;
            
            activityObj.value = formattedValue;
            
            if (activity.medicationTrackingConfig) {
              const adherence = calculateMedicationAdherence(
                lastVisitDate,
                unitsDelivered,
                unitsReturned,
                tookMedicationToday,
                activity.medicationTrackingConfig
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

      // Función helper para envolver el campo con el botón de aclaración
      const wrapWithDescriptionButton = (fieldElement: React.ReactNode) => {
        // Solo mostrar el botón en el primer campo (no en campos repetibles individuales)
        if (index !== undefined) {
          return fieldElement;
        }
        
        const hasDescription = activityDescriptions[activity.id] || activity.description;
        
        return (
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              {fieldElement}
            </Box>
            <Tooltip title={hasDescription ? "Editar aclaración para IA" : "Agregar aclaración para IA"}>
              <IconButton
                size="small"
                onClick={() => handleOpenDescriptionDialog(activity.id)}
                color={hasDescription ? "primary" : "default"}
                sx={{ 
                  mt: 1,
                  border: hasDescription ? '1px solid' : '1px dashed',
                  borderColor: hasDescription ? 'primary.main' : 'grey.400',
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      };

      switch (activity.fieldType) {
        case 'text_short':
          return wrapWithDescriptionButton(
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
          return wrapWithDescriptionButton(
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
          return wrapWithDescriptionButton(
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
          
          return wrapWithDescriptionButton(
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
          
          return wrapWithDescriptionButton(
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
          return wrapWithDescriptionButton(
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
          
          return wrapWithDescriptionButton(
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
          return wrapWithDescriptionButton(
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
          
          return wrapWithDescriptionButton(
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

        case 'medication_tracking': {
          const config = activity.medicationTrackingConfig;
          if (!config) {
            return wrapWithDescriptionButton(
              <Alert severity="warning">
                No hay configuración de medicación. Edite la actividad para configurarla.
              </Alert>
            );
          }

          // Obtener los valores del formulario
          const medValue = typeof fieldValue === 'object' && fieldValue !== null ? fieldValue : {};
          const lastVisitDate = medValue.lastVisitDate || '';
          const unitsDelivered = medValue.unitsDelivered !== undefined && medValue.unitsDelivered !== '' 
            ? parseFloat(medValue.unitsDelivered) 
            : null;
          
          const handleMedChange = (field: string, value: any) => {
            const newValue = { ...medValue, [field]: value };
            handleChange(activity.id, newValue, index);
          };
          
          // Obtener información de frecuencia
          const getFrequencyDescription = () => {
            const quantity = config.quantityPerDose || 1;
            const unit = config.dosageUnit || 'comprimidos';
            
            switch (config.frequencyType) {
              case 'once_daily':
                return `${quantity} ${unit} una vez al día`;
              case 'twice_daily':
                return `${quantity} ${unit} dos veces al día`;
              case 'three_daily':
                return `${quantity} ${unit} tres veces al día`;
              case 'every_x_hours':
                return `${quantity} ${unit} cada ${config.customHoursInterval || '?'} horas`;
              case 'once_weekly':
                return `${quantity} ${unit} una vez por semana`;
              default:
                return `${quantity} ${unit}`;
            }
          };
          
          return wrapWithDescriptionButton(
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Info del medicamento */}
              <Alert severity="info" icon={<MedicationIcon />} sx={{ '& .MuiAlert-message': { width: '100%' } }}>
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {config.medicationName || 'Medicamento'}
                  </Typography>
                  <Typography variant="body2">
                    Dosis prescrita: {getFrequencyDescription()}
                  </Typography>
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
                  helperText={showValidation && activity.required && !lastVisitDate ? 'Campo requerido' : 'Haz clic en el campo para seleccionar la fecha'}
                  onClick={(e) => {
                    const input = e.currentTarget.querySelector('input[type="date"]') as HTMLInputElement;
                    if (input) {
                      input.showPicker?.();
                    }
                  }}
                  sx={{
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
                  }}
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
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      handleMedChange('unitsReturned', '');
                      return;
                    }
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue) && numValue >= 0) {
                      if (unitsDelivered !== null && numValue > unitsDelivered) {
                        handleMedChange('unitsReturned', unitsDelivered.toString());
                      } else {
                        handleMedChange('unitsReturned', value);
                      }
                    }
                  }}
                  inputProps={{ 
                    min: 0,
                    max: unitsDelivered !== null ? unitsDelivered : undefined
                  }}
                  fullWidth
                  helperText={
                    unitsDelivered !== null
                      ? `Cantidad que devuelve el paciente (máximo: ${unitsDelivered} ${config.dosageUnit})`
                      : 'Cantidad que devuelve el paciente'
                  }
                />
              </Box>

              {/* Estadísticas de adherencia */}
              {(() => {
                const unitsReturned = medValue.unitsReturned !== undefined && medValue.unitsReturned !== '' 
                  ? medValue.unitsReturned 
                  : '';
                const tookMedicationToday = medValue.tookMedicationToday || false;
                
                const adherence = calculateMedicationAdherence(
                  lastVisitDate,
                  medValue.unitsDelivered || '',
                  unitsReturned,
                  tookMedicationToday,
                  config
                );
                
                if (!adherence) {
                  return null;
                }
                
                return (
                  <>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50', mt: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        Estadísticas de Adherencia al Tratamiento
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 1 }}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Días naturales entre fechas:
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {adherence.daysElapsed} días
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            (sin contar día de entrega ni día de visita)
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Días de consumo esperado:
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {adherence.expectedConsumptionDays} días
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            (incluye días naturales + día entrega + día visita según protocolo)
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Dosis esperada total:
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {adherence.expectedTotalDose.toFixed(2)} {config.dosageUnit}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            (días de consumo × dosis diaria)
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Consumo real:
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {adherence.realConsumption.toFixed(2)} {config.dosageUnit}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({adherence.delivered} entregados - {adherence.returned} devueltos)
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Consumo ajustado:
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {adherence.adjustedConsumption.toFixed(2)} {config.dosageUnit}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {adherence.realConsumption !== adherence.adjustedConsumption
                              ? `(ajustado: se restó la dosis del día por tomar cuando no debía)`
                              : `(igual al consumo real: no hubo ajustes necesarios)`
                            }
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Adherencia:
                          </Typography>
                          <Typography 
                            variant="body1" 
                            fontWeight="bold"
                            sx={{
                              color: adherence.adherencePercentage >= 80 
                                ? 'success.main' 
                                : adherence.adherencePercentage >= 50 
                                ? 'warning.main' 
                                : 'error.main'
                            }}
                          >
                            {adherence.adherencePercentage.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                    
                    {/* Checkbox: ¿Tomó la medicación hoy? */}
                    <Box sx={{ mt: 2 }}>
                      <FormControl 
                        error={config.shouldTakeOnVisitDay === true && !tookMedicationToday}
                        sx={{ display: 'block' }}
                      >
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={tookMedicationToday}
                              onChange={(e) => handleMedChange('tookMedicationToday', e.target.checked)}
                            />
                          }
                          label="¿El paciente tomó la medicación el día de hoy?"
                        />
                      </FormControl>
                    </Box>
                  </>
                );
              })()}
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

      {/* Diálogo para editar aclaración/descripción */}
      <Dialog
        open={descriptionDialogOpen}
        onClose={handleCloseDescriptionDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Aclaración para IA
          {editingActivityId && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {activities.find(a => a.id === editingActivityId)?.name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Aclaración"
            fullWidth
            multiline
            rows={4}
            value={descriptionText}
            onChange={(e) => setDescriptionText(e.target.value)}
            placeholder="Ingrese una aclaración o descripción adicional para ayudar a la IA a entender mejor este campo..."
            helperText="Esta aclaración se guardará en el campo description y ayudará a la IA a procesar mejor los datos."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDescriptionDialog}>
            Cancelar
          </Button>
          <Button onClick={handleSaveDescription} variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};


