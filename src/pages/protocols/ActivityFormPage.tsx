import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Radio,
  Alert,
  Divider,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  CircularProgress,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  TextFields as TextIcon,
  Numbers as NumberIcon,
  ToggleOn as ToggleIcon,
  CalendarToday as DateIcon,
  AttachFile as FileIcon,
  CheckBox as CheckboxIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Code as CodeIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import type { FieldType, SelectOption, ActivityRule } from '../../types';
import protocolService from '../../services/protocolService';

const FIELD_TYPES = [
  {
    value: 'text_short' as FieldType,
    label: 'Texto Corto',
    description: 'Campo de texto de una línea',
    icon: <TextIcon />,
    color: '#1976d2',
  },
  {
    value: 'text_long' as FieldType,
    label: 'Texto Largo',
    description: 'Área de texto multilínea (observaciones)',
    icon: <TextIcon />,
    color: '#1565c0',
  },
  {
    value: 'number_simple' as FieldType,
    label: 'Número Simple',
    description: 'Campo numérico (peso, temperatura)',
    icon: <NumberIcon />,
    color: '#2e7d32',
  },
  {
    value: 'number_compound' as FieldType,
    label: 'Número Compuesto',
    description: 'Ej: Presión (Sistólica/Diastólica)',
    icon: <NumberIcon />,
    color: '#43a047',
  },
  {
    value: 'select_single' as FieldType,
    label: 'Selección',
    description: 'Lista de opciones (configurable: única o múltiple)',
    icon: <CheckboxIcon />,
    color: '#7b1fa2',
  },
  {
    value: 'boolean' as FieldType,
    label: 'Sí/No',
    description: 'Campo booleano simple',
    icon: <ToggleIcon />,
    color: '#f57c00',
  },
  {
    value: 'datetime' as FieldType,
    label: 'Fecha y/o Hora',
    description: 'Selector de fecha, hora o ambos (configurable)',
    icon: <DateIcon />,
    color: '#0288d1',
  },
  {
    value: 'file' as FieldType,
    label: 'Archivo Adjunto',
    description: 'Subir PDF, imagen, etc.',
    icon: <FileIcon />,
    color: '#d32f2f',
  },
  {
    value: 'calculated' as FieldType,
    label: 'Campo Calculado',
    description: 'Se calcula automáticamente basado en otros campos',
    icon: <CodeIcon />,
    color: '#d32f2f',
  },
];

export const ActivityFormPage: React.FC = () => {
  const { protocolId, visitId, activityId } = useParams<{ 
    protocolId: string; 
    visitId: string; 
    activityId: string;
  }>();
  const navigate = useNavigate();
  const isEditMode = activityId !== 'new';

  const [step, setStep] = useState<'type' | 'config'>(isEditMode ? 'config' : 'type');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    fieldType: '' as FieldType | '',
    required: false,
    allowMultiple: false,
    selectMultiple: false, // Para select_single: si true, permite selección múltiple
    allowCustomOptions: false,
    repeatCount: 3,
    datetimeIncludeDate: true, // Por defecto, incluir fecha en datetime
    datetimeIncludeTime: false, // Por defecto, no incluir hora en datetime
    requireDate: false,
    requireTime: false,
    requireDatePerMeasurement: true, // Por defecto, fecha por cada medición
    requireTimePerMeasurement: true, // Por defecto, hora por cada medición
    timeIntervalMinutes: undefined as number | undefined, // Intervalo fijo entre mediciones (en minutos)
    measurementUnit: '',
    decimalPlaces: 2,
    helpText: '',
    calculationFormula: '', // Fórmula para campos calculados
  });
  const [optionsText, setOptionsText] = useState('');
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [validationRules, setValidationRules] = useState<ActivityRule[]>([]);
  const [availableActivities, setAvailableActivities] = useState<string[]>([]);
  const [availableActivitiesForConditional, setAvailableActivitiesForConditional] = useState<Array<{id: string, name: string, fieldType: FieldType, options?: SelectOption[]}>>([]);
  const [conditionalConfig, setConditionalConfig] = useState<{dependsOn: string, showWhen: string | boolean}>({
    dependsOn: '',
    showWhen: '',
  });
  const [isConditionalEnabled, setIsConditionalEnabled] = useState(false);
  const [compoundFields, setCompoundFields] = useState<Array<{name: string, label: string, unit?: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');
  const [showValuesDialog, setShowValuesDialog] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const selectedFieldType = FIELD_TYPES.find(ft => ft.value === formData.fieldType);

  useEffect(() => {
    if (isEditMode && protocolId && visitId && activityId) {
      loadActivityData();
    } else if (!isEditMode && protocolId && visitId) {
      // En modo creación, también cargar las actividades disponibles
      loadAvailableActivities();
    }
  }, [isEditMode, protocolId, visitId, activityId]);

  // Cargar actividades disponibles cuando se necesita para campos condicionales
  useEffect(() => {
    if (protocolId && visitId && formData.fieldType) {
      loadAvailableActivities();
    }
  }, [protocolId, visitId]);

  const loadAvailableActivities = async () => {
    try {
      const response = await protocolService.getProtocolById(protocolId!);
      const protocol = response.data;
      const visit = protocol.visits.find((v) => v.id === visitId);
      
      if (visit && visit.activities) {
        // Solo incluir actividades con tipos de campo numéricos (para fórmulas)
        const numericFieldTypes = ['number_simple', 'number_compound'];
        const numericActivities = visit.activities
          .filter((a) => numericFieldTypes.includes(a.fieldType))
          .map((a) => a.name);
        setAvailableActivities(numericActivities);
        
        // Cargar todas las actividades para campos condicionales (excluyendo calculados, que no pueden ser dependencias)
        const activitiesForConditional = visit.activities
          .filter((a) => a.fieldType !== 'calculated')
          .map((a) => ({
            id: a.id,
            name: a.name,
            fieldType: a.fieldType,
            options: a.options,
          }));
        setAvailableActivitiesForConditional(activitiesForConditional);
      }
    } catch (err) {
      console.error('Error al cargar actividades:', err);
    }
  };

  const loadActivityData = async () => {
    try {
      setLoadingData(true);
      setError('');
      
      // Cargar el protocolo completo para obtener los datos de la actividad
      const response = await protocolService.getProtocolById(protocolId!);
      const protocol = response.data;
      
      // Buscar la visita
      const visit = protocol.visits.find((v) => v.id === visitId);
      
      if (!visit) {
        setError('Visita no encontrada');
        return;
      }
      
      // Cargar lista de actividades disponibles (excluyendo la actual, solo numéricas)
      const numericFieldTypes = ['number_simple', 'number_compound'];
      const otherActivities = visit.activities
        ?.filter((a) => a.id !== activityId && numericFieldTypes.includes(a.fieldType))
        .map((a) => a.name) || [];
      setAvailableActivities(otherActivities);
      
        // Cargar todas las actividades para campos condicionales (excluyendo la actual y calculados, que no pueden ser dependencias)
        const activitiesForConditional = visit.activities
          ?.filter((a) => a.id !== activityId && a.fieldType !== 'calculated')
          .map((a) => ({
            id: a.id,
            name: a.name,
            fieldType: a.fieldType,
            options: a.options,
          })) || [];
      setAvailableActivitiesForConditional(activitiesForConditional);
      
      // Buscar la actividad
      const activity = visit.activities?.find((a) => a.id === activityId);
      
      if (activity) {
        // Migrar tipos antiguos (date, time) a datetime con configuración
        // Nota: Los tipos 'date' y 'time' ya no existen en el tipo FieldType, pero pueden venir del backend
        let fieldType = activity.fieldType as FieldType | 'date' | 'time' | 'select_multiple';
        let datetimeIncludeDate = activity.datetimeIncludeDate !== undefined ? activity.datetimeIncludeDate : true;
        let datetimeIncludeTime = activity.datetimeIncludeTime !== undefined ? activity.datetimeIncludeTime : false;
        let selectMultiple = false;
        
        // Migración de tipos antiguos (si vienen del backend)
        if (fieldType === 'date' || (fieldType as string) === 'date') {
          fieldType = 'datetime';
          datetimeIncludeDate = true;
          datetimeIncludeTime = false;
        } else if (fieldType === 'time' || (fieldType as string) === 'time') {
          fieldType = 'datetime';
          datetimeIncludeDate = false;
          datetimeIncludeTime = true;
        } else if (fieldType === 'datetime') {
          // Si ya es datetime, usar las propiedades si existen, sino valores por defecto
          datetimeIncludeDate = activity.datetimeIncludeDate !== undefined ? activity.datetimeIncludeDate : true;
          datetimeIncludeTime = activity.datetimeIncludeTime !== undefined ? activity.datetimeIncludeTime : true;
        } else if (fieldType === 'select_multiple' || (fieldType as string) === 'select_multiple') {
          // Migrar select_multiple a select_single con selectMultiple = true
          fieldType = 'select_single';
          selectMultiple = true;
        }
        
        // Si es select_single, cargar selectMultiple de la actividad (puede venir del backend actualizado)
        if (fieldType === 'select_single') {
          selectMultiple = (activity as any).selectMultiple !== undefined 
            ? (activity as any).selectMultiple 
            : selectMultiple; // Usar el valor migrado si no existe la propiedad
        }
        
        setFormData({
          name: activity.name,
          description: activity.description || '',
          fieldType: fieldType,
          required: activity.required,
          allowMultiple: activity.allowMultiple || false,
          selectMultiple: selectMultiple,
          allowCustomOptions: activity.allowCustomOptions || false,
          repeatCount: activity.repeatCount || 3,
          datetimeIncludeDate: datetimeIncludeDate,
          datetimeIncludeTime: datetimeIncludeTime,
          requireDate: activity.requireDate || false,
          requireTime: activity.requireTime || false,
          requireDatePerMeasurement: activity.requireDatePerMeasurement !== undefined ? activity.requireDatePerMeasurement : true,
          requireTimePerMeasurement: activity.requireTimePerMeasurement !== undefined ? activity.requireTimePerMeasurement : true,
          timeIntervalMinutes: activity.timeIntervalMinutes || undefined,
          measurementUnit: activity.measurementUnit || '',
          decimalPlaces: activity.decimalPlaces ?? 2,
          helpText: activity.helpText || '',
          calculationFormula: activity.calculationFormula || '',
        });
        
        // Cargar opciones si existen
        if (activity.options && activity.options.length > 0) {
          setOptions(activity.options);
          // También mantener el texto para compatibilidad
          const optionsStr = activity.options
            .map(opt => `${opt.value}|${opt.label}`)
            .join('\n');
          setOptionsText(optionsStr);
        } else {
          setOptions([]);
          setOptionsText('');
        }
        
        // Cargar reglas de validación si existen
        if (activity.validationRules && activity.validationRules.length > 0) {
          setValidationRules(activity.validationRules);
        }
        
        // Cargar configuración condicional si existe
        if (activity.conditionalConfig) {
          setConditionalConfig({
            dependsOn: activity.conditionalConfig.dependsOn || '',
            showWhen: activity.conditionalConfig.showWhen || '',
          });
          setIsConditionalEnabled(!!activity.conditionalConfig.dependsOn);
        } else {
          setConditionalConfig({ dependsOn: '', showWhen: '' });
          setIsConditionalEnabled(false);
        }
        
        // Cargar configuración de campos compuestos si existe
        if (activity.compoundConfig && activity.compoundConfig.fields) {
          // Asegurar que todos los campos tengan nombre interno generado automáticamente
          const fieldsWithNames = activity.compoundConfig.fields.map((field, index) => {
            if (!field.name && field.label) {
              // Generar nombre interno a partir de la etiqueta
              const normalizedName = field.label
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
                .replace(/[^a-z0-9]/g, '_') // Reemplazar caracteres especiales con guión bajo
                .replace(/_+/g, '_') // Reemplazar múltiples guiones bajos con uno solo
                .replace(/^_|_$/g, ''); // Eliminar guiones bajos al inicio y final
              return { ...field, name: normalizedName || `field_${index}` };
            }
            return field;
          });
          setCompoundFields(fieldsWithNames);
        } else {
          setCompoundFields([]);
        }
      } else {
        setError('Actividad no encontrada');
      }
    } catch (err) {
      console.error('Error al cargar actividad:', err);
      setError('Error al cargar los datos de la actividad');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSelectType = (type: FieldType) => {
    setFormData({ ...formData, fieldType: type });
    setStep('config');
  };

  const parseOptions = (text: string): SelectOption[] => {
    return text
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [value, label] = line.split('|').map(s => s.trim());
        return {
          value: value || label,
          label: label || value,
        };
      });
  };

  const buildActivityData = () => {
    const activityData: any = {
      name: formData.name.trim(),
      description: formData.description?.trim() || '',
      fieldType: formData.fieldType,
      required: formData.required,
      order: 1, // El backend asignará el orden correcto
    };

    // Agregar configuraciones opcionales
    // Siempre enviar measurementUnit, incluso si está vacío, para que se actualice en la DB
    activityData.measurementUnit = formData.measurementUnit || '';
    
    // Agregar decimales para campos numéricos y calculados
    const numericTypes = ['number_simple', 'number_compound', 'calculated'];
    if (numericTypes.includes(formData.fieldType)) {
      activityData.decimalPlaces = formData.decimalPlaces;
    }
    
    // Agregar configuración de campos compuestos
    if (formData.fieldType === 'number_compound' && compoundFields.length > 0) {
      // Asegurar que todos los campos tengan nombre interno válido
      const fieldsWithNames = compoundFields.map((field, index) => {
        let name = field.name;
        if (!name || name.trim() === '') {
          // Generar nombre interno a partir de la etiqueta o usar índice
          if (field.label && field.label.trim() !== '') {
            name = field.label
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
              .replace(/[^a-z0-9]/g, '_') // Reemplazar caracteres especiales con guión bajo
              .replace(/_+/g, '_') // Reemplazar múltiples guiones bajos con uno solo
              .replace(/^_|_$/g, ''); // Eliminar guiones bajos al inicio y final
          }
          if (!name || name.trim() === '') {
            name = `field_${index}`;
          }
        }
        return { ...field, name };
      });
      activityData.compoundConfig = {
        fields: fieldsWithNames,
      };
    }
    
    // Siempre enviar helpText, incluso si está vacío, para que se actualice en la DB
    activityData.helpText = formData.helpText || '';
    if (formData.allowMultiple) {
      activityData.allowMultiple = formData.allowMultiple;
      activityData.repeatCount = formData.repeatCount;
    }
    
    // Agregar configuración de datetime
    if (formData.fieldType === 'datetime') {
      activityData.datetimeIncludeDate = formData.datetimeIncludeDate;
      activityData.datetimeIncludeTime = formData.datetimeIncludeTime;
    }
    
    // Agregar campos de fecha y hora (para otras actividades)
    if (formData.requireDate) {
      activityData.requireDate = formData.requireDate;
      if (formData.allowMultiple) {
        activityData.requireDatePerMeasurement = formData.requireDatePerMeasurement;
      }
    }
    if (formData.requireTime) {
      activityData.requireTime = formData.requireTime;
      if (formData.allowMultiple) {
        activityData.requireTimePerMeasurement = formData.requireTimePerMeasurement;
        // Siempre enviar timeIntervalMinutes, incluso si está vacío, para que se actualice en la DB
        activityData.timeIntervalMinutes = formData.timeIntervalMinutes || undefined;
      }
    }
    
    // Agregar selectMultiple y allowCustomOptions para select_single
    if (formData.fieldType === 'select_single') {
      activityData.selectMultiple = formData.selectMultiple || false;
      if (formData.selectMultiple) {
        activityData.allowCustomOptions = formData.allowCustomOptions || false;
      }
    }

    // Parsear opciones si es campo de selección
    if (formData.fieldType === 'select_single') {
      // Usar el array de opciones si está disponible, sino parsear del texto
      if (options.length > 0) {
        // Asegurar que value = label para facilitar la escritura de la historia clínica
        activityData.options = options.map(opt => ({
          ...opt,
          value: opt.label || opt.value, // Usar label como value
        }));
      } else if (optionsText) {
        const parsed = parseOptions(optionsText);
        // Asegurar que value = label
        activityData.options = parsed.map(opt => ({
          ...opt,
          value: opt.label || opt.value,
        }));
      }
    }

    // Siempre enviar reglas de validación (incluso si está vacío para limpiar las reglas existentes)
    activityData.validationRules = validationRules;

    // Agregar fórmula de cálculo si es campo calculado
    // Siempre enviar calculationFormula, incluso si está vacío, para que se actualice en la DB
    if (formData.fieldType === 'calculated') {
      activityData.calculationFormula = formData.calculationFormula?.trim() || '';
    }

    // Agregar configuración condicional si está habilitada y configurada (para cualquier tipo de campo)
    if (isConditionalEnabled && conditionalConfig.dependsOn) {
      // Convertir showWhen a boolean si es necesario
      let showWhenValue: string | boolean = conditionalConfig.showWhen;
      if (typeof conditionalConfig.showWhen === 'string') {
        // Si es 'true' o 'false', convertir a boolean
        if (conditionalConfig.showWhen === 'true') {
          showWhenValue = true;
        } else if (conditionalConfig.showWhen === 'false') {
          showWhenValue = false;
        }
      }
      activityData.conditionalConfig = {
        dependsOn: conditionalConfig.dependsOn,
        showWhen: showWhenValue,
      };
    }

    return activityData;
  };

  const handleSave = async () => {
    if (!formData.name || !formData.fieldType) {
      setError('El nombre y el tipo de campo son obligatorios');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const activityData = buildActivityData();

      if (isEditMode && activityId) {
        // Actualizar actividad existente
        await protocolService.updateActivity(protocolId!, visitId!, activityId, activityData);
      } else {
        // Crear nueva actividad
        await protocolService.addActivity(protocolId!, visitId!, activityData);
      }

      // Volver a la configuración de la visita
      navigate(`/protocols/${protocolId}/visits/${visitId}/edit`);
    } catch (err) {
      console.error('Error al guardar actividad:', err);
      setError('Error al guardar el campo. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const addValidationRule = () => {
    const newRule: ActivityRule = {
      name: '',
      condition: 'min',
      severity: 'warning',
      message: '',
      isActive: true,
      formulaOperator: '>',
    };
    setValidationRules([...validationRules, newRule]);
  };

  const updateValidationRule = (index: number, updates: Partial<ActivityRule>) => {
    const updated = [...validationRules];
    updated[index] = { ...updated[index], ...updates };
    setValidationRules(updated);
  };

  const deleteValidationRule = (index: number) => {
    setValidationRules(validationRules.filter((_, i) => i !== index));
  };

  const needsUnit = formData.fieldType === 'number_simple' || formData.fieldType === 'number_compound' || formData.fieldType === 'calculated';
  const needsOptions = formData.fieldType === 'select_single';

  if (loadingData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (step === 'type') {
    return (
      <Box>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <IconButton onClick={() => navigate(`/protocols/${protocolId}/visits/${visitId}/edit`)}>
            <BackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            Seleccioná el Tipo de Campo
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 3 }}>
          Elegí el tipo de campo/pregunta que querés agregar a esta visita
        </Alert>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' } }}>
          {FIELD_TYPES.map((fieldType) => (
            <Card key={fieldType.value} sx={{ height: '100%' }}>
              <CardActionArea 
                onClick={() => handleSelectType(fieldType.value)}
                sx={{ height: '100%', p: 2 }}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={1}>
                    <Box 
                      sx={{ 
                        color: fieldType.color, 
                        bgcolor: `${fieldType.color}20`,
                        p: 1,
                        borderRadius: 1,
                        display: 'flex',
                      }}
                    >
                      {fieldType.icon}
                    </Box>
                    <Typography variant="h6" component="div">
                      {fieldType.label}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {fieldType.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => step === 'config' && !isEditMode ? setStep('type') : navigate(`/protocols/${protocolId}/visits/${visitId}/edit`)}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {isEditMode ? 'Editar' : 'Nuevo'} Campo
            </Typography>
            {selectedFieldType && (
              <Chip 
                label={selectedFieldType.label} 
                size="small" 
                sx={{ mt: 1 }}
                icon={selectedFieldType.icon}
              />
            )}
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={!formData.name || !formData.fieldType || loading}
          size="large"
        >
          {loading ? 'Guardando...' : 'Guardar Campo'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Formulario de configuración */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Configuración del Campo
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 3 }}>
          {/* Información básica */}
          <TextField
            label="Nombre del Campo / Pregunta"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            fullWidth
            required
            placeholder="Ej: Presión Arterial, ¿Tuvo eventos adversos?"
            helperText="Este es el texto que verá el médico"
          />

          <TextField
            label="Instrucciones para la IA (Opcional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            multiline
            rows={3}
            placeholder="Instrucciones para la IA que procesará las respuestas y escribirá la historia clínica. Ej: 'Si el valor es mayor a 150, mencionar riesgo cardiovascular'"
            helperText="Este texto será usado por la IA para interpretar y documentar las respuestas en la historia clínica"
          />

          <Divider />

          {/* Configuración específica para datetime */}
          {formData.fieldType === 'datetime' && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Configuración de Fecha y Hora
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Elegí qué componentes querés incluir en este campo
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.datetimeIncludeDate || false}
                      onChange={(e) => {
                        const newValue = e.target.checked;
                        setFormData({ ...formData, datetimeIncludeDate: newValue });
                        // Si se desmarca fecha y hora, asegurar que al menos uno esté marcado
                        if (!newValue && !formData.datetimeIncludeTime) {
                          setFormData({ ...formData, datetimeIncludeDate: false, datetimeIncludeTime: true });
                        }
                      }}
                    />
                  }
                  label="Incluir selector de fecha"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.datetimeIncludeTime || false}
                      onChange={(e) => {
                        const newValue = e.target.checked;
                        setFormData({ ...formData, datetimeIncludeTime: newValue });
                        // Si se desmarca fecha y hora, asegurar que al menos uno esté marcado
                        if (!newValue && !formData.datetimeIncludeDate) {
                          setFormData({ ...formData, datetimeIncludeDate: true, datetimeIncludeTime: false });
                        }
                      }}
                    />
                  }
                  label="Incluir selector de hora"
                />
                {(!formData.datetimeIncludeDate && !formData.datetimeIncludeTime) && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Debes seleccionar al menos una opción (fecha o hora)
                  </Alert>
                )}
              </Box>
            </Box>
          )}

          {/* Configuraciones específicas */}
          {needsUnit && (
            <TextField
              label="Unidad de Medida"
              value={formData.measurementUnit}
              onChange={(e) => setFormData({ ...formData, measurementUnit: e.target.value })}
              fullWidth
              placeholder="Ej: mmHg, kg, °C, cm"
              helperText="Opcional: unidad que se mostrará junto al campo"
            />
          )}

          {needsUnit && (
            <TextField
              label="Cantidad de Decimales"
              type="number"
              value={formData.decimalPlaces}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 0 && value <= 10) {
                  setFormData({ ...formData, decimalPlaces: value });
                }
              }}
              fullWidth
              inputProps={{ min: 0, max: 10, step: 1 }}
              helperText="Los valores se formatearán automáticamente con esta cantidad de decimales (0-10)"
            />
          )}

          {formData.fieldType === 'number_compound' && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle2">
                  Campos del Número Compuesto
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const newField = {
                      name: `field_${compoundFields.length}`,
                      label: '',
                      unit: '',
                    };
                    setCompoundFields([...compoundFields, newField]);
                  }}
                >
                  Agregar Campo
                </Button>
              </Box>
              
              {compoundFields.length === 0 ? (
                <Alert severity="info">
                  No hay campos configurados. Haz clic en "Agregar Campo" para comenzar.
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Ejemplo: Para presión arterial, agrega dos campos: "Sistólica" y "Diastólica"
                  </Typography>
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Etiqueta (lo que verá el médico)</TableCell>
                        <TableCell>Unidad (opcional)</TableCell>
                        <TableCell align="center">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {compoundFields.map((field, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <TextField
                              size="small"
                              value={field.label}
                              onChange={(e) => {
                                const updated = [...compoundFields];
                                updated[index].label = e.target.value;
                                // Generar nombre interno automáticamente a partir de la etiqueta
                                const normalizedName = e.target.value
                                  .toLowerCase()
                                  .normalize('NFD')
                                  .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
                                  .replace(/[^a-z0-9]/g, '_') // Reemplazar caracteres especiales con guión bajo
                                  .replace(/_+/g, '_') // Reemplazar múltiples guiones bajos con uno solo
                                  .replace(/^_|_$/g, ''); // Eliminar guiones bajos al inicio y final
                                updated[index].name = normalizedName || `field_${index}`;
                                setCompoundFields(updated);
                              }}
                              placeholder="Ej: Sistólica"
                              fullWidth
                              helperText="Etiqueta visible para el médico"
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={field.unit || ''}
                              onChange={(e) => {
                                const updated = [...compoundFields];
                                updated[index].unit = e.target.value;
                                setCompoundFields(updated);
                              }}
                              placeholder="Ej: mmHg"
                              fullWidth
                              helperText="Opcional"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() => {
                                const updated = compoundFields.filter((_, i) => i !== index);
                                setCompoundFields(updated);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Etiqueta:</strong> Texto que verá el médico al completar el formulario. Ej: "Sistólica", "Diastólica"
                </Typography>
                <Typography variant="body2">
                  <strong>Unidad:</strong> Unidad de medida opcional que se mostrará junto al campo. Ej: "mmHg", "kg", "cm"
                </Typography>
              </Alert>
            </Box>
          )}

          {needsOptions && (
            <Box>
              {/* Checkbox para selección múltiple */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.selectMultiple || false}
                    onChange={(e) => setFormData({ ...formData, selectMultiple: e.target.checked })}
                  />
                }
                label="Permitir selección múltiple (el médico podrá elegir varias opciones)"
                sx={{ mb: 2 }}
              />
              
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle2">
                  Opciones Disponibles
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const newOption: SelectOption = {
                      value: '', // Se establecerá igual a label cuando se escriba
                      label: '',
                      required: false,
                      exclusive: false,
                    };
                    setOptions([...options, newOption]);
                  }}
                >
                  Agregar Opción
                </Button>
              </Box>
              
              {options.length === 0 ? (
                <Alert severity="info">
                  No hay opciones configuradas. Haz clic en "Agregar Opción" para comenzar.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Opción</TableCell>
                        <TableCell align="center">Obligatoria</TableCell>
                        <TableCell align="center">Excluyente</TableCell>
                        <TableCell align="center">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {options.map((option, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <TextField
                              size="small"
                              value={option.label}
                              onChange={(e) => {
                                const updated = [...options];
                                updated[index].label = e.target.value;
                                // El valor será igual a la etiqueta
                                updated[index].value = e.target.value;
                                setOptions(updated);
                              }}
                              placeholder="Ej: Hipertensión"
                              fullWidth
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Checkbox
                              checked={option.required || false}
                              onChange={(e) => {
                                const updated = [...options];
                                updated[index].required = e.target.checked;
                                if (e.target.checked) {
                                  updated[index].exclusive = false; // No puede ser ambas
                                }
                                setOptions(updated);
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Checkbox
                              checked={option.exclusive || false}
                              onChange={(e) => {
                                const updated = [...options];
                                updated[index].exclusive = e.target.checked;
                                if (e.target.checked) {
                                  updated[index].required = false; // No puede ser ambas
                                }
                                setOptions(updated);
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() => {
                                const updated = options.filter((_, i) => i !== index);
                                setOptions(updated);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Opción:</strong> El texto que verá el médico y que se guardará en la historia clínica (ej: "Hipertensión").
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Obligatoria:</strong> Esta opción debe ser seleccionada para que el paciente califique para el protocolo.
                </Typography>
                <Typography variant="body2">
                  <strong>Excluyente:</strong> Si esta opción es seleccionada, el paciente NO califica para el protocolo.
                </Typography>
              </Alert>
              
              {/* Checkbox para permitir opciones personalizadas (solo si es selección múltiple) */}
              {formData.fieldType === 'select_single' && formData.selectMultiple && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.allowCustomOptions || false}
                      onChange={(e) => setFormData({ ...formData, allowCustomOptions: e.target.checked })}
                    />
                  }
                  label="Permitir al médico agregar opciones personalizadas que no estén en la lista"
                  sx={{ mt: 2 }}
                />
              )}
            </Box>
          )}

          <TextField
            label="Ayuda para el Médico (Opcional)"
            value={formData.helpText}
            onChange={(e) => setFormData({ ...formData, helpText: e.target.value })}
            fullWidth
            multiline
            rows={2}
            placeholder="Instrucciones o aclaraciones que verá el médico al completar este campo"
            helperText="Este texto aparecerá como ayuda visible para el médico al completar el formulario"
          />

          {/* Configuración de fórmula para campos calculados */}
          {formData.fieldType === 'calculated' && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Fórmula de Cálculo
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Define la fórmula que calculará automáticamente el valor de este campo basándose en otros campos numéricos.
              </Typography>
              
              <Autocomplete
                freeSolo
                value={null}
                options={availableActivities}
                inputValue={formData.calculationFormula || ''}
                onInputChange={(_, newValue, reason) => {
                  if (reason === 'input') {
                    setFormData({ ...formData, calculationFormula: newValue });
                  }
                }}
                onChange={(_, newValue) => {
                  if (typeof newValue === 'string' && availableActivities.includes(newValue)) {
                    const currentFormula = formData.calculationFormula || '';
                    const words = currentFormula.split(/[\s+\-*/()\[\]]+/);
                    const lastWord = words[words.length - 1] || '';
                    
                    let newFormula = currentFormula;
                    if (lastWord.length > 0) {
                      const lastIndex = currentFormula.lastIndexOf(lastWord);
                      newFormula = currentFormula.substring(0, lastIndex) + newValue;
                    } else {
                      newFormula = currentFormula + (currentFormula.length > 0 ? ' ' : '') + newValue;
                    }
                    
                    setFormData({ ...formData, calculationFormula: newFormula });
                  }
                }}
                clearOnBlur={false}
                renderInput={(params) => (
                  <Box>
                    <TextField
                      {...params}
                      label="Fórmula"
                      placeholder="Ej: peso / altura"
                      fullWidth
                      helperText="Usa nombres de otros campos numéricos y operadores matemáticos (+, -, *, /, paréntesis)"
                    />
                    {availableActivities.length > 0 ? (
                      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Variables disponibles:
                        </Typography>
                        {availableActivities.map((act, i) => (
                          <Chip 
                            key={i} 
                            label={act} 
                            size="small" 
                            sx={{ height: 20, fontSize: '0.7rem' }}
                            color="primary"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Agrega actividades numéricas (Número Simple, Número Compuesto) para poder usarlas en la fórmula
                      </Typography>
                    )}
                  </Box>
                )}
              />
              
              {formData.calculationFormula && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    Vista previa de la fórmula:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                    {formData.calculationFormula.split(/(\s+|[+\-*/()[\]])/).filter(Boolean).map((part, idx) => {
                      const trimmed = part.trim();
                      if (!trimmed) return null;
                      
                      // Es una variable reconocida?
                      if (availableActivities.some(act => 
                        trimmed.toLowerCase() === act.toLowerCase()
                      )) {
                        return (
                          <Chip
                            key={idx}
                            label={trimmed}
                            size="small"
                            color="success"
                            icon={<CheckCircleIcon />}
                          />
                        );
                      }
                      
                      // Es un operador?
                      if (['+', '-', '*', '/', '(', ')', '[', ']'].includes(trimmed)) {
                        return (
                          <Typography key={idx} component="span" sx={{ color: 'primary.main', fontWeight: 'bold', px: 0.5 }}>
                            {trimmed}
                          </Typography>
                        );
                      }
                      
                      // Es un número?
                      if (!isNaN(Number(trimmed))) {
                        return (
                          <Typography key={idx} component="span" sx={{ color: 'info.main', fontWeight: 'medium' }}>
                            {trimmed}
                          </Typography>
                        );
                      }
                      
                      // Texto sin reconocer
                      return (
                        <Typography key={idx} component="span" sx={{ color: 'error.main', textDecoration: 'underline wavy' }}>
                          {trimmed}
                        </Typography>
                      );
                    })}
                  </Box>
                </Box>
              )}
            </Box>
          )}

          <Divider />

          {/* Opciones adicionales */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Opciones Adicionales
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.required}
                    onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                  />
                }
                label="Campo Requerido (obligatorio completar)"
              />
              <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.allowMultiple}
                      onChange={(e) => setFormData({ ...formData, allowMultiple: e.target.checked })}
                      disabled={formData.fieldType === 'calculated'} // Los campos calculados no pueden tener múltiples mediciones
                    />
                  }
                  label="Permitir Múltiples Mediciones (ej: tomar PA 3 veces)"
                />
                {formData.allowMultiple && (
                  <TextField
                    label="Número de Mediciones"
                    type="number"
                    value={formData.repeatCount}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Permitir campo vacío mientras se escribe, pero guardar como número
                      if (value === '') {
                        setFormData({ ...formData, repeatCount: '' as any });
                      } else {
                        const num = parseInt(value);
                        if (!isNaN(num) && num >= 1 && num <= 10) {
                          setFormData({ ...formData, repeatCount: num });
                        }
                      }
                    }}
                    onBlur={() => {
                      // Asegurar que tenga un valor válido al salir del campo
                      if (typeof formData.repeatCount === 'string' || formData.repeatCount < 1) {
                        setFormData({ ...formData, repeatCount: 3 });
                      }
                    }}
                    inputProps={{ min: 1, max: 10 }}
                    size="small"
                    sx={{ width: 180 }}
                    helperText=""
                  />
                )}
              </Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.requireDate}
                    onChange={(e) => setFormData({ ...formData, requireDate: e.target.checked })}
                  />
                }
                label="Solicitar fecha en que se realizó la actividad"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.requireTime}
                    onChange={(e) => setFormData({ ...formData, requireTime: e.target.checked })}
                  />
                }
                label="Solicitar hora en que se realizó la actividad"
              />
            </Box>

            {/* Configuración condicional - disponible para cualquier tipo de campo (excepto calculated) */}
            {formData.fieldType !== 'calculated' && (
              <>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isConditionalEnabled}
                      onChange={(e) => {
                        setIsConditionalEnabled(e.target.checked);
                        if (!e.target.checked) {
                          // Si se desmarca, limpiar la configuración
                          setConditionalConfig({ dependsOn: '', showWhen: '' });
                        }
                      }}
                    />
                  }
                  label="Campo Condicional (se muestra solo cuando otro campo tenga un valor específico)"
                />
                
                {isConditionalEnabled && (
                  <Box sx={{ ml: 4, mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Depende de (Campo)</InputLabel>
                      <Select
                        value={conditionalConfig.dependsOn}
                        label="Depende de (Campo)"
                        onChange={(e) => {
                          setConditionalConfig({
                            ...conditionalConfig,
                            dependsOn: e.target.value,
                            showWhen: '', // Resetear showWhen cuando cambia el campo
                          });
                        }}
                      >
                        {availableActivitiesForConditional.length === 0 ? (
                          <MenuItem disabled>
                            No hay campos disponibles. Agrega otros campos primero.
                          </MenuItem>
                        ) : (
                          availableActivitiesForConditional.map((activity) => (
                            <MenuItem key={activity.id} value={activity.id}>
                              {activity.name} ({FIELD_TYPES.find(ft => ft.value === activity.fieldType)?.label || activity.fieldType})
                            </MenuItem>
                          ))
                        )}
                      </Select>
                      {availableActivitiesForConditional.length === 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Necesitas crear otros campos en esta visita antes de poder configurar una condición.
                        </Typography>
                      )}
                    </FormControl>

                    {conditionalConfig.dependsOn && (() => {
                      const dependsOnActivity = availableActivitiesForConditional.find(a => a.id === conditionalConfig.dependsOn);
                      if (!dependsOnActivity) return null;

                      // Si es boolean, mostrar opciones true/false
                      if (dependsOnActivity.fieldType === 'boolean') {
                        return (
                          <FormControl fullWidth>
                            <InputLabel>Mostrar cuando el valor sea</InputLabel>
                            <Select
                              value={conditionalConfig.showWhen === true || conditionalConfig.showWhen === 'true' ? 'true' : conditionalConfig.showWhen === false || conditionalConfig.showWhen === 'false' ? 'false' : ''}
                              label="Mostrar cuando el valor sea"
                              onChange={(e) => {
                                setConditionalConfig({
                                  ...conditionalConfig,
                                  showWhen: e.target.value === 'true',
                                });
                              }}
                            >
                              <MenuItem value="true">Sí / Verdadero</MenuItem>
                              <MenuItem value="false">No / Falso</MenuItem>
                            </Select>
                          </FormControl>
                        );
                      }

                      // Si es select_single, mostrar opciones
                      if (dependsOnActivity.fieldType === 'select_single') {
                        if (dependsOnActivity.options && dependsOnActivity.options.length > 0) {
                          return (
                            <FormControl fullWidth>
                              <InputLabel>Mostrar cuando el valor sea</InputLabel>
                              <Select
                                value={conditionalConfig.showWhen || ''}
                                label="Mostrar cuando el valor sea"
                                onChange={(e) => {
                                  setConditionalConfig({
                                    ...conditionalConfig,
                                    showWhen: e.target.value,
                                  });
                                }}
                              >
                                {dependsOnActivity.options.map((option) => (
                                  <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          );
                        } else {
                          return (
                            <TextField
                              label="Mostrar cuando el valor sea"
                              value={conditionalConfig.showWhen || ''}
                              onChange={(e) => {
                                setConditionalConfig({
                                  ...conditionalConfig,
                                  showWhen: e.target.value,
                                });
                              }}
                              fullWidth
                              size="small"
                              placeholder="Ingresa el valor exacto"
                              helperText="Ingresa el valor exacto que debe tener el campo para mostrar este campo condicional"
                            />
                          );
                        }
                      }

                      // Para otros tipos (text, number, etc.), campo de texto libre
                      return (
                        <TextField
                          label="Mostrar cuando el valor sea"
                          value={conditionalConfig.showWhen || ''}
                          onChange={(e) => {
                            setConditionalConfig({
                              ...conditionalConfig,
                              showWhen: e.target.value,
                            });
                          }}
                          fullWidth
                          size="small"
                          placeholder="Ingresa el valor exacto"
                          helperText="Este campo se mostrará solo cuando el campo seleccionado tenga exactamente este valor"
                        />
                      );
                    })()}

                    {conditionalConfig.dependsOn && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                          Este campo se mostrará solo cuando <strong>{availableActivitiesForConditional.find(a => a.id === conditionalConfig.dependsOn)?.name}</strong> tenga el valor especificado.
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                )}
              </>
            )}
            
            {/* Opciones de fecha/hora por medición - solo si allowMultiple está marcado */}
            {formData.allowMultiple && (formData.requireDate || formData.requireTime) && (
              <Box sx={{ ml: 4, mt: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Configuración de Fecha/Hora para Mediciones Repetibles
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Elige si quieres una fecha/hora para todas las mediciones o una por cada medición
                </Typography>
                {formData.requireDate && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.requireDatePerMeasurement}
                        onChange={(e) => setFormData({ ...formData, requireDatePerMeasurement: e.target.checked })}
                      />
                    }
                    label="Fecha por cada medición (si está desmarcado, una fecha para todas)"
                  />
                )}
                {formData.requireTime && (
                  <>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.requireTimePerMeasurement}
                          onChange={(e) => setFormData({ ...formData, requireTimePerMeasurement: e.target.checked })}
                        />
                      }
                      label="Hora por cada medición (si está desmarcado, una hora para todas)"
                    />
                    {formData.requireTimePerMeasurement && (
                      <Box sx={{ ml: 4, mt: 1 }}>
                        <TextField
                          label="Intervalo entre mediciones (minutos)"
                          type="number"
                          value={formData.timeIntervalMinutes || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              setFormData({ ...formData, timeIntervalMinutes: undefined });
                            } else {
                              const num = parseInt(value);
                              if (!isNaN(num) && num > 0) {
                                setFormData({ ...formData, timeIntervalMinutes: num });
                              }
                            }
                          }}
                          size="small"
                          sx={{ width: 250 }}
                          helperText="Si configuras un intervalo, solo se preguntará la hora de la primera medición. Las demás se calcularán automáticamente."
                          placeholder="Ej: 15 (cada 15 minutos)"
                        />
                      </Box>
                    )}
                  </>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Vista previa */}
      <Paper sx={{ p: 3, mt: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>
          Vista Previa
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Así se verá este campo cuando el médico cargue la visita:
        </Typography>
        <Box sx={{ mt: 2, p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" gutterBottom>
            {formData.name || '[Nombre del campo]'}
            {formData.required && <span style={{ color: 'red' }}> *</span>}
            {formData.allowMultiple && (
              <Chip 
                label={`Repetible (${formData.repeatCount}x)`} 
                size="small" 
                sx={{ ml: 1 }} 
                color="primary"
                variant="outlined"
              />
            )}
            {conditionalConfig.dependsOn && (
              <Chip 
                label="Condicional" 
                size="small" 
                sx={{ ml: 1 }} 
                color="secondary"
                variant="outlined"
                icon={<LinkIcon />}
              />
            )}
          </Typography>
          {conditionalConfig.dependsOn && (
            <Alert severity="info" sx={{ mb: 2, mt: 1 }}>
              <Typography variant="body2">
                Este campo se mostrará solo cuando <strong>{availableActivitiesForConditional.find(a => a.id === conditionalConfig.dependsOn)?.name}</strong> tenga el valor: <strong>{typeof conditionalConfig.showWhen === 'boolean' ? (conditionalConfig.showWhen ? 'Sí/Verdadero' : 'No/Falso') : conditionalConfig.showWhen}</strong>
              </Typography>
            </Alert>
          )}
          {formData.description && (
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {formData.description}
            </Typography>
          )}
          <Box sx={{ mt: 1 }}>
            {/* Vista previa según el tipo de campo */}
            {formData.fieldType === 'text_short' && (
              <TextField
                fullWidth
                placeholder="Ingrese texto aquí..."
                disabled
                size="small"
              />
            )}
            
            {formData.fieldType === 'text_long' && (
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Ingrese observaciones aquí..."
                disabled
                size="small"
              />
            )}
            
            {formData.fieldType === 'number_simple' && (
              <Box>
                <TextField
                  type="number"
                  placeholder={(123.4).toFixed(formData.decimalPlaces)}
                  disabled
                  size="small"
                  sx={{ width: 200 }}
                  InputProps={{
                    endAdornment: formData.measurementUnit ? (
                      <Typography variant="body2" color="text.secondary">
                        {formData.measurementUnit}
                      </Typography>
                    ) : null,
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 2, display: 'block', mt: 0.5 }}>
                  Decimales: {formData.decimalPlaces}
                </Typography>
              </Box>
            )}
            
            {formData.fieldType === 'number_compound' && (
              <Box>
                {compoundFields.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" fontStyle="italic">
                    No hay campos configurados. Agrega campos en la configuración arriba.
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {compoundFields.map((field, index) => (
                      <TextField
                        key={index}
                        type="number"
                        label={field.label || `Campo ${index + 1}`}
                        placeholder={(123.4).toFixed(formData.decimalPlaces)}
                        disabled
                        size="small"
                        sx={{ minWidth: 200 }}
                        InputProps={{
                          endAdornment: field.unit ? (
                            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                              {field.unit}
                            </Typography>
                          ) : null,
                        }}
                      />
                    ))}
                  </Box>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Decimales: {formData.decimalPlaces}
                </Typography>
              </Box>
            )}
            
            {formData.fieldType === 'calculated' && (
              <Box>
                <TextField
                  type="text"
                  value={formData.calculationFormula ? '—' : ''}
                  disabled
                  size="small"
                  fullWidth
                  label="Valor Calculado"
                  InputProps={{
                    readOnly: true,
                    startAdornment: formData.measurementUnit ? (
                      <Box component="span" sx={{ mr: 1, color: 'text.secondary' }}>
                        {formData.measurementUnit}
                      </Box>
                    ) : null,
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      backgroundColor: 'action.hover',
                      fontWeight: 'medium',
                    },
                  }}
                  helperText={
                    formData.calculationFormula
                      ? `Se calculará automáticamente: ${formData.calculationFormula}`
                      : 'Configura la fórmula para ver el cálculo'
                  }
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Decimales: {formData.decimalPlaces}
                </Typography>
              </Box>
            )}
            
            {formData.fieldType === 'select_single' && (
              <Box>
                {options.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" fontStyle="italic">
                    No hay opciones configuradas aún
                  </Typography>
                ) : (
                  <Box>
                    {options.map((opt, idx) => (
                      <Box key={idx} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FormControlLabel
                          control={
                            formData.selectMultiple ? 
                              <Checkbox disabled size="small" /> : 
                              <Radio disabled size="small" />
                          }
                          label={opt.label || opt.value}
                          sx={{ flex: 1 }}
                        />
                        {opt.required && (
                          <Chip 
                            label="Obligatoria" 
                            size="small" 
                            color="success" 
                            variant="outlined"
                          />
                        )}
                        {opt.exclusive && (
                          <Chip 
                            label="Excluyente" 
                            size="small" 
                            color="error" 
                            variant="outlined"
                          />
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}
            
            {formData.fieldType === 'boolean' && (
              <FormControlLabel
                control={<Checkbox disabled />}
                label="Sí / Activado"
              />
            )}
            
            {formData.fieldType === 'datetime' && (
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {formData.datetimeIncludeDate && (
                  <TextField
                    type="date"
                    label="Fecha"
                    disabled
                    size="small"
                    sx={{ minWidth: 200 }}
                    InputLabelProps={{ shrink: true }}
                  />
                )}
                {formData.datetimeIncludeTime && (
                  <TextField
                    type="text"
                    label="Hora"
                    placeholder="HH:MM"
                    disabled
                    size="small"
                    sx={{ minWidth: 200 }}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ 
                      maxLength: 5,
                      pattern: '[0-9]{2}:[0-9]{2}'
                    }}
                    helperText="Formato: HH:MM (ej: 14:30)"
                  />
                )}
                {!formData.datetimeIncludeDate && !formData.datetimeIncludeTime && (
                  <Typography variant="body2" color="text.secondary" fontStyle="italic">
                    Selecciona al menos una opción (fecha o hora) en la configuración
                  </Typography>
                )}
              </Box>
            )}
            
            {formData.fieldType === 'file' && (
              <Button variant="outlined" disabled size="small">
                Seleccionar archivo...
              </Button>
            )}
            
            {/* Campos de fecha y hora en la vista previa */}
            {(formData.requireDate || formData.requireTime) && (
              <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {formData.requireDate && (
                  <TextField
                    type="date"
                    label="Fecha en que se realizó la actividad"
                    disabled
                    size="small"
                    sx={{ minWidth: 200 }}
                    InputLabelProps={{ shrink: true }}
                  />
                )}
                {formData.requireTime && (
                  <TextField
                    type="text"
                    label="Hora en que se realizó la actividad"
                    placeholder="HH:MM"
                    disabled
                    size="small"
                    sx={{ minWidth: 200 }}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ 
                      maxLength: 5,
                      pattern: '[0-9]{2}:[0-9]{2}'
                    }}
                    helperText="Formato: HH:MM (ej: 14:30)"
                  />
                )}
              </Box>
            )}
          </Box>
          {formData.helpText && (
            <Alert severity="info" sx={{ mt: 1 }}>
              {formData.helpText}
            </Alert>
          )}
        </Box>
      </Paper>

      {/* Reglas de Validación */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Reglas de Validación Clínica
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={addValidationRule}
          >
            Agregar Regla
          </Button>
        </Box>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          Define reglas para validar automáticamente los valores ingresados. Puedes crear alertas basadas en valores fijos o fórmulas que referencien otras actividades numéricas (peso, altura, glucosa, etc.).
        </Alert>

        {validationRules.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 3 }}>
            No hay reglas configuradas. Las reglas permiten alertar sobre valores fuera de rango o condiciones específicas.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {validationRules.map((rule, index) => (
              <Card key={index} variant="outlined">
                <CardContent>
                  <Box display="flex" gap={2} flexDirection="column">
                    {/* Nombre y Severidad */}
                    <Box display="flex" gap={2} alignItems="flex-start">
                      <TextField
                        label="Nombre de la Regla"
                        value={rule.name}
                        onChange={(e) => updateValidationRule(index, { name: e.target.value })}
                        placeholder="Ej: Presión arterial alta"
                        fullWidth
                        size="small"
                      />
                      <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Tipo</InputLabel>
                        <Select
                          value={rule.severity}
                          label="Tipo"
                          onChange={(e) => updateValidationRule(index, { severity: e.target.value as 'warning' | 'error' })}
                        >
                          <MenuItem value="warning">
                            <Box display="flex" alignItems="center" gap={1}>
                              <WarningIcon fontSize="small" color="warning" />
                              Alerta
                            </Box>
                          </MenuItem>
                          <MenuItem value="error">
                            <Box display="flex" alignItems="center" gap={1}>
                              <ErrorIcon fontSize="small" color="error" />
                              Error
                            </Box>
                          </MenuItem>
                        </Select>
                      </FormControl>
                      <IconButton
                        color="error"
                        onClick={() => deleteValidationRule(index)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>

                    {/* Condición */}
                    <Box display="flex" gap={2} alignItems="flex-start">
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Condición</InputLabel>
                        <Select
                          value={rule.condition}
                          label="Condición"
                          onChange={(e) => updateValidationRule(index, { condition: e.target.value as any })}
                        >
                          <MenuItem value="min">Valor mínimo</MenuItem>
                          <MenuItem value="max">Valor máximo</MenuItem>
                          <MenuItem value="range">Rango (mín - máx)</MenuItem>
                          <MenuItem value="equals">Igual a</MenuItem>
                          <MenuItem value="not_equals">Distinto de</MenuItem>
                          <MenuItem value="formula">Fórmula personalizada</MenuItem>
                        </Select>
                      </FormControl>

                      {/* Campos según condición */}
                      {rule.condition === 'min' && (
                        <TextField
                          label="Valor Mínimo"
                          type="number"
                          value={rule.minValue || ''}
                          onChange={(e) => updateValidationRule(index, { minValue: parseFloat(e.target.value) })}
                          size="small"
                          sx={{ width: 150 }}
                        />
                      )}

                      {rule.condition === 'max' && (
                        <TextField
                          label="Valor Máximo"
                          type="number"
                          value={rule.maxValue || ''}
                          onChange={(e) => updateValidationRule(index, { maxValue: parseFloat(e.target.value) })}
                          size="small"
                          sx={{ width: 150 }}
                        />
                      )}

                      {rule.condition === 'range' && (
                        <>
                          <TextField
                            label="Mínimo"
                            type="number"
                            value={rule.minValue || ''}
                            onChange={(e) => updateValidationRule(index, { minValue: parseFloat(e.target.value) })}
                            size="small"
                            sx={{ width: 120 }}
                          />
                          <TextField
                            label="Máximo"
                            type="number"
                            value={rule.maxValue || ''}
                            onChange={(e) => updateValidationRule(index, { maxValue: parseFloat(e.target.value) })}
                            size="small"
                            sx={{ width: 120 }}
                          />
                        </>
                      )}

                      {(rule.condition === 'equals' || rule.condition === 'not_equals') && (
                        <TextField
                          label="Valor"
                          value={rule.value || ''}
                          onChange={(e) => updateValidationRule(index, { value: e.target.value })}
                          size="small"
                          sx={{ width: 150 }}
                        />
                      )}

                      {rule.condition === 'formula' && (
                        <Box sx={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                          <FormControl size="small" sx={{ minWidth: 180 }}>
                            <InputLabel>Comparación</InputLabel>
                            <Select
                              value={rule.formulaOperator || '>'}
                              label="Comparación"
                              onChange={(e) => updateValidationRule(index, { formulaOperator: e.target.value as any })}
                            >
                              <MenuItem value=">">Mayor que (&gt;)</MenuItem>
                              <MenuItem value=">=">Mayor o igual (≥)</MenuItem>
                              <MenuItem value="<">Menor que (&lt;)</MenuItem>
                              <MenuItem value="<=">Menor o igual (≤)</MenuItem>
                              <MenuItem value="==">Igual a (=)</MenuItem>
                              <MenuItem value="!=">Distinto de (≠)</MenuItem>
                            </Select>
                          </FormControl>
                          
                          <Box sx={{ flex: 1 }}>
                            <Autocomplete
                            freeSolo
                            value={null}
                            options={availableActivities}
                            inputValue={rule.formula || ''}
                            onInputChange={(_, newValue, reason) => {
                              // Solo actualizar si es por tipeo, no por selección
                              if (reason === 'input') {
                                updateValidationRule(index, { formula: newValue });
                              }
                            }}
                            onChange={(_, newValue) => {
                              // Cuando se selecciona una opción del autocompletado
                              if (typeof newValue === 'string' && availableActivities.includes(newValue)) {
                                const currentFormula = rule.formula || '';
                                // Obtener la última palabra incompleta
                                const words = currentFormula.split(/[\s+\-*/()\[\]]+/);
                                const lastWord = words[words.length - 1] || '';
                                
                                // Reemplazar la última palabra con la variable seleccionada
                                let newFormula = currentFormula;
                                if (lastWord.length > 0) {
                                  const lastIndex = currentFormula.lastIndexOf(lastWord);
                                  newFormula = currentFormula.substring(0, lastIndex) + newValue;
                                } else {
                                  // Si no hay palabra, simplemente agregar
                                  newFormula = currentFormula + (currentFormula.length > 0 ? ' ' : '') + newValue;
                                }
                                
                                updateValidationRule(index, { formula: newFormula });
                              }
                            }}
                            clearOnBlur={false}
                            renderInput={(params) => (
                              <Box>
                                <TextField
                                  {...params}
                                  label="Fórmula"
                                  placeholder="Ej: peso * 10 + altura"
                                  size="small"
                                  fullWidth
                                />
                                {availableActivities.length > 0 ? (
                                  <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary">
                                      Variables numéricas disponibles:
                                    </Typography>
                                    {availableActivities.map((act, i) => (
                                      <Chip 
                                        key={i} 
                                        label={act} 
                                        size="small" 
                                        sx={{ height: 18, fontSize: '0.7rem' }}
                                        color="primary"
                                        variant="outlined"
                                      />
                                    ))}
                                  </Box>
                                ) : (
                                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                    Agrega actividades numéricas (Número Simple, Número con Rango, etc.) para poder usarlas en fórmulas
                                  </Typography>
                                )}
                              </Box>
                            )}
                            renderOption={(props, option) => {
                              const { key, ...otherProps } = props;
                              return (
                                <Box 
                                  key={key}
                                  component="li" 
                                  {...otherProps}
                                  sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1,
                                    '&:hover': { bgcolor: 'primary.light' }
                                  }}
                                >
                                  <Chip 
                                    label={option} 
                                    size="small" 
                                    color="primary" 
                                    variant="outlined"
                                  />
                                </Box>
                              );
                            }}
                            filterOptions={(options, { inputValue }) => {
                              // Obtener la última palabra que está escribiendo
                              const words = inputValue.split(/[\s+\-*/()\[\]]+/);
                              const lastWord = words[words.length - 1] || '';
                              
                              // Si no hay texto, no mostrar sugerencias
                              if (lastWord.length === 0) return [];
                              
                              // Filtrar actividades que coincidan con lo que está escribiendo
                              return options.filter((option) =>
                                option.toLowerCase().includes(lastWord.toLowerCase())
                              );
                            }}
                          />
                          
                          {/* Vista previa de la fórmula parseada */}
                          {rule.formula && (
                            <Box sx={{ mt: 1, p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                Vista previa: <strong>Esta actividad</strong> debe ser{' '}
                                <strong>
                                  {rule.formulaOperator === '>' && 'mayor que'}
                                  {rule.formulaOperator === '>=' && 'mayor o igual que'}
                                  {rule.formulaOperator === '<' && 'menor que'}
                                  {rule.formulaOperator === '<=' && 'menor o igual que'}
                                  {rule.formulaOperator === '==' && 'igual a'}
                                  {rule.formulaOperator === '!=' && 'distinto de'}
                                  {!rule.formulaOperator && 'mayor que'}
                                </strong>:
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                                {rule.formula.split(/(\s+|[+\-*/()[\]])/).filter(Boolean).map((part, idx) => {
                                  const trimmed = part.trim();
                                  if (!trimmed) return null;
                                  
                                  // Es una variable reconocida?
                                  if (availableActivities.some(act => 
                                    trimmed.toLowerCase() === act.toLowerCase()
                                  )) {
                                    return (
                                      <Chip
                                        key={idx}
                                        label={trimmed}
                                        size="small"
                                        color="success"
                                        icon={<CheckCircleIcon />}
                                      />
                                    );
                                  }
                                  
                                  // Es un operador?
                                  if (['+', '-', '*', '/', '(', ')', '[', ']'].includes(trimmed)) {
                                    return (
                                      <Typography key={idx} component="span" sx={{ color: 'primary.main', fontWeight: 'bold', px: 0.5 }}>
                                        {trimmed}
                                      </Typography>
                                    );
                                  }
                                  
                                  // Es un número?
                                  if (!isNaN(Number(trimmed))) {
                                    return (
                                      <Typography key={idx} component="span" sx={{ color: 'info.main', fontWeight: 'medium' }}>
                                        {trimmed}
                                      </Typography>
                                    );
                                  }
                                  
                                  // Texto sin reconocer
                                  return (
                                    <Typography key={idx} component="span" sx={{ color: 'error.main', textDecoration: 'underline wavy' }}>
                                      {trimmed}
                                    </Typography>
                                  );
                                })}
                              </Box>
                            </Box>
                          )}
                          </Box>
                        </Box>
                      )}
                    </Box>

                    {/* Mensaje */}
                    <TextField
                      label="Mensaje de Alerta"
                      value={rule.message}
                      onChange={(e) => updateValidationRule(index, { message: e.target.value })}
                      placeholder="Mensaje que verá el médico cuando se active esta regla"
                      fullWidth
                      size="small"
                      multiline
                      rows={2}
                    />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Paper>

      {/* Toast de validación exitosa - deshabilitado temporalmente */}
      {/* 
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
          Formulario válido! Todos los campos requeridos están completos.
        </Alert>
      </Snackbar>
      */}

      {/* Dialog para mostrar valores validados - deshabilitado temporalmente */}
      {/* 
      <Dialog
        open={showValuesDialog}
        onClose={() => setShowValuesDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CheckCircleIcon color="success" />
            <Typography variant="h6">Validación Exitosa</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            El formulario ha sido validado correctamente.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowValuesDialog(false)}>
            Cerrar
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setShowValuesDialog(false);
              handleSave();
            }}
            startIcon={<SaveIcon />}
          >
            Guardar Ahora
          </Button>
        </DialogActions>
      </Dialog>
      */}
    </Box>
  );
};

