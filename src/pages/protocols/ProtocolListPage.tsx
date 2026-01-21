import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Upload as UploadIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import type { Protocol } from '../../types';
import protocolService from '../../services/protocolService';

export const ProtocolListPage: React.FC = () => {
  const navigate = useNavigate();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [protocolToDelete, setProtocolToDelete] = useState<Protocol | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);

  useEffect(() => {
    loadProtocols();
  }, []);

  const loadProtocols = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await protocolService.getProtocols();
      setProtocols(response.data);
    } catch (err) {
      setError('Error al cargar los protocolos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!protocolToDelete) return;

    try {
      setDeleting(true);
      await protocolService.deleteProtocol(protocolToDelete.id);
      setProtocols(protocols.filter(p => p.id !== protocolToDelete.id));
      setDeleteDialogOpen(false);
      setProtocolToDelete(null);
    } catch (err) {
      setError('Error al eliminar el protocolo');
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (protocol: Protocol) => {
    setProtocolToDelete(protocol);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setProtocolToDelete(null);
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

  const filteredProtocols = protocols.filter(
    (protocol) =>
      protocol.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      protocol.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      protocol.sponsor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          Gestión de Protocolos
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setGenerateDialogOpen(true)}
          >
            Generar desde Sistemática
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/protocols/new')}
          >
            Nuevo Protocolo
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Buscar por nombre, código o sponsor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Código</strong></TableCell>
              <TableCell><strong>Nombre</strong></TableCell>
              <TableCell><strong>Sponsor</strong></TableCell>
              <TableCell><strong>Estado</strong></TableCell>
              <TableCell><strong>Última Actualización</strong></TableCell>
              <TableCell align="center"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredProtocols.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                  <Typography color="text.secondary">
                    {searchTerm ? 'No se encontraron protocolos' : 'No hay protocolos registrados'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredProtocols.map((protocol) => (
                <TableRow 
                  key={protocol.id} 
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/protocols/${protocol.id}/edit`)}
                >
                  <TableCell>{protocol.code}</TableCell>
                  <TableCell>{protocol.name}</TableCell>
                  <TableCell>{protocol.sponsor}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(protocol.status)}
                      color={getStatusColor(protocol.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatDate(protocol.updatedAt)}</TableCell>
                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => openDeleteDialog(protocol)}
                      title="Eliminar"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de confirmación de eliminación */}
      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Está seguro que desea eliminar el protocolo <strong>{protocolToDelete?.name}</strong>?
            Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} disabled={deleting}>
            Cancelar
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? <CircularProgress size={24} /> : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para generar protocolo desde sistemática */}
      <Dialog open={generateDialogOpen} onClose={() => !generating && setGenerateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <DescriptionIcon />
            <Typography variant="h6">Generar Protocolo desde Sistemática</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Sube un documento de sistemática (PDF o DOCX) y el sistema generará automáticamente un protocolo
            con todas las visitas y actividades necesarias usando inteligencia artificial.
          </DialogContentText>
          
          <input
            accept=".pdf,.doc,.docx"
            style={{ display: 'none' }}
            id="systematic-file-upload"
            type="file"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              try {
                setGenerating(true);
                setError('');
                setGeneratingProgress(0);

                const response = await protocolService.generateProtocolFromSystematic(
                  file,
                  setGeneratingProgress
                );

                if (response.success && response.data) {
                  // Recargar protocolos
                  await loadProtocols();
                  setGenerateDialogOpen(false);
                  setGeneratingProgress(0);
                  // Mostrar mensaje de éxito
                  setError(''); // Limpiar error si existe
                  // Podríamos agregar un toast de éxito aquí
                } else {
                  setError(response.error || 'Error al generar el protocolo');
                }
              } catch (err: any) {
                console.error('Error al generar protocolo:', err);
                setError(
                  err.response?.data?.error ||
                    err.message ||
                    'Error al generar el protocolo. Por favor intenta nuevamente.'
                );
              } finally {
                setGenerating(false);
                setGeneratingProgress(0);
              }
            }}
            disabled={generating}
          />
          <label htmlFor="systematic-file-upload">
            <Button
              variant="outlined"
              component="span"
              startIcon={<UploadIcon />}
              disabled={generating}
              fullWidth
              sx={{ mb: 2 }}
            >
              Seleccionar Archivo de Sistemática
            </Button>
          </label>

          {generating && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={generatingProgress} />
              <Typography variant="caption" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                Procesando archivo... {generatingProgress}%
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setGenerateDialogOpen(false)}
            disabled={generating}
          >
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

