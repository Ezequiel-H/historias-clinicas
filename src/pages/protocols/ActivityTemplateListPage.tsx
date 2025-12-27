import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import type { ActivityTemplate, Activity } from '../../types';
import activityTemplateService from '../../services/activityTemplateService';

export const ActivityTemplateListPage: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<ActivityTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [templateToView, setTemplateToView] = useState<ActivityTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await activityTemplateService.getTemplates();
      setTemplates(response.data || []);
    } catch (err: any) {
      console.error('Error al cargar plantillas:', err);
      const errorMessage = err?.response?.data?.error || err?.message || 'Error al cargar las plantillas';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;

    try {
      setError('');
      await activityTemplateService.deleteTemplate(templateToDelete);
      setTemplates(templates.filter(t => t.id !== templateToDelete));
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (err) {
      console.error('Error al eliminar plantilla:', err);
      setError('Error al eliminar la plantilla');
    }
  };

  const handleViewTemplate = (template: ActivityTemplate) => {
    setTemplateToView(template);
    setViewDialogOpen(true);
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

  if (loading && templates.length === 0) {
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
          <IconButton onClick={() => navigate('/dashboard')}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Plantillas de Secciones
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gestioná secciones reutilizables de formularios
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/activity-templates/new')}
          size="large"
        >
          Crear Plantilla
        </Button>
      </Box>

      {/* Info */}
      <Alert severity="info" sx={{ mb: 3 }}>
        Las plantillas de secciones te permiten guardar grupos de campos/preguntas que se repiten frecuentemente 
        (como "Información básica de la visita") y aplicarlos rápidamente a nuevas visitas. 
        Cuando aplicás una plantilla, se crean copias de los campos, así podés modificarlos sin afectar la plantilla original.
      </Alert>

      {/* Lista de plantillas */}
      {templates.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: 'center', bgcolor: 'grey.50' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No hay plantillas creadas
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Creá tu primera plantilla para empezar a reutilizar secciones de formularios
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/activity-templates/new')}
          >
            Crear Primera Plantilla
          </Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {templates.map((template) => (
            <Card key={template.id} variant="outlined">
              <CardContent>
                <Box display="flex" alignItems="flex-start" gap={2}>
                  <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography variant="h6" component="div">
                        {template.name}
                      </Typography>
                      <Chip 
                        label={`${template.activities.length} campo${template.activities.length !== 1 ? 's' : ''}`} 
                        size="small" 
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                    {template.description && (
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {template.description}
                      </Typography>
                    )}
                    <Box display="flex" gap={1} flexWrap="wrap" sx={{ mt: 2 }}>
                      {template.activities.slice(0, 5).map((activity: Activity, index: number) => (
                        <Chip
                          key={index}
                          label={`${index + 1}. ${activity.name} (${getFieldTypeLabel(activity.fieldType)})`}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                      {template.activities.length > 5 && (
                        <Chip
                          label={`+${template.activities.length - 5} más`}
                          size="small"
                          variant="outlined"
                          color="secondary"
                        />
                      )}
                    </Box>
                  </Box>
                </Box>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                <Button
                  size="small"
                  startIcon={<CopyIcon />}
                  onClick={() => handleViewTemplate(template)}
                >
                  Ver Detalles
                </Button>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => navigate(`/activity-templates/${template.id}/edit`)}
                >
                  Editar
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => {
                    setTemplateToDelete(template.id);
                    setDeleteDialogOpen(true);
                  }}
                >
                  Eliminar
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      {/* Dialog de confirmación de eliminación */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Está seguro de eliminar esta plantilla? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteDialogOpen(false);
            setTemplateToDelete(null);
          }}>
            Cancelar
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para ver detalles de la plantilla */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {templateToView?.name}
        </DialogTitle>
        <DialogContent>
          {templateToView?.description && (
            <Typography variant="body2" color="text.secondary" paragraph>
              {templateToView.description}
            </Typography>
          )}
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
            Campos incluidos ({templateToView?.activities.length}):
          </Typography>
          <List>
            {templateToView?.activities.map((activity: Activity, index: number) => (
              <ListItem key={index} divider>
                <ListItemText
                  primary={`${index + 1}. ${activity.name}`}
                  secondary={
                    <Box>
                      <Chip 
                        label={getFieldTypeLabel(activity.fieldType)} 
                        size="small" 
                        sx={{ mr: 1 }}
                      />
                      {activity.required && (
                        <Chip label="Requerido" size="small" color="error" />
                      )}
                      {activity.description && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          {activity.description}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};


