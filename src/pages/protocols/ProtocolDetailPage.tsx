import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Edit as EditIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import type { Protocol } from '../../types';
import protocolService from '../../services/protocolService';

export const ProtocolDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadProtocol(id);
    }
  }, [id]);

  const loadProtocol = async (protocolId: string) => {
    try {
      setLoading(true);
      setError('');
      const response = await protocolService.getProtocolById(protocolId);
      setProtocol(response.data);
    } catch (err) {
      setError('Error al cargar el protocolo');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'draft':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'inactive':
        return 'Inactivo';
      case 'draft':
        return 'Borrador';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !protocol) {
    return (
      <Box>
        <Alert severity="error">{error || 'Protocolo no encontrado'}</Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/protocols')}
          sx={{ mt: 2 }}
        >
          Volver a Protocolos
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<BackIcon />}
            onClick={() => navigate('/protocols')}
            variant="outlined"
          >
            Volver
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            Detalle del Protocolo
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/protocols/${protocol.id}/edit`)}
        >
          Editar
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h5" gutterBottom>
              {protocol.name}
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Código: <strong>{protocol.code}</strong>
            </Typography>
          </Box>
          <Chip
            label={getStatusLabel(protocol.status)}
            color={getStatusColor(protocol.status)}
            size="medium"
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Sponsor / Farmacéutica
            </Typography>
            <Typography variant="body1" gutterBottom>
              {protocol.sponsor}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Última Actualización
            </Typography>
            <Typography variant="body1" gutterBottom>
              {formatDate(protocol.updatedAt)}
            </Typography>
          </Box>

          <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
            <Typography variant="subtitle2" color="text.secondary">
              Descripción
            </Typography>
            <Typography variant="body1" gutterBottom>
              {protocol.description}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Fecha de Creación
            </Typography>
            <Typography variant="body1">
              {formatDate(protocol.createdAt)}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Visitas ({protocol.visits.length})
            </Typography>
            {protocol.visits.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No hay visitas configuradas para este protocolo.
              </Typography>
            ) : (
              <List>
                {protocol.visits.map((visit) => (
                  <ListItem key={visit.id}>
                    <ListItemText
                      primary={visit.name}
                      secondary={`Tipo: ${visit.type} | Orden: ${visit.order}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Reglas Clínicas ({protocol.clinicalRules.length})
            </Typography>
            {protocol.clinicalRules.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No hay reglas clínicas configuradas para este protocolo.
              </Typography>
            ) : (
              <List>
                {protocol.clinicalRules.map((rule) => (
                  <ListItem key={rule.id}>
                    <ListItemText
                      primary={rule.name}
                      secondary={rule.errorMessage}
                    />
                    <Chip
                      label={rule.isActive ? 'Activa' : 'Inactiva'}
                      color={rule.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

