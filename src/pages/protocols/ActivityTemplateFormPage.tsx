import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import type { Activity, ActivityTemplate, Omit } from '../../types';
import activityTemplateService from '../../services/activityTemplateService';

export const ActivityTemplateFormPage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const isEditMode = templateId !== 'new';

  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    description: '',
  });
  const [activities, setActivities] = useState<Omit<Activity, 'id' | 'visitId'>[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const processedActivitiesRef = useRef<Set<string>>(new Set()); // Rastrear actividades ya procesadas

  useEffect(() => {
    if (isEditMode && templateId) {
      setHasLoadedInitialData(false); // Resetear el flag cuando cambia el templateId
      processedActivitiesRef.current.clear(); // Limpiar actividades procesadas
      loadTemplateData();
    } else {
      // Si es una nueva plantilla, resetear actividades y flag
      setActivities([]);
      setHasLoadedInitialData(false);
      processedActivitiesRef.current.clear();
    }
  }, [isEditMode, templateId]);

  const loadTemplateData = async () => {
    try {
      setLoadingData(true);
      setError('');
      
      const response = await activityTemplateService.getTemplateById(templateId!);
      const template = response.data;
      
      if (template) {
        setTemplateFormData({
          name: template.name,
          description: template.description || '',
        });
        // Solo cargar actividades desde el backend si:
        // 1. El estado está completamente vacío (primera carga)
        // 2. Y no se han cargado datos antes
        // Esto evita sobrescribir actividades que fueron agregadas recientemente
        setActivities((prevActivities) => {
          if (prevActivities.length === 0 && !hasLoadedInitialData) {
            console.log('Cargando actividades iniciales desde el backend:', template.activities?.length || 0);
            return template.activities || [];
          }
          console.log('Manteniendo actividades existentes:', prevActivities.length);
          return prevActivities; // Mantener las actividades existentes
        });
        setHasLoadedInitialData(true);
      }
    } catch (err) {
      console.error('Error al cargar plantilla:', err);
      setError('Error al cargar los datos de la plantilla');
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddActivity = () => {
    // Navegar a la página de crear actividad, pero en modo plantilla
    // Usamos un ID especial "template" para indicar que estamos en modo plantilla
    const templateIdParam = templateId || 'new';
    navigate(`/activity-templates/${templateIdParam}/activities/new`, {
      state: {
        templateMode: true,
        templateId: templateIdParam,
        existingActivities: activities,
      },
    });
  };

  const handleEditActivity = (index: number) => {
    // Navegar a la página de editar actividad en modo plantilla
    const templateIdParam = templateId || 'new';
    navigate(`/activity-templates/${templateIdParam}/activities/${index}`, {
      state: {
        templateMode: true,
        templateId: templateIdParam,
        activity: activities[index],
        activityIndex: index,
        existingActivities: activities,
      },
    });
  };

  const handleDeleteActivity = (index: number) => {
    if (window.confirm('¿Está seguro de eliminar esta actividad de la plantilla?')) {
      setActivities(activities.filter((_, i) => i !== index));
    }
  };

  // Esta función se llamará cuando regresemos de la página de actividad
  useEffect(() => {
    // Verificar si hay datos guardados
    const checkSavedActivity = () => {
      const savedData = localStorage.getItem('templateActivityData');
      const savedFlag = localStorage.getItem('templateActivitySaved');
      
      if (savedData && savedFlag === 'true') {
        try {
          const data = JSON.parse(savedData);
          const currentTemplateId = templateId || 'new';
          
          if (data.templateId === currentTemplateId) {
            // Crear una clave única para esta actividad usando timestamp
            const timestamp = data.timestamp || Date.now();
            const activityKey = data.activityIndex !== undefined 
              ? `edit_${data.activityIndex}_${timestamp}`
              : `new_${timestamp}_${data.activity.name}`;
            
            // Verificar si ya procesamos esta actividad
            if (!processedActivitiesRef.current.has(activityKey)) {
              processedActivitiesRef.current.add(activityKey);
              
              setActivities((prevActivities) => {
                console.log('Procesando actividad. Actividades actuales:', prevActivities.length, prevActivities.map(a => a.name));
                
                if (data.activityIndex !== undefined && data.activityIndex < prevActivities.length) {
                  // Editar actividad existente
                  const updated = [...prevActivities];
                  updated[data.activityIndex] = {
                    ...data.activity,
                    order: data.activityIndex + 1,
                  };
                  console.log('Editando actividad en índice', data.activityIndex, '. Nuevo total:', updated.length);
                  return updated;
                } else if (data.activityIndex === undefined) {
                  // Agregar nueva actividad - verificar que no exista ya
                  const exists = prevActivities.some(
                    (act) => act.name === data.activity.name && act.fieldType === data.activity.fieldType
                  );
                  if (!exists) {
                    const newActivity = {
                      ...data.activity,
                      order: prevActivities.length + 1,
                    };
                    const updated = [...prevActivities, newActivity];
                    console.log('Agregando nueva actividad:', data.activity.name, '. Nuevo total:', updated.length);
                    return updated;
                  } else {
                    console.log('La actividad ya existe, no se agrega duplicado');
                  }
                }
                return prevActivities;
              });
              
              // Limpiar el storage inmediatamente después de procesar
              localStorage.removeItem('templateActivitySaved');
              localStorage.removeItem('templateActivityData');
            } else {
              console.log('Esta actividad ya fue procesada, ignorando');
            }
          }
        } catch (err) {
          console.error('Error al parsear datos guardados:', err);
        }
      }
    };

    // Verificar cuando la ventana recupera el foco (cuando se regresa de otra página)
    const handleFocus = () => {
      checkSavedActivity();
    };

    window.addEventListener('focus', handleFocus);
    
    // Verificar inmediatamente al montar
    checkSavedActivity();
    
    // También verificar periódicamente (para cuando se regresa de otra página en la misma pestaña)
    const interval = setInterval(checkSavedActivity, 200);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [templateId]);

  const handleSaveTemplate = async () => {
    if (!templateFormData.name.trim()) {
      setError('El nombre de la plantilla es requerido');
      return;
    }

    if (activities.length === 0) {
      setError('Debe agregar al menos una actividad a la plantilla');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const templateData: Omit<ActivityTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
        name: templateFormData.name.trim(),
        description: templateFormData.description.trim() || undefined,
        activities: activities.map((activity, index) => ({
          ...activity,
          order: index + 1,
        })),
      };

      if (isEditMode && templateId) {
        await activityTemplateService.updateTemplate(templateId, templateData);
      } else {
        await activityTemplateService.createTemplate(templateData);
      }

      navigate('/activity-templates');
    } catch (err) {
      console.error('Error al guardar plantilla:', err);
      setError('Error al guardar la plantilla. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const getFieldTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      text_short: 'Texto Corto',
      text_long: 'Texto Largo',
      number_simple: 'Número Simple',
      number_compound: 'Número Compuesto',
      select_single: 'Selección',
      boolean: 'Sí/No',
      datetime: 'Fecha y Hora',
      file: 'Archivo Adjunto',
      calculated: 'Campo Calculado',
    };
    return types[type] || type;
  };

  if (loadingData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate('/activity-templates')}>
            <BackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            {isEditMode ? 'Editar' : 'Crear'} Plantilla de Sección
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSaveTemplate}
          disabled={!templateFormData.name || activities.length === 0 || loading}
          size="large"
        >
          {loading ? 'Guardando...' : 'Guardar Plantilla'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Información de la Plantilla */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Información de la Plantilla
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 3 }}>
          <TextField
            label="Nombre de la Plantilla"
            value={templateFormData.name}
            onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
            fullWidth
            required
            placeholder="Ej: Información básica de la visita"
            helperText="Nombre descriptivo para identificar esta plantilla"
          />

          <TextField
            label="Descripción (Opcional)"
            value={templateFormData.description}
            onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
            fullWidth
            multiline
            rows={2}
            placeholder="Descripción de cuándo usar esta plantilla"
          />
        </Box>
      </Paper>

      {/* Actividades de la Plantilla */}
      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">
            Actividades de la Plantilla ({activities.length})
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddActivity}
            size="large"
          >
            Agregar Campo
          </Button>
        </Box>

        {activities.length === 0 ? (
          <Alert severity="info">
            No hay actividades en la plantilla. Hacé clic en "Agregar Campo" para comenzar.
          </Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {activities.map((activity, index) => (
              <Card key={index} variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="h6" component="div">
                          {index + 1}. {activity.name}
                        </Typography>
                        <Chip label={getFieldTypeLabel(activity.fieldType)} size="small" />
                        {activity.required && (
                          <Chip label="Requerido" size="small" color="error" />
                        )}
                      </Box>
                      {activity.description && (
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {activity.description}
                        </Typography>
                      )}
                      {activity.measurementUnit && (
                        <Chip 
                          label={`Unidad: ${activity.measurementUnit}`} 
                          size="small" 
                          variant="outlined"
                          sx={{ mr: 1 }}
                        />
                      )}
                      {activity.allowMultiple && (
                        <Chip 
                          label={`Múltiples mediciones (${activity.repeatCount}x)`} 
                          size="small" 
                          variant="outlined"
                          color="primary"
                        />
                      )}
                    </Box>
                    <Box display="flex" gap={1}>
                      <IconButton
                        size="small"
                        onClick={() => handleEditActivity(index)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteActivity(index)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Paper>

    </Box>
  );
};

