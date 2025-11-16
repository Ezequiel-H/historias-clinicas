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

  // Resetear el formulario cuando se abre/cierra el modal
  useEffect(() => {
    if (!open) {
      setFormValues({});
      setValidationErrors([]);
      setShowValidation(false);
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

    // Validar reglas de todas las actividades
    const allErrors: ValidationError[] = [];
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
              </Box>
            ))}
          </Box>
        ) : (
          renderSingleField()
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

