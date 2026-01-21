import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Divider,
  LinearProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import type { ProtocolFormData, Visit } from '../../types';
import protocolService from '../../services/protocolService';
import { VisitManager } from '../../components/protocols/VisitManager';

export const ProtocolFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = id !== undefined && id !== 'new';
  
  const { control, handleSubmit, setValue, formState: { errors } } = useForm<ProtocolFormData>({
    defaultValues: {
      name: '',
      code: '',
      sponsor: '',
      description: '',
      status: 'draft',
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [tabValue, setTabValue] = useState(isEditMode ? 1 : 0);
  const [visits, setVisits] = useState<Visit[]>([]);

  useEffect(() => {
    if (isEditMode && id) {
      loadProtocol(id);
    }
  }, [id, isEditMode]);

  const loadProtocol = async (protocolId: string) => {
    try {
      setLoading(true);
      const response = await protocolService.getProtocolById(protocolId);
      const protocol = response.data;
      setValue('name', protocol.name);
      setValue('code', protocol.code);
      setValue('sponsor', protocol.sponsor);
      setValue('description', protocol.description);
      setValue('status', protocol.status);
      setVisits(protocol.visits || []);
    } catch (err) {
      setError('Error al cargar el protocolo');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVisitsChange = (updatedVisits: Visit[]) => {
    setVisits(updatedVisits);
  };

  const onSubmit = async (data: ProtocolFormData) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      if (isEditMode && id) {
        await protocolService.updateProtocol(id, data);
        setSuccess('Protocolo actualizado exitosamente');
      } else {
        await protocolService.createProtocol(data);
        setSuccess('Protocolo creado exitosamente');
      }

      setTimeout(() => {
        navigate('/protocols');
      }, 1500);
    } catch (err) {
      setError('Error al guardar el protocolo');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError('');
      setUploadProgress(0);

      const response = await protocolService.extractProtocolData(file, setUploadProgress);
      
      if (response.data) {
        setValue('name', response.data.name || '');
        setValue('code', response.data.code || '');
        setValue('sponsor', response.data.sponsor || '');
        setValue('description', response.data.description || '');
        setValue('status', response.data.status || 'draft');
        
        setSuccess(response.message || 'Datos extraídos exitosamente');
      }
    } catch (err) {
      setError('Error al extraer datos del documento');
      console.error(err);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  if (loading && isEditMode) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          {isEditMode ? 'Editar Protocolo' : 'Nuevo Protocolo'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {!isEditMode && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'info.light' }}>
          <Typography variant="h6" gutterBottom>
            Extracción Automatizada de Datos
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Puede cargar un documento de protocolo (PDF, Word, etc.) y el sistema extraerá
            automáticamente la información relevante usando procesamiento automatizado.
          </Typography>
          <Box>
            <input
              accept=".pdf,.doc,.docx"
              style={{ display: 'none' }}
              id="protocol-file-upload"
              type="file"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <label htmlFor="protocol-file-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<UploadIcon />}
                disabled={uploading}
              >
                Cargar Documento de Protocolo
              </Button>
            </label>
          </Box>
          {uploading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="caption" sx={{ mt: 1 }}>
                Extrayendo datos... {uploadProgress}%
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      <Paper sx={{ p: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Información Básica" />
            <Tab label="Visitas y Campos" />
          </Tabs>
        </Box>

        {tabValue === 0 && (
          <form onSubmit={handleSubmit(onSubmit)}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
                <Controller
                  name="code"
                  control={control}
                  rules={{ required: 'El código es requerido' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Código del Protocolo"
                      fullWidth
                      error={!!errors.code}
                      helperText={errors.code?.message}
                      disabled={loading}
                    />
                  )}
                />

                <Controller
                  name="status"
                  control={control}
                  rules={{ required: 'El estado es requerido' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.status}>
                      <InputLabel>Estado</InputLabel>
                      <Select {...field} label="Estado" disabled={loading}>
                        <MenuItem value="draft">Borrador</MenuItem>
                        <MenuItem value="active">Activo</MenuItem>
                        <MenuItem value="inactive">Inactivo</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Box>

              <Controller
                name="name"
                control={control}
                rules={{ required: 'El nombre es requerido' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Nombre del Protocolo"
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    disabled={loading}
                  />
                )}
              />

              <Controller
                name="sponsor"
                control={control}
                rules={{ required: 'El sponsor es requerido' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Sponsor / Farmacéutica"
                    fullWidth
                    error={!!errors.sponsor}
                    helperText={errors.sponsor?.message}
                    disabled={loading}
                  />
                )}
              />

              <Controller
                name="description"
                control={control}
                rules={{ required: 'La descripción es requerida' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Descripción"
                    fullWidth
                    multiline
                    rows={4}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                    disabled={loading}
                  />
                )}
              />

              <Divider />
              
              <Box display="flex" gap={2} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={() => navigate('/protocols')}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                  disabled={loading}
                >
                  {isEditMode ? 'Actualizar' : 'Crear'} Protocolo
                </Button>
              </Box>
            </Box>
          </form>
        )}

        {tabValue === 1 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              {isEditMode 
                ? 'Configurá las visitas y los campos que se deben completar en cada visita. Esta configuración determinará el formulario que verán los médicos al cargar visitas.'
                : 'Podés configurar las visitas ahora o hacerlo después editando el protocolo. Las visitas y sus campos determinarán el formulario que verán los médicos al cargar visitas.'
              }
            </Alert>
            <VisitManager
              protocolId={id || 'new'}
              visits={visits}
              onVisitsChange={handleVisitsChange}
            />
            {!isEditMode && visits.length > 0 && (
              <Alert severity="success" sx={{ mt: 3 }}>
                Has configurado {visits.length} visita{visits.length > 1 ? 's' : ''}. 
                Se guardarán cuando crees el protocolo.
              </Alert>
            )}
            {!isEditMode && (
              <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={() => navigate('/protocols')}
                >
                  Cancelar
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSubmit(onSubmit)}
                  disabled={loading}
                >
                  Crear Protocolo {visits.length > 0 ? `(con ${visits.length} visita${visits.length > 1 ? 's' : ''})` : ''}
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

