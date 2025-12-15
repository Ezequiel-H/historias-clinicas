import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CloudUpload as CloudUploadIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { authService } from '../../services/authService';
import type { User } from '../../types';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.getAllUsers();
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        setError((response as any).error || response.message || 'Error al cargar los usuarios');
      }
    } catch (err: any) {
      console.error('Error al cargar usuarios:', err);
      setError(err?.response?.data?.error || 'Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleActive = async (user: User) => {
    // No permitir cambiar estado de admins
    if (user.role === 'admin') {
      setError('No se puede cambiar el estado de un administrador');
      return;
    }

    const newIsActive = !user.isActive;
    
    try {
      setUpdating(prev => new Set(prev).add(user.id));
      setError(null);
      
      const response = await authService.updateUserStatus(user.id, newIsActive);
      
      if (response.success && response.data) {
        // Update the user in the list
        setUsers(prevUsers =>
          prevUsers.map(u => (u.id === user.id ? response.data : u))
        );
      } else {
        setError((response as any).error || response.message || 'Error al actualizar el estado del usuario');
      }
    } catch (err: any) {
      console.error('Error al actualizar usuario:', err);
      setError(err?.response?.data?.error || 'Error al actualizar el estado del usuario');
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev);
        newSet.delete(user.id);
        return newSet;
      });
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      doctor: 'Médico',
      investigador_principal: 'Investigador Principal',
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      admin: 'error',
      doctor: 'primary',
      investigador_principal: 'info',
    };
    return colors[role] || 'default';
  };

  const handleOpenSignatureDialog = (user: User) => {
    setSelectedUser(user);
    setPhotoPreview(user.sealSignaturePhoto || null);
    setPhotoError('');
    setSignatureDialogOpen(true);
  };

  const handleCloseSignatureDialog = () => {
    setSignatureDialogOpen(false);
    setSelectedUser(null);
    setPhotoPreview(null);
    setPhotoError('');
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoError('Por favor, seleccione una foto');
      return;
    }

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      setPhotoError('Por favor, seleccione un archivo de imagen válido');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('La imagen no debe superar los 5MB');
      return;
    }

    // Convertir a base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPhotoPreview(base64String);
      setPhotoError('');
    };
    reader.onerror = () => {
      setPhotoError('Error al leer la imagen');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSignaturePhoto = async () => {
    if (!selectedUser || !photoPreview) {
      setPhotoError('Por favor, seleccione una foto');
      return;
    }

    setUploadingPhoto(true);
    setPhotoError('');

    try {
      const response = await authService.updateUserSignaturePhoto(selectedUser.id, photoPreview);
      
      if (response.success && response.data) {
        // Update the user in the list
        setUsers(prevUsers =>
          prevUsers.map(u => (u.id === selectedUser.id ? response.data : u))
        );
        handleCloseSignatureDialog();
      } else {
        setPhotoError((response as any).error || response.message || 'Error al actualizar la foto de firma');
      }
    } catch (err: any) {
      console.error('Error al actualizar foto de firma:', err);
      setPhotoError(err?.response?.data?.error || 'Error al actualizar la foto de firma');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Gestión de Usuarios
        </Typography>
        <Tooltip title="Actualizar lista">
          <IconButton onClick={loadUsers} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Número de Licencia</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell align="center">Estado</TableCell>
                <TableCell align="center">Foto de Firma</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                      No hay usuarios registrados
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Typography variant="body1" fontWeight={500}>
                        {user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Sin nombre'}
                      </Typography>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.licenseNumber || (
                        <Typography variant="body2" color="text.secondary">
                          N/A
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleLabel(user.role)}
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                        {updating.has(user.id) ? (
                          <CircularProgress size={24} />
                        ) : (
                          <>
                            <Typography variant="body2" sx={{ minWidth: 70, textAlign: 'right' }}>
                              {user.isActive ? 'Activo' : 'Inactivo'}
                            </Typography>
                            <Switch
                              checked={user.isActive}
                              onChange={() => handleToggleActive(user)}
                              color="primary"
                              disabled={updating.has(user.id) || user.role === 'admin'}
                            />
                          </>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      {user.role === 'doctor' ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                          {user.sealSignaturePhoto ? (
                            <Tooltip title="Ver foto de firma">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenSignatureDialog(user)}
                                color="primary"
                              >
                                <Avatar
                                  src={user.sealSignaturePhoto}
                                  alt="Foto de firma"
                                  sx={{ width: 32, height: 32 }}
                                />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Tooltip title="No hay foto de firma">
                              <IconButton
                                size="small"
                                disabled
                                color="default"
                              >
                                <ImageIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title={user.sealSignaturePhoto ? "Cambiar foto de firma" : "Subir foto de firma"}>
                            <IconButton
                              size="small"
                              onClick={() => handleOpenSignatureDialog(user)}
                              color="primary"
                            >
                              <CloudUploadIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          N/A
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialog para subir/cambiar foto de firma */}
      <Dialog
        open={signatureDialogOpen}
        onClose={handleCloseSignatureDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedUser?.sealSignaturePhoto ? 'Cambiar Foto de Firma' : 'Subir Foto de Firma'}
          {selectedUser && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {selectedUser.name || `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim()}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {photoError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPhotoError('')}>
              {photoError}
            </Alert>
          )}

          <Box sx={{ mb: 2 }}>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="signature-photo-upload"
              type="file"
              onChange={handlePhotoChange}
              disabled={uploadingPhoto}
            />
            <label htmlFor="signature-photo-upload">
              <Button
                variant="outlined"
                component="span"
                fullWidth
                startIcon={<CloudUploadIcon />}
                disabled={uploadingPhoto}
                sx={{ mb: 2 }}
              >
                {photoPreview ? 'Cambiar Foto' : 'Seleccionar Foto'}
              </Button>
            </label>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Suba una foto de sello y firma médica (máximo 5MB)
            </Typography>
          </Box>

          {photoPreview && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                mt: 2,
              }}
            >
              <img
                src={photoPreview}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '300px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSignatureDialog} disabled={uploadingPhoto}>
            Cancelar
          </Button>
          <Button
            onClick={handleSaveSignaturePhoto}
            variant="contained"
            disabled={!photoPreview || uploadingPhoto}
            startIcon={uploadingPhoto ? <CircularProgress size={16} /> : null}
          >
            {uploadingPhoto ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

