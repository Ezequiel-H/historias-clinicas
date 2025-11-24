import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Save as SaveIcon,
  Visibility as PreviewIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import type { Visit, Activity } from '../../types';
import protocolService from '../../services/protocolService';
import { VisitFormPreview } from '../../components/protocols/VisitFormPreview';

export const VisitConfigPage: React.FC = () => {
  const { protocolId, visitId } = useParams<{ protocolId: string; visitId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (visitId && visitId !== 'new' && protocolId) {
      loadVisitData();
    }
  }, [visitId, protocolId, location.key]); // location.key cambia en cada navegación

  const loadVisitData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await protocolService.getProtocolById(protocolId!);
      const protocol = response.data;
      
      const visitData = protocol.visits.find((v) => v.id === visitId);
      
      if (visitData) {
        setVisit(visitData);
        setActivities(visitData.activities || []);
      } else {
        setError('Visita no encontrada');
      }
    } catch (err) {
      console.error('Error al cargar visita:', err);
      setError('Error al cargar los datos de la visita');
    } finally {
      setLoading(false);
    }
  };

  const handleAddActivity = () => {
    navigate(`/protocols/${protocolId}/visits/${visitId}/activities/new`);
  };

  const handleEditActivity = (activityId: string) => {
    navigate(`/protocols/${protocolId}/visits/${visitId}/activities/${activityId}`);
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!window.confirm('¿Está seguro de eliminar este campo?')) {
      return;
    }

    try {
      setError('');
      await protocolService.deleteActivity(protocolId!, visitId!, activityId);
      setActivities(activities.filter(a => a.id !== activityId));
    } catch (err) {
      console.error('Error al eliminar actividad:', err);
      setError('Error al eliminar el campo');
    }
  };

  const handleSave = () => {
    navigate(`/protocols/${protocolId}/edit`);
  };

  const getFieldTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      text_short: 'Texto Corto',
      text_long: 'Texto Largo',
      number_simple: 'Número Simple',
      number_compound: 'Número Compuesto',
      select_single: 'Selección',
      boolean: 'Sí/No',
      date: 'Fecha',
      time: 'Hora',
      datetime: 'Fecha y Hora',
      file: 'Archivo Adjunto',
      conditional: 'Campo Condicional',
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate(`/protocols/${protocolId}/edit`)}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Configurar Campos de Visita
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {visit?.name || 'Cargando...'}
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={2}>
          {activities.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<PreviewIcon />}
              onClick={() => setPreviewOpen(true)}
              size="large"
            >
              Preview Formulario
            </Button>
          )}
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          size="large"
        >
          Guardar y Volver
        </Button>
        </Box>
      </Box>

      {/* Info */}
      <Alert severity="info" sx={{ mb: 3 }}>
        Configurá todos los campos/preguntas que deben completarse en esta visita. 
        Los médicos verán estos campos cuando carguen una visita de este tipo.
      </Alert>

      {/* Botón principal para agregar */}
      <Paper sx={{ p: 3, mb: 3, textAlign: 'center', bgcolor: 'primary.light' }}>
        <Typography variant="h6" gutterBottom>
          {activities.length === 0 ? '¡Empezá agregando el primer campo!' : 'Agregá más campos'}
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={handleAddActivity}
          sx={{ mt: 2 }}
        >
          Agregar Campo / Pregunta
        </Button>
      </Paper>

      {/* Lista de campos configurados */}
      {activities.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            Campos Configurados ({activities.length})
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {activities.map((activity, index) => (
              <Card key={activity.id} variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    <DragIcon sx={{ color: 'text.secondary', cursor: 'grab', mt: 0.5 }} />
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="h6" component="div">
                          {index + 1}. {activity.name}
                        </Typography>
                        {activity.required && (
                          <Chip label="Requerido" color="error" size="small" />
                        )}
                        {activity.allowMultiple && (
                          <Chip label="Repetible" color="info" size="small" />
                        )}
                      </Box>

                      <Typography variant="body2" color="text.secondary" paragraph>
                        {activity.description}
                      </Typography>

                      <Box display="flex" gap={1} flexWrap="wrap">
                        <Chip 
                          label={getFieldTypeLabel(activity.fieldType)} 
                          size="small" 
                          variant="outlined"
                        />
                        {activity.measurementUnit && (
                          <Chip 
                            label={`Unidad: ${activity.measurementUnit}`} 
                            size="small" 
                            variant="outlined"
                          />
                        )}
                        {(activity.expectedMin !== undefined || activity.expectedMax !== undefined) && (
                          <Chip 
                            label={`Rango: ${activity.expectedMin !== undefined ? activity.expectedMin : '?'} - ${activity.expectedMax !== undefined ? activity.expectedMax : '?'}`} 
                            size="small" 
                            variant="outlined"
                          />
                        )}
                        {activity.options && activity.options.length > 0 && (
                          <Chip 
                            label={`${activity.options.length} opciones`} 
                            size="small" 
                            variant="outlined"
                          />
                        )}
                      </Box>

                      {/* Mostrar reglas de validación */}
                      {activity.validationRules && activity.validationRules.length > 0 && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" sx={{ mb: 1 }}>
                            Reglas de Validación ({activity.validationRules.filter(r => r.isActive).length} activa{activity.validationRules.filter(r => r.isActive).length !== 1 ? 's' : ''}):
                          </Typography>
                          <Box display="flex" flexDirection="column" gap={1}>
                            {activity.validationRules.map((rule, ruleIdx) => (
                              <Box 
                                key={ruleIdx} 
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: 1,
                                  p: 1,
                                  bgcolor: rule.severity === 'error' ? 'error.light' : 'warning.light',
                                  borderRadius: 1,
                                  opacity: rule.isActive ? 1 : 0.5,
                                }}
                              >
                                {rule.severity === 'error' ? (
                                  <ErrorIcon fontSize="small" sx={{ color: 'error.dark' }} />
                                ) : (
                                  <WarningIcon fontSize="small" sx={{ color: 'warning.dark' }} />
                                )}
                                <Box flex={1}>
                                  <Typography variant="caption" fontWeight="bold" display="block">
                                    {rule.name}
                                    {!rule.isActive && ' (Inactiva)'}
                                  </Typography>
                                  <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                                    {rule.condition === 'min' && `Mínimo: ${rule.minValue}`}
                                    {rule.condition === 'max' && `Máximo: ${rule.maxValue}`}
                                    {rule.condition === 'range' && `Rango: ${rule.minValue} - ${rule.maxValue}`}
                                    {rule.condition === 'equals' && `Igual a: ${rule.value}`}
                                    {rule.condition === 'not_equals' && `Distinto de: ${rule.value}`}
                                    {rule.condition === 'formula' && `Fórmula: debe ser ${rule.formulaOperator || '>'} (${rule.formula})`}
                                  </Typography>
                                  <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                                    "{rule.message}"
                                  </Typography>
                                </Box>
                                <Chip
                                  label={rule.severity === 'error' ? 'Error' : 'Alerta'}
                                  size="small"
                                  color={rule.severity === 'error' ? 'error' : 'warning'}
                                  variant="filled"
                                />
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleEditActivity(activity.id)}
                  >
                    Editar
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteActivity(activity.id)}
                  >
                    Eliminar
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {activities.length === 0 && (
        <Paper sx={{ p: 5, textAlign: 'center', bgcolor: 'grey.50' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No hay campos configurados
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hacé clic en el botón de arriba para agregar el primer campo
          </Typography>
        </Paper>
      )}

      {/* Botón secundario para agregar más */}
      {activities.length > 0 && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<AddIcon />}
            onClick={handleAddActivity}
          >
            Agregar Otro Campo
          </Button>
        </Box>
      )}

      {/* Preview Modal */}
      <VisitFormPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        visitName={visit?.name || 'Vista'}
        activities={activities}
      />
    </Box>
  );
};

