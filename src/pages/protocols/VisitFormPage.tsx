import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import protocolService from '../../services/protocolService';

export const VisitFormPage: React.FC = () => {
  const { protocolId, visitId } = useParams<{ protocolId: string; visitId: string }>();
  const navigate = useNavigate();
  const isEditMode = visitId !== 'new';

  const [name, setName] = useState('');
  const [type, setType] = useState<'presencial' | 'telefonica' | 'no_programada'>('presencial');
  const [order, setOrder] = useState(1);
  const [allVisits, setAllVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (protocolId) {
      loadProtocolData();
    }
  }, [protocolId]);

  useEffect(() => {
    if (isEditMode && protocolId && visitId) {
      loadVisitData();
    }
  }, [isEditMode, visitId, protocolId]);

  const loadProtocolData = async () => {
    try {
      const response = await protocolService.getProtocolById(protocolId!);
      const protocol = response.data;
      setAllVisits(protocol.visits || []);
    } catch (err) {
      console.error('Error al cargar protocolo:', err);
    }
  };

  const loadVisitData = async () => {
    try {
      setLoadingData(true);
      setError('');
      
      // Cargar el protocolo completo para obtener los datos de la visita
      const response = await protocolService.getProtocolById(protocolId!);
      const protocol = response.data;
      setAllVisits(protocol.visits || []);
      
      // Buscar la visita específica
      const visit = protocol.visits.find((v) => v.id === visitId);
      
      if (visit) {
        setName(visit.name);
        setType(visit.type);
        // Calcular el orden basado en la posición en la lista ordenada
        const sortedVisits = [...protocol.visits].sort((a, b) => a.order - b.order);
        const visitIndex = sortedVisits.findIndex((v) => v.id === visitId);
        setOrder(visitIndex >= 0 ? visitIndex + 1 : visit.order);
      } else {
        setError('Visita no encontrada');
      }
    } catch (err) {
      console.error('Error al cargar visita:', err);
      setError('Error al cargar los datos de la visita');
    } finally {
      setLoadingData(false);
    }
  };

  // Calcular el orden automáticamente basado en la posición en la lista
  const currentOrder = useMemo(() => {
    if (isEditMode && visitId) {
      // En modo edición, calcular basado en la posición actual
      const sortedVisits = [...allVisits].sort((a, b) => a.order - b.order);
      const visitIndex = sortedVisits.findIndex((v) => v.id === visitId);
      return visitIndex >= 0 ? visitIndex + 1 : allVisits.length + 1;
    } else {
      // En modo creación, el orden será el siguiente disponible
      const sortedVisits = [...allVisits].sort((a, b) => a.order - b.order);
      return sortedVisits.length + 1;
    }
  }, [allVisits, isEditMode, visitId]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('El nombre de la visita es obligatorio');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const visitData = {
        name,
        type,
        order: currentOrder, // Usar el orden calculado automáticamente
      };

      if (isEditMode && visitId) {
        // Actualizar visita existente
        await protocolService.updateVisit(protocolId!, visitId, visitData);
      } else {
        // Crear nueva visita
        await protocolService.addVisit(protocolId!, visitData);
      }

      // Recargar los datos del protocolo para actualizar el orden
      await loadProtocolData();

      // Volver a la página de edición del protocolo
      navigate(`/protocols/${protocolId}/edit`);
    } catch (err) {
      console.error('Error al guardar visita:', err);
      setError('Error al guardar la visita. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
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
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate(`/protocols/${protocolId}/edit`)}
        sx={{ mb: 2 }}
      >
        Volver al Protocolo
      </Button>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          {isEditMode ? 'Editar Visita' : 'Nueva Visita'}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
          Protocolo: {protocolId}
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          Configurá la información básica de la visita. Luego podrás agregar los campos y preguntas que los médicos completarán.
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Nombre de la Visita"
            fullWidth
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Visita de Screening, Visita de Seguimiento"
            helperText="Nombre descriptivo para identificar esta visita"
          />

          <FormControl fullWidth required>
            <InputLabel>Tipo de Visita</InputLabel>
            <Select
              value={type}
              label="Tipo de Visita"
              onChange={(e) => setType(e.target.value as any)}
            >
              <MenuItem value="presencial">Presencial</MenuItem>
              <MenuItem value="telefonica">Telefónica</MenuItem>
              <MenuItem value="no_programada">No Programada</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Orden"
            type="number"
            fullWidth
            required
            value={currentOrder}
            disabled
            helperText="El orden se calcula automáticamente según la posición en la lista de visitas"
            inputProps={{ min: 1 }}
          />

          <Divider sx={{ my: 2 }} />

          <Box display="flex" gap={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              startIcon={<BackIcon />}
              onClick={() => navigate(`/protocols/${protocolId}/edit`)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={!name.trim() || loading}
            >
              {isEditMode ? 'Actualizar Visita' : 'Crear Visita'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};


