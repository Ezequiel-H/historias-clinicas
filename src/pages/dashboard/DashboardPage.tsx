import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Assignment as VisitIcon,
  CheckCircle as CompletedIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  ErrorOutline as ErrorIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { statsService, type DashboardStats } from '../../services/statsService';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="body2">
            {title}
          </Typography>
          <Typography variant="h4" component="div">
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            bgcolor: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await statsService.getDashboardStats();
        if (response.success && response.data) {
          setStats(response.data);
        } else {
          setError('Error al cargar las estadísticas');
        }
      } catch (err) {
        console.error('Error al cargar estadísticas:', err);
        setError('Error al cargar las estadísticas');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </Box>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        Bienvenido, {user?.name}
      </Typography>

      {/* Métricas principales */}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
        <StatCard
          title="Protocolos Activos"
          value={stats.protocols.active}
          icon={<CompletedIcon sx={{ fontSize: 32 }} />}
          color="success.main"
        />
        <StatCard
          title="Usuarios Activos"
          value={stats.users.active}
          icon={<PeopleIcon sx={{ fontSize: 32 }} />}
          color="secondary.main"
        />
        <StatCard
          title="Doctores Activos"
          value={stats.users.doctors}
          icon={<PeopleIcon sx={{ fontSize: 32 }} />}
          color="success.main"
        />
        <StatCard
          title="Investigadores"
          value={stats.users.investigadores}
          icon={<TrendingUpIcon sx={{ fontSize: 32 }} />}
          color="primary.main"
        />
      </Box>

      <Box sx={{ display: 'grid', gap: 3, mt: 3, gridTemplateColumns: { xs: '1fr', md: '1fr' } }}>
        {/* Top Sponsors */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Principales Sponsors
          </Typography>
          {stats.topSponsors.length > 0 ? (
            <Box sx={{ mt: 2 }}>
              {stats.topSponsors.map((item, index) => (
                <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="body2">{item.sponsor}</Typography>
                  <Chip label={item.count} size="small" color="primary" />
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              No hay sponsors registrados.
            </Typography>
          )}
        </Paper>
      </Box>

      {/* Sección preparada para métricas futuras de médicos */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Estadísticas de Médicos
        </Typography>
        <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
          Esta sección mostrará métricas de actividad de los médicos una vez que se implemente la interfaz de completado de formularios.
        </Alert>
        
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
          {/* Visitas por médico - Última semana */}
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <VisitIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Visitas Completadas (Última Semana)</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Número de visitas completadas por cada médico en los últimos 7 días
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Médico</TableCell>
                      <TableCell align="right">Visitas</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={2} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          Los datos aparecerán aquí cuando los médicos comiencen a completar formularios
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Errores por médico - Última semana */}
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ErrorIcon sx={{ mr: 1, color: 'error.main' }} />
                <Typography variant="h6">Errores Cometidos (Última Semana)</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Cantidad de errores de validación detectados por médico
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Médico</TableCell>
                      <TableCell align="right">Errores</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={2} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          Los datos aparecerán aquí cuando se detecten errores en los formularios
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Tiempo promedio de completado */}
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TimeIcon sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="h6">Tiempo Promedio de Completado</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Tiempo promedio que tarda cada médico en completar un formulario
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Médico</TableCell>
                      <TableCell align="right">Tiempo Promedio</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={2} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          Los datos aparecerán aquí cuando se registren tiempos de completado
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Protocolos en progreso por médico */}
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">Protocolos en Progreso</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Cantidad de protocolos en los que cada médico está trabajando activamente
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Médico</TableCell>
                      <TableCell align="right">Protocolos</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={2} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          Los datos aparecerán aquí cuando los médicos comiencen a trabajar en protocolos
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      </Paper>
    </Box>
  );
};

