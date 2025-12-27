import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Alert,
  Chip,
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
} from '@mui/icons-material';
import type { Visit, Activity, ActivityRule } from '../../types';
import {
  normalizeTime,
  isValidTime,
  addMinutesToTime,
  ActivityFieldRenderer,
  calculateMedicationAdherence,
  detectAdherenceProblems,
} from './shared';

interface PatientVisitFormProps {
  visit: Visit;
  protocolName: string;
  patientId: string;
  onComplete: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
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
  initialData,
}) => {
  const activities = visit.activities || [];
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [activityDescriptions, setActivityDescriptions] = useState<Record<string, string>>({});
  
  // Initialize form values from imported data if available
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initialData?.activities || initializedRef.current) return;
    
    const values: Record<string, any> = {};
    const descriptions: Record<string, string> = {};
    
    initialData.activities.forEach((importedActivity: any) => {
      const activityId = importedActivity.id;
      const activity = activities.find(a => a.id === activityId);
      
      if (!activity) return;
      
      // Set the main value
      if (importedActivity.value !== undefined && importedActivity.value !== null) {
        values[activityId] = importedActivity.value;
      }
      
      // Set date and time if they exist
      if (importedActivity.date !== undefined && importedActivity.date !== null) {
        if (activity.allowMultiple) {
          // For multiple measurements, we need to handle arrays
          const dateKey = activity.requireDatePerMeasurement !== false 
            ? `${activityId}_date` 
            : `${activityId}_date`;
          values[dateKey] = importedActivity.date;
        } else {
          values[`${activityId}_date`] = importedActivity.date;
        }
      }
      
      if (importedActivity.time !== undefined && importedActivity.time !== null) {
        if (activity.allowMultiple) {
          const timeKey = activity.requireTimePerMeasurement !== false 
            ? `${activityId}_time` 
            : `${activityId}_time`;
          values[timeKey] = importedActivity.time;
        } else {
          values[`${activityId}_time`] = importedActivity.time;
        }
      }
      
      // Set description if it exists
      if (importedActivity.description) {
        descriptions[activityId] = importedActivity.description;
      }
      
      // Handle multiple measurements
      if (activity.allowMultiple && Array.isArray(importedActivity.measurements)) {
        values[activityId] = importedActivity.measurements.map((m: any) => m.value);
        importedActivity.measurements.forEach((measurement: any, index: number) => {
          if (measurement.date) {
            const dateKey = activity.requireDatePerMeasurement !== false
              ? `${activityId}_date_${index}`
              : `${activityId}_date`;
            values[dateKey] = measurement.date;
          }
          if (measurement.time) {
            const timeKey = activity.requireTimePerMeasurement !== false
              ? `${activityId}_time_${index}`
              : `${activityId}_time`;
            values[timeKey] = measurement.time;
          }
        });
      }
    });
    
    setActivityDescriptions(descriptions);
    setFormValues(values);
    initializedRef.current = true;
  }, [initialData, activities]);
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [descriptionText, setDescriptionText] = useState('');
  
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
            // Procesar medication_tracking: agregar adherencia y errores si el médico decidió incluirlos
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
              fieldWrapper={(fieldElement, act, index) => {
                // Solo mostrar el botón en el primer campo (no en campos repetibles individuales)
                if (index !== undefined) {
                  return fieldElement;
                }
                
                const hasDescription = activityDescriptions[act.id] || act.description;
                
                return (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      {fieldElement}
                    </Box>
                    <Tooltip title={hasDescription ? "Editar aclaración para IA" : "Agregar aclaración para IA"}>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDescriptionDialog(act.id)}
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
              }}
            />
          ))}
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


