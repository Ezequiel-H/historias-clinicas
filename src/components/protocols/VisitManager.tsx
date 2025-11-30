import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  DragIndicator as DragIcon,
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
import type { Visit } from '../../types';
import protocolService from '../../services/protocolService';

interface VisitManagerProps {
  protocolId: string;
  visits: Visit[];
  onVisitsChange: (visits: Visit[]) => void;
}

// Componente SortableItem para cada visita
interface SortableVisitItemProps {
  visit: Visit;
  protocolId: string;
  onEdit: (visitId: string) => void;
  onDelete: (visitId: string) => void;
  getVisitTypeLabel: (type: string) => string;
  getVisitTypeColor: (type: string) => "default" | "primary" | "secondary" | "success" | "error" | "info" | "warning";
  isReordering: boolean;
}

const SortableVisitItem: React.FC<SortableVisitItemProps> = ({
  visit,
  protocolId,
  onEdit,
  onDelete,
  getVisitTypeLabel,
  getVisitTypeColor,
  isReordering,
}) => {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: visit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Paper sx={{ mb: 2 }}>
        <ListItem
          secondaryAction={
            <Box>
              <IconButton
                edge="end"
                aria-label="configurar"
                onClick={() => navigate(`/protocols/${protocolId}/visits/${visit.id}/edit`)}
                sx={{ mr: 1 }}
                color="primary"
                disabled={isDragging || isReordering}
              >
                <SettingsIcon />
              </IconButton>
              <IconButton
                edge="end"
                aria-label="editar"
                onClick={() => onEdit(visit.id)}
                sx={{ mr: 1 }}
                disabled={isDragging || isReordering}
              >
                <EditIcon />
              </IconButton>
              <IconButton
                edge="end"
                aria-label="eliminar"
                onClick={() => onDelete(visit.id)}
                color="error"
                disabled={isDragging || isReordering}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          }
        >
          <DragIcon
            sx={{
              mr: 2,
              color: 'text.secondary',
              cursor: 'grab',
              '&:active': { cursor: 'grabbing' },
            }}
            {...attributes}
            {...listeners}
          />
          <ListItemText
            primary={
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {visit.order}. {visit.name}
                </Typography>
                <Chip
                  label={getVisitTypeLabel(visit.type)}
                  color={getVisitTypeColor(visit.type)}
                  size="small"
                />
                <Chip
                  label={`${visit.activities?.length || 0} campos`}
                  size="small"
                  variant="outlined"
                />
              </Box>
            }
            secondary={null}
          />
        </ListItem>
      </Paper>
    </div>
  );
};

export const VisitManager: React.FC<VisitManagerProps> = ({
  protocolId,
  visits,
  onVisitsChange,
}) => {
  const navigate = useNavigate();
  const [isReordering, setIsReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddVisit = () => {
    navigate(`/protocols/${protocolId}/visits/new`);
  };

  const handleEditVisit = (visitId: string) => {
    navigate(`/protocols/${protocolId}/visits/${visitId}`);
  };

  const handleDeleteVisit = (visitId: string) => {
    if (window.confirm('¿Está seguro de eliminar esta visita?')) {
      onVisitsChange(visits.filter((v) => v.id !== visitId));
    }
  };

  const getVisitTypeLabel = (type: string) => {
    switch (type) {
      case 'presencial':
        return 'Presencial';
      case 'telefonica':
        return 'Telefónica';
      case 'no_programada':
        return 'No Programada';
      default:
        return type;
    }
  };

  const getVisitTypeColor = (type: string): "default" | "primary" | "secondary" | "success" | "error" | "info" | "warning" => {
    switch (type) {
      case 'presencial':
        return 'primary';
      case 'telefonica':
        return 'info';
      case 'no_programada':
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleDragEnd = async (event: {
    active: { id: string | number };
    over: { id: string | number } | null;
  }) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const sortedVisits = [...visits].sort((a, b) => a.order - b.order);
    const oldIndex = sortedVisits.findIndex((v) => v.id === active.id);
    const newIndex = sortedVisits.findIndex((v) => v.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Actualizar el orden localmente
    const newVisits = arrayMove(sortedVisits, oldIndex, newIndex);
    
    // Actualizar el orden basado en la posición en la lista
    const updatedVisits = newVisits.map((visit, index) => ({
      ...visit,
      order: index + 1,
    }));

    // Si estamos en modo edición (protocolId no es 'new'), actualizar en el backend
    if (protocolId !== 'new') {
      try {
        setIsReordering(true);
        
        // Actualizar el orden de todas las visitas de una vez
        const visitsOrder = updatedVisits.map((visit) => ({
          visitId: visit.id,
          order: visit.order,
        }));

        await protocolService.updateVisitsOrder(protocolId, visitsOrder);
        onVisitsChange(updatedVisits);
      } catch (err) {
        console.error('Error al actualizar el orden:', err);
        // Revertir el cambio local
        onVisitsChange(visits);
      } finally {
        setIsReordering(false);
      }
    } else {
      // En modo creación, solo actualizar localmente
      onVisitsChange(updatedVisits);
    }
  };

  const sortedVisits = [...visits].sort((a, b) => a.order - b.order);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h6">Visitas del Protocolo</Typography>
          {isReordering && (
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={16} />
              <Typography variant="caption" color="text.secondary">
                Actualizando orden...
              </Typography>
            </Box>
          )}
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddVisit}
          disabled={isReordering}
        >
          Agregar Visita
        </Button>
      </Box>

      {visits.length === 0 ? (
        <Alert severity="info">
          No hay visitas configuradas. Agregá la primera visita para comenzar.
        </Alert>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedVisits.map((v) => v.id)}
            strategy={verticalListSortingStrategy}
          >
            <List>
              {sortedVisits.map((visit) => (
                <SortableVisitItem
                  key={visit.id}
                  visit={visit}
                  protocolId={protocolId}
                  onEdit={handleEditVisit}
                  onDelete={handleDeleteVisit}
                  getVisitTypeLabel={getVisitTypeLabel}
                  getVisitTypeColor={getVisitTypeColor}
                  isReordering={isReordering}
                />
              ))}
            </List>
          </SortableContext>
        </DndContext>
      )}
    </Box>
  );
};

