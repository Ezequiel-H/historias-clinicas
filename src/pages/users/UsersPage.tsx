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
} from '@mui/material';
import {
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { authService } from '../../services/authService';
import type { User } from '../../types';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Set<string>>(new Set());

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
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

