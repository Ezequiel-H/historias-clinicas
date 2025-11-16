import React from 'react';
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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import type { Visit } from '../../types';

interface VisitManagerProps {
  protocolId: string;
  visits: Visit[];
  onVisitsChange: (visits: Visit[]) => void;
}

export const VisitManager: React.FC<VisitManagerProps> = ({
  protocolId,
  visits,
  onVisitsChange,
}) => {
  const navigate = useNavigate();

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

  const sortedVisits = [...visits].sort((a, b) => a.order - b.order);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Visitas del Protocolo</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddVisit}
        >
          Agregar Visita
        </Button>
      </Box>

      {visits.length === 0 ? (
        <Alert severity="info">
          No hay visitas configuradas. Agregá la primera visita para comenzar.
        </Alert>
      ) : (
        <List>
          {sortedVisits.map((visit) => (
            <Paper key={visit.id} sx={{ mb: 2 }}>
              <ListItem
                secondaryAction={
                  <Box>
                    <IconButton
                      edge="end"
                      aria-label="configurar"
                      onClick={() => navigate(`/protocols/${protocolId}/visits/${visit.id}/edit`)}
                      sx={{ mr: 1 }}
                      color="primary"
                    >
                      <SettingsIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="editar"
                      onClick={() => handleEditVisit(visit.id)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="eliminar"
                      onClick={() => handleDeleteVisit(visit.id)}
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
          ))}
        </List>
      )}
    </Box>
  );
};

