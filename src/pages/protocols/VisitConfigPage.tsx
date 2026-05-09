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
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Visibility as PreviewIcon,
  ContentCopy as CopyIcon,
  ContentPaste as PasteIcon,
  Checklist as ChecklistIcon,
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
import type { Visit, Activity } from '../../types';
import { FIELD_TYPE_VALUES } from '../../types';
import { isExcludedFromClinicalRedactor } from '../../utils/clinicalRedactorFields';
import protocolService from '../../services/protocolService';
import { VisitFormPreview } from '../../components/protocols/VisitFormPreview';

/** La API aún acepta `select_multiple` en payloads legados (no está en {@link FIELD_TYPE_VALUES}). */
function isFieldTypeAllowedForPaste(ft: string): boolean {
  return (FIELD_TYPE_VALUES as readonly string[]).includes(ft) || ft === 'select_multiple';
}

function normalizePasteConfigs(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (
    parsed &&
    typeof parsed === 'object' &&
    Array.isArray((parsed as Record<string, unknown>).activities)
  ) {
    return (parsed as Record<string, unknown>).activities as unknown[];
  }
  return [parsed];
}

function sanitizePastedActivityConfig(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') {
    throw new SyntaxError('Cada ítem debe ser un objeto');
  }
  const activity = raw as Record<string, unknown>;
  const { id: _id, visitId: _visitId, order: _order, ...rest } = activity;
  const out: Record<string, unknown> = { ...rest };
  if (Array.isArray(out.validationRules)) {
    out.validationRules = out.validationRules.map((rule: unknown) => {
      if (!rule || typeof rule !== 'object') return rule;
      const { id: _ruleId, ...ruleRest } = rule as Record<string, unknown>;
      return ruleRest;
    });
  }
  return out;
}

function isCompleteActivityConfigForPaste(o: Record<string, unknown>): boolean {
  const name = o.name;
  if (typeof name !== 'string' || !name.trim()) return false;
  const ft = o.fieldType;
  if (typeof ft !== 'string' || !isFieldTypeAllowedForPaste(ft)) return false;
  if (typeof o.required !== 'boolean') return false;

  switch (ft) {
    case 'constant': {
      const ct = o.constantText;
      return typeof ct === 'string' && ct.trim().length > 0;
    }
    case 'select_single':
    case 'adverse_events_list': {
      const opts = o.options;
      return Array.isArray(opts) && opts.length > 0;
    }
    case 'number_compound': {
      const cc = o.compoundConfig as { fields?: unknown[] } | undefined;
      return Array.isArray(cc?.fields) && cc.fields.length > 0;
    }
    case 'calculated': {
      const f = o.calculationFormula;
      return typeof f === 'string' && f.trim().length > 0;
    }
    case 'medication_tracking': {
      return o.medicationTrackingConfig !== null && typeof o.medicationTrackingConfig === 'object';
    }
    case 'conditional': {
      return o.conditionalConfig !== null && typeof o.conditionalConfig === 'object';
    }
    default:
      return true;
  }
}

function tryPreparePasteConfigs(parsed: unknown): Record<string, unknown>[] | null {
  try {
    const rawList = normalizePasteConfigs(parsed);
    if (rawList.length === 0) return null;
    const sanitized = rawList.map((item) => sanitizePastedActivityConfig(item));
    if (!sanitized.every(isCompleteActivityConfigForPaste)) return null;
    return sanitized;
  } catch {
    return null;
  }
}

interface SortableItemProps {
  activity: Activity;
  index: number;
  onEdit: (activityId: string) => void;
  onDelete: (activityId: string) => void;
  onCopy: (activity: Activity) => void;
  isMultiSelectMode: boolean;
  isSelected: boolean;
  onToggleSelect: (activityId: string) => void;
  getFieldTypeLabel: (type: string) => string;
  isReordering: boolean;
}

const SortableItem: React.FC<SortableItemProps> = ({
  activity,
  index,
  onEdit,
  onDelete,
  onCopy,
  isMultiSelectMode,
  isSelected,
  onToggleSelect,
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

  const activeRulesCount =
    activity.validationRules?.filter((r) => r.isActive).length ?? 0;

  return (
    <div ref={setNodeRef} style={style}>
      <Card variant="outlined">
        <CardContent sx={{ py: 1, px: 2 }}>
          <Box display="flex" alignItems="flex-start" gap={1}>
            <DragIcon
              sx={{
                color: 'text.secondary',
                cursor: isMultiSelectMode ? 'default' : 'grab',
                fontSize: 20,
                '&:active': { cursor: isMultiSelectMode ? 'default' : 'grabbing' },
              }}
              {...(!isMultiSelectMode ? { ...attributes, ...listeners } : {})}
            />
            {isMultiSelectMode && (
              <Checkbox
                checked={isSelected}
                onChange={() => onToggleSelect(activity.id)}
                size="small"
                sx={{ py: 0 }}
              />
            )}
            <Box flex={1} minWidth={0}>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <Typography
                  variant="subtitle2"
                  component="div"
                  fontWeight={600}
                  noWrap
                  sx={{ flex: 1, minWidth: 0 }}
                  title={activity.name}
                >
                  {index + 1}. {activity.name}
                </Typography>
                <Box display="flex" flexShrink={0} alignItems="center">
                  <IconButton
                    aria-label="copiar pregunta"
                    onClick={() => onCopy(activity)}
                    disabled={isDragging || isReordering}
                    size="small"
                    color="secondary"
                  >
                    <CopyIcon />
                  </IconButton>
                  <IconButton
                    aria-label="editar pregunta"
                    onClick={() => onEdit(activity.id)}
                    disabled={isDragging || isReordering}
                    size="small"
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    aria-label="eliminar pregunta"
                    onClick={() => onDelete(activity.id)}
                    disabled={isDragging || isReordering}
                    size="small"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>

              <Box display="flex" gap={0.75} flexWrap="wrap" alignItems="center">
                <Chip
                  label={getFieldTypeLabel(activity.fieldType)}
                  size="small"
                  variant="outlined"
                  sx={{ height: 22 }}
                />
                {isExcludedFromClinicalRedactor(activity) && (
                  <Chip 
                    label="Excluido del redactor" 
                    color="warning" 
                    size="small"
                    sx={{ fontWeight: 'bold', height: 22 }}
                  />
                )}
                {activity.required && (
                  <Chip label="Requerido" color="error" size="small" sx={{ height: 22 }} />
                )}
                {activity.allowMultiple && (
                  <Chip label="Repetible" color="info" size="small" sx={{ height: 22 }} />
                )}
                {activity.measurementUnit && (
                  <Chip
                    label={`Unidad: ${activity.measurementUnit}`}
                    size="small"
                    variant="outlined"
                    sx={{ height: 22 }}
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
                    sx={{ height: 22 }}
                  />
                )}
                {activity.options && activity.options.length > 0 && (
                  <Chip
                    label={`${activity.options.length} opciones`}
                    size="small"
                    variant="outlined"
                    sx={{ height: 22 }}
                  />
                )}
                {activeRulesCount > 0 && (
                  <Chip
                    label={`${activeRulesCount} ${activeRulesCount === 1 ? 'regla' : 'reglas'}`}
                    size="small"
                    variant="outlined"
                    sx={{ height: 22 }}
                  />
                )}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </div>
  );
};

export const VisitConfigPage: React.FC = () => {
  const { protocolId, visitId } = useParams<{ protocolId: string; visitId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [protocolName, setProtocolName] = useState('');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
  const [pasteJson, setPasteJson] = useState('');
  const [pasting, setPasting] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);

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
      setProtocolName(protocol.name);
      
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

  const buildClipboardActivityConfig = (activity: Activity) => {
    const { id, visitId: _visitId, order: _order, ...config } = activity;
    return {
      ...config,
      validationRules: activity.validationRules?.map(({ id: _ruleId, ...rule }) => rule),
    };
  };

  const handleCopyActivityConfig = async (activity: Activity) => {
    try {
      const config = buildClipboardActivityConfig(activity);
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      setError('');
    } catch (err) {
      console.error('Error al copiar configuración:', err);
      setError('No se pudo copiar la configuración. Verificá permisos del navegador para portapapeles.');
    }
  };

  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode((prev) => {
      if (prev) {
        setSelectedActivityIds([]);
      }
      return !prev;
    });
  };

  const handleToggleSelectedActivity = (activityId: string) => {
    setSelectedActivityIds((prev) => {
      if (prev.includes(activityId)) {
        return prev.filter((id) => id !== activityId);
      }
      return [...prev, activityId];
    });
  };

  const handleCopySelectedActivities = async () => {
    if (selectedActivityIds.length === 0) {
      setError('Seleccioná al menos una pregunta para copiar.');
      return;
    }

    const selectedSet = new Set(selectedActivityIds);
    const selectedActivities = activities.filter((activity) => selectedSet.has(activity.id));

    if (selectedActivities.length === 0) {
      setError('No se encontraron preguntas seleccionadas para copiar.');
      return;
    }

    try {
      const configs = selectedActivities.map(buildClipboardActivityConfig);
      await navigator.clipboard.writeText(JSON.stringify(configs, null, 2));
      setPasteJson(JSON.stringify(configs, null, 2));
      setError('');
    } catch (err) {
      console.error('Error al copiar preguntas:', err);
      setError('No se pudieron copiar las preguntas seleccionadas.');
    }
  };

  const handlePasteQuestionClick = async () => {
    setError('');
    let clipboardText = '';
    try {
      if (!navigator.clipboard?.readText) {
        setPasteJson('');
        setPasteDialogOpen(true);
        setError(
          'Tu navegador no permite leer el portapapeles automáticamente. Pegá el JSON manualmente en el cuadro.'
        );
        return;
      }
      clipboardText = await navigator.clipboard.readText();
    } catch (err) {
      console.error('No se pudo leer el portapapeles:', err);
      setPasteJson('');
      setPasteDialogOpen(true);
      setError('No se pudo leer el portapapeles. Pegá el JSON manualmente.');
      return;
    }

    const trimmed = clipboardText?.trim() ?? '';
    if (!trimmed) {
      setPasteJson('');
      setPasteDialogOpen(true);
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      setPasteJson(trimmed);
      setPasteDialogOpen(true);
      return;
    }

    const prepared = tryPreparePasteConfigs(parsed);
    if (!prepared) {
      setPasteJson(trimmed);
      setPasteDialogOpen(true);
      return;
    }

    try {
      setPasting(true);
      setError('');
      for (let index = 0; index < prepared.length; index += 1) {
        const activityData = {
          ...prepared[index],
          order: activities.length + index + 1,
        };
        await protocolService.addActivity(protocolId!, visitId!, activityData);
      }
      await loadVisitData();
      setPasteJson('');
    } catch (err) {
      console.error('Error al pegar configuración:', err);
      setPasteJson(trimmed);
      setPasteDialogOpen(true);
      setError(
        'El JSON parecía válido pero no se pudo crear la pregunta. Revisá el contenido o probá desde el cuadro de texto.'
      );
    } finally {
      setPasting(false);
    }
  };

  const handlePasteActivityConfig = async () => {
    if (!pasteJson.trim()) {
      setError('Pegá un JSON de configuración antes de continuar.');
      return;
    }

    try {
      setPasting(true);
      setError('');
      const parsedConfig = JSON.parse(pasteJson);
      let configsToCreate: Record<string, unknown>[];
      try {
        configsToCreate = normalizePasteConfigs(parsedConfig).map(sanitizePastedActivityConfig);
      } catch {
        setError('El JSON debe contener uno o más objetos de actividad válidos.');
        return;
      }

      if (configsToCreate.length === 0) {
        setError('No hay preguntas para pegar en el JSON.');
        return;
      }

      for (let index = 0; index < configsToCreate.length; index += 1) {
        const activityData = {
          ...configsToCreate[index],
          order: activities.length + index + 1,
        };
        await protocolService.addActivity(protocolId!, visitId!, activityData);
      }

      await loadVisitData();
      setPasteDialogOpen(false);
      setPasteJson('');
    } catch (err) {
      console.error('Error al pegar configuración:', err);
      if (err instanceof SyntaxError) {
        setError('El contenido pegado no es un JSON válido.');
      } else {
        setError('No se pudo crear la actividad con ese JSON. Revisá la configuración e intentá nuevamente.');
      }
    } finally {
      setPasting(false);
    }
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
              {visit?.name ?? 'Cargando...'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {protocolName || 'Cargando...'}
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
              Preview
            </Button>
          )}
          <Button
            variant={isMultiSelectMode ? 'contained' : 'outlined'}
            startIcon={<ChecklistIcon />}
            onClick={toggleMultiSelectMode}
            size="large"
          >
            {isMultiSelectMode ? 'Cancelar' : 'Seleccionar'}
          </Button>
        </Box>
      </Box>

      {/* Botón principal para agregar */}
      <Paper sx={{ p: 3, mb: 3, textAlign: 'center', bgcolor: 'primary.light' }}>
        <Box display="flex" justifyContent="center" gap={2} flexWrap="wrap">
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={handleAddActivity}
          >
            Agregar pregunta
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<PasteIcon />}
            onClick={handlePasteQuestionClick}
            disabled={pasting}
            sx={{
              borderWidth: 2,
              borderStyle: 'solid',
              borderColor: 'primary.dark',
              color: 'common.white',
              bgcolor: 'primary.main',
              '& .MuiButton-startIcon': {
                color: 'inherit',
              },
              '&:hover': {
                color: 'common.white',
                bgcolor: 'primary.dark',
                borderColor: 'primary.dark',
              },
              '&:disabled': {
                color: 'grey.500',
                borderColor: 'action.disabled',
                bgcolor: 'action.disabledBackground',
              },
            }}
          >
            Pegar
          </Button>
        </Box>
      </Paper>

      {/* Lista de campos configurados */}
      {activities.length > 0 && (
        <Box>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
              Campos Configurados ({activities.length})
            </Typography>
            {isMultiSelectMode && (
              <Button
                variant="outlined"
                startIcon={<CopyIcon />}
                onClick={handleCopySelectedActivities}
                disabled={selectedActivityIds.length === 0}
              >
                Copiar seleccionadas ({selectedActivityIds.length})
              </Button>
            )}
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
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {activities.map((activity, index) => (
                  <SortableItem
                    key={activity.id}
                    activity={activity}
                    index={index}
                    onEdit={handleEditActivity}
                    onDelete={handleDeleteActivity}
                    onCopy={handleCopyActivityConfig}
                    isMultiSelectMode={isMultiSelectMode}
                    isSelected={selectedActivityIds.includes(activity.id)}
                    onToggleSelect={handleToggleSelectedActivity}
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

      {/* Dialog para pegar configuración JSON */}
      <Dialog
        open={pasteDialogOpen}
        onClose={() => !pasting && setPasteDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Pegar JSON de Configuración</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Pegá el JSON copiado desde otra actividad. Se creará un nuevo campo en esta visita con esa configuración.
          </Alert>
          <TextField
            fullWidth
            multiline
            minRows={12}
            label="JSON de actividad"
            value={pasteJson}
            onChange={(e) => setPasteJson(e.target.value)}
            placeholder='{"name":"Presión arterial","fieldType":"number_compound","required":true}'
            disabled={pasting}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasteDialogOpen(false)} disabled={pasting}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handlePasteActivityConfig}
            disabled={pasting}
          >
            {pasting ? 'Pegando...' : 'Crear desde JSON'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

