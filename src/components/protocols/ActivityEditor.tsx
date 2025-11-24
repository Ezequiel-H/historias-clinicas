import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import type { Activity, FieldType, SelectOption, Visit } from '../../types';

interface ActivityEditorProps {
  visit: Visit;
  onClose: () => void;
  onSave: (activities: Activity[]) => void;
}

interface ActivityFormData {
  name: string;
  description: string;
  fieldType: FieldType;
  required: boolean;
  measurementUnit?: string;
  helpText?: string;
  allowMultiple?: boolean;
  options?: SelectOption[];
}

const FIELD_TYPES: { value: FieldType; label: string; description: string }[] = [
  { value: 'text_short', label: 'Texto Corto', description: 'Campo de texto de una línea' },
  { value: 'text_long', label: 'Texto Largo', description: 'Área de texto multilínea' },
  { value: 'number_simple', label: 'Número Simple', description: 'Campo numérico' },
  { value: 'number_compound', label: 'Número Compuesto', description: 'Ej: Sistólica/Diastólica' },
  { value: 'select_single', label: 'Selección Única', description: 'Lista de opciones (una sola)' },
  { value: 'select_multiple', label: 'Selección Múltiple', description: 'Lista de opciones (varias)' },
  { value: 'boolean', label: 'Sí/No', description: 'Campo booleano' },
  { value: 'datetime', label: 'Fecha y/o Hora', description: 'Selector de fecha, hora o ambos (configurable)' },
  { value: 'file', label: 'Archivo Adjunto', description: 'Subir archivo (PDF, imagen, etc.)' },
  { value: 'conditional', label: 'Campo Condicional', description: 'Se muestra según otra respuesta' },
];

export const ActivityEditor: React.FC<ActivityEditorProps> = ({ visit, onClose, onSave }) => {
  const [activities, setActivities] = useState<Activity[]>(visit.activities || []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [formData, setFormData] = useState<ActivityFormData>({
    name: '',
    description: '',
    fieldType: 'text_short',
    required: false,
  });
  const [optionsText, setOptionsText] = useState('');

  const handleOpenDialog = (activity?: Activity) => {
    if (activity) {
      setEditingActivity(activity);
      setFormData({
        name: activity.name,
        description: activity.description || '',
        fieldType: activity.fieldType,
        required: activity.required,
        measurementUnit: activity.measurementUnit,
        helpText: activity.helpText,
        allowMultiple: activity.allowMultiple,
        options: activity.options,
      });
      if (activity.options) {
        setOptionsText(activity.options.map(o => `${o.value}|${o.label}`).join('\n'));
      }
    } else {
      setEditingActivity(null);
      setFormData({
        name: '',
        description: '',
        fieldType: 'text_short',
        required: false,
      });
      setOptionsText('');
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingActivity(null);
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

  const handleSaveActivity = () => {
    if (!formData.name) {
      return;
    }

    const activityData: Activity = {
      id: editingActivity?.id || `activity-${Date.now()}`,
      visitId: visit.id,
      order: editingActivity?.order || activities.length + 1,
      ...formData,
    };

    // Parsear opciones si es campo de selección
    if ((formData.fieldType === 'select_single' || formData.fieldType === 'select_multiple') && optionsText) {
      activityData.options = parseOptions(optionsText);
    }

    if (editingActivity) {
      setActivities(activities.map(a => a.id === editingActivity.id ? activityData : a));
    } else {
      setActivities([...activities, activityData]);
    }

    handleCloseDialog();
  };

  const handleDeleteActivity = (activityId: string) => {
    if (window.confirm('¿Está seguro de eliminar este campo?')) {
      setActivities(activities.filter(a => a.id !== activityId));
    }
  };

  const handleSaveAll = () => {
    onSave(activities);
    onClose();
  };

  const getFieldTypeLabel = (type: FieldType) => {
    return FIELD_TYPES.find(ft => ft.value === type)?.label || type;
  };

  const sortedActivities = [...activities].sort((a, b) => a.order - b.order);

  const needsOptions = formData.fieldType === 'select_single' || formData.fieldType === 'select_multiple';
  const needsUnit = formData.fieldType === 'number_simple';

  return (
    <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Configurar Campos: {visit.name}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1" fontWeight="bold">
              Campos de la Visita ({activities.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              size="small"
            >
              Agregar Campo
            </Button>
          </Box>

          {activities.length === 0 ? (
            <Alert severity="info">
              No hay campos configurados. Agregá el primer campo para comenzar.
            </Alert>
          ) : (
            <List>
              {sortedActivities.map((activity) => (
                <Paper key={activity.id} sx={{ mb: 1 }}>
                  <ListItem
                    secondaryAction={
                      <Box>
                        <IconButton
                          edge="end"
                          aria-label="editar"
                          onClick={() => handleOpenDialog(activity)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          aria-label="eliminar"
                          onClick={() => handleDeleteActivity(activity.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    }
                  >
                    <DragIcon sx={{ mr: 2, color: 'text.secondary', cursor: 'grab' }} />
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body1" fontWeight="medium">
                            {activity.order}. {activity.name}
                          </Typography>
                          {activity.required && (
                            <Chip label="Requerido" color="error" size="small" />
                          )}
                          {activity.allowMultiple && (
                            <Chip label="Repetible" color="info" size="small" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            Tipo: {getFieldTypeLabel(activity.fieldType)}
                          </Typography>
                          {activity.measurementUnit && (
                            <Typography variant="caption" display="block">
                              Unidad: {activity.measurementUnit}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                </Paper>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSaveAll} variant="contained">
          Guardar Todo
        </Button>
      </DialogActions>

      {/* Dialog para agregar/editar campo */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingActivity ? 'Editar Campo' : 'Nuevo Campo'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Nombre del Campo"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
              placeholder="Ej: Presión Arterial"
            />

            <TextField
              label="Descripción"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
              placeholder="Descripción breve del campo"
            />

            <FormControl fullWidth>
              <InputLabel>Tipo de Campo</InputLabel>
              <Select
                value={formData.fieldType}
                label="Tipo de Campo"
                onChange={(e) => setFormData({ ...formData, fieldType: e.target.value as FieldType })}
              >
                {FIELD_TYPES.map((ft) => (
                  <MenuItem key={ft.value} value={ft.value}>
                    <Box>
                      <Typography variant="body2">{ft.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {ft.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box display="flex" gap={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.required}
                    onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                  />
                }
                label="Campo Requerido"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.allowMultiple || false}
                    onChange={(e) => setFormData({ ...formData, allowMultiple: e.target.checked })}
                  />
                }
                label="Permitir Múltiples Mediciones"
              />
            </Box>

            <Divider />

            {/* Configuraciones específicas por tipo de campo */}
            {needsUnit && (
              <TextField
                label="Unidad de Medida"
                value={formData.measurementUnit || ''}
                onChange={(e) => setFormData({ ...formData, measurementUnit: e.target.value })}
                fullWidth
                placeholder="Ej: mmHg, kg, °C"
              />
            )}

            {needsOptions && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Opciones
                </Typography>
                <TextField
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="Una opción por línea. Formato: valor|etiqueta&#10;Ej:&#10;normal|Normal&#10;anormal|Anormal"
                  helperText="Formato: valor|etiqueta (o solo el texto si valor = etiqueta)"
                />
              </Box>
            )}

            <TextField
              label="Texto de Ayuda (opcional)"
              value={formData.helpText || ''}
              onChange={(e) => setFormData({ ...formData, helpText: e.target.value })}
              fullWidth
              multiline
              rows={2}
              placeholder="Instrucciones para el médico sobre cómo completar este campo"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSaveActivity} variant="contained" disabled={!formData.name}>
            {editingActivity ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

