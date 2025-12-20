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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
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
  FileCopy as ImportIcon,
} from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Visit, Activity, Template } from '../../types';
import protocolService from '../../services/protocolService';
import templateService from '../../services/templateService';
import { VisitFormPreview } from '../../components/protocols/VisitFormPreview';

// Componente SortableItem para cada Card
interface SortableItemProps {
  activity: Activity;
  index: number;
  onEdit: (activityId: string) => void;
  onDelete: (activityId: string) => void;
  getFieldTypeLabel: (type: string) => string;
  isReordering: boolean;
}

const SortableItem: React.FC<SortableItemProps> = ({
  activity,
  index,
  onEdit,
  onDelete,
  getFieldTypeLabel,
  isReordering,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card variant="outlined">
        <CardContent>
          <Box display="flex" alignItems="flex-start" gap={2}>
            <DragIcon
              sx={{
                color: 'text.secondary',
                cursor: 'grab',
                mt: 0.5,
                '&:active': { cursor: 'grabbing' },
              }}
              {...attributes}
              {...listeners}
            />
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
                {activity.helpText}
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
                {(activity.expectedMin !== undefined ||
                  activity.expectedMax !== undefined) && (
                  <Chip
                    label={`Rango: ${
                      activity.expectedMin !== undefined
                        ? activity.expectedMin
                        : '?'
                    } - ${
                      activity.expectedMax !== undefined
                        ? activity.expectedMax
                        : '?'
                    }`}
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
              {activity.validationRules &&
                activity.validationRules.length > 0 && (
                  <Box
                    sx={{
                      mt: 2,
                      pt: 2,
                      borderTop: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight="bold"
                      display="block"
                      sx={{ mb: 1 }}
                    >
                      Reglas de Validación (
                      {activity.validationRules.filter((r) => r.isActive)
                        .length}{' '}
                      activa
                      {activity.validationRules.filter((r) => r.isActive)
                        .length !== 1
                        ? 's'
                        : ''}
                      ):
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
                            bgcolor:
                              rule.severity === 'error'
                                ? 'error.light'
                                : 'warning.light',
                            borderRadius: 1,
                            opacity: rule.isActive ? 1 : 0.5,
                          }}
                        >
                          {rule.severity === 'error' ? (
                            <ErrorIcon
                              fontSize="small"
                              sx={{ color: 'error.dark' }}
                            />
                          ) : (
                            <WarningIcon
                              fontSize="small"
                              sx={{ color: 'warning.dark' }}
                            />
                          )}
                          <Box flex={1}>
                            <Typography
                              variant="caption"
                              fontWeight="bold"
                              display="block"
                            >
                              {rule.name}
                              {!rule.isActive && ' (Inactiva)'}
                            </Typography>
                            <Typography
                              variant="caption"
                              display="block"
                              sx={{ color: 'text.secondary' }}
                            >
                              {rule.condition === 'min' &&
                                `Mínimo: ${rule.minValue}`}
                              {rule.condition === 'max' &&
                                `Máximo: ${rule.maxValue}`}
                              {rule.condition === 'range' &&
                                `Rango: ${rule.minValue} - ${rule.maxValue}`}
                              {rule.condition === 'equals' &&
                                `Igual a: ${rule.value}`}
                              {rule.condition === 'not_equals' &&
                                `Distinto de: ${rule.value}`}
                              {rule.condition === 'formula' &&
                                `Fórmula: debe ser ${rule.formulaOperator || '>'} (${rule.formula})`}
                            </Typography>
                            <Typography
                              variant="caption"
                              display="block"
                              sx={{ fontStyle: 'italic', mt: 0.5 }}
                            >
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
            onClick={() => onEdit(activity.id)}
            disabled={isDragging || isReordering}
          >
            Editar
          </Button>
          <Button
            size="small"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => onDelete(activity.id)}
            disabled={isDragging || isReordering}
          >
            Eliminar
          </Button>
        </CardActions>
      </Card>
    </div>
  );
};

export const VisitConfigPage: React.FC = () => {
  const { protocolId, visitId } = useParams<{ protocolId: string; visitId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [importing, setImporting] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
        // Ordenar actividades por el campo order
        const sortedActivities = [...(visitData.activities || [])].sort(
          (a, b) => a.order - b.order
        );
        setActivities(sortedActivities);
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

  const handleOpenImportDialog = async () => {
    setImportDialogOpen(true);
    try {
      setLoadingTemplates(true);
      const response = await templateService.getTemplates(1, 100);
      setTemplates(response.data);
    } catch (err) {
      console.error('Error al cargar plantillas:', err);
      setError('Error al cargar las plantillas');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleImportTemplate = async (templateId: string) => {
    try {
      setImporting(true);
      setError('');
      await protocolService.importTemplate(protocolId!, visitId!, templateId);
      // Recargar los datos de la visita
      await loadVisitData();
      setImportDialogOpen(false);
    } catch (err) {
      console.error('Error al importar plantilla:', err);
      setError('Error al importar la plantilla');
    } finally {
      setImporting(false);
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
      date: 'Fecha',
      time: 'Hora',
      datetime: 'Fecha y Hora',
      file: 'Archivo Adjunto',
      conditional: 'Campo Condicional',
    };
    return types[type] || type;
  };

  const handleDragEnd = async (event: {
    active: { id: string | number };
    over: { id: string | number } | null;
  }) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = activities.findIndex((a) => a.id === active.id);
    const newIndex = activities.findIndex((a) => a.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Actualizar el orden localmente
    const newActivities = arrayMove(activities, oldIndex, newIndex);
    setActivities(newActivities);

    // Actualizar el orden en el backend
    try {
      setIsReordering(true);
      setError('');

      // Actualizar el orden de todas las actividades afectadas
      const updatePromises = newActivities.map((activity, index) => {
        const newOrder = index + 1;
        if (activity.order !== newOrder) {
          return protocolService.updateActivity(
            protocolId!,
            visitId!,
            activity.id,
            { ...activity, order: newOrder }
          );
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);
    } catch (err) {
      console.error('Error al actualizar el orden:', err);
      setError('Error al actualizar el orden de los campos');
      // Revertir el cambio local
      await loadVisitData();
    } finally {
      setIsReordering(false);
    }
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
          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={handleOpenImportDialog}
            size="large"
          >
            Importar Plantilla
          </Button>
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
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
              Campos Configurados ({activities.length})
            </Typography>
            {isReordering && (
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">
                  Actualizando orden...
                </Typography>
              </Box>
            )}
          </Box>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={activities.map((a) => a.id)}
              strategy={verticalListSortingStrategy}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {activities.map((activity, index) => (
                  <SortableItem
                    key={activity.id}
                    activity={activity}
                    index={index}
                    onEdit={handleEditActivity}
                    onDelete={handleDeleteActivity}
                    getFieldTypeLabel={getFieldTypeLabel}
                    isReordering={isReordering}
                  />
                ))}
              </Box>
            </SortableContext>
          </DndContext>
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
        protocolId={protocolId}
        visitId={visitId}
      />

      {/* Dialog para importar plantilla */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Importar Plantilla</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Seleccioná una plantilla para importar sus campos en esta visita. Los campos se agregarán al final de la lista.
          </Alert>
          {loadingTemplates ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : templates.length === 0 ? (
            <Alert severity="warning">
              No hay plantillas disponibles. Creá una plantilla primero desde el menú de Plantillas.
            </Alert>
          ) : (
            <List>
              {templates.map((template) => (
                <ListItem key={template.id} disablePadding>
                  <ListItemButton onClick={() => handleImportTemplate(template.id)} disabled={importing}>
                    <ListItemText
                      primary={template.name}
                      secondary={
                        <>
                          {template.description && (
                            <Typography variant="body2" color="text.secondary" component="span" display="block">
                              {template.description}
                            </Typography>
                          )}
                          <Chip
                            label={`${template.activities?.length || 0} actividades`}
                            size="small"
                            sx={{ mt: 0.5 }}
                          />
                        </>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)} disabled={importing}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

