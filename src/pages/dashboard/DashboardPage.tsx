import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import {
  Description as ProtocolIcon,
  Assignment as VisitIcon,
  PendingActions as PendingIcon,
  CheckCircle as CompletedIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalProtocols: 0,
    activeProtocols: 0,
    pendingVisits: 0,
    completedVisits: 0,
  });

  useEffect(() => {
    // TODO: Cargar estadísticas reales desde la API
    setStats({
      totalProtocols: 3,
      activeProtocols: 2,
      pendingVisits: 5,
      completedVisits: 12,
    });
  }, []);

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        Bienvenido, {user?.name}
      </Typography>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
        {/* Estadísticas */}
        <StatCard
          title="Protocolos Totales"
          value={stats.totalProtocols}
          icon={<ProtocolIcon sx={{ fontSize: 32 }} />}
          color="primary.main"
        />
        <StatCard
          title="Protocolos Activos"
          value={stats.activeProtocols}
          icon={<CompletedIcon sx={{ fontSize: 32 }} />}
          color="success.main"
        />
        <StatCard
          title="Visitas Pendientes"
          value={stats.pendingVisits}
          icon={<PendingIcon sx={{ fontSize: 32 }} />}
          color="warning.main"
        />
        <StatCard
          title="Visitas Completadas"
          value={stats.completedVisits}
          icon={<VisitIcon sx={{ fontSize: 32 }} />}
          color="info.main"
        />
      </Box>

      <Box sx={{ display: 'grid', gap: 3, mt: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
        {/* Acciones rápidas */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Acciones Rápidas
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Button
              variant="contained"
              startIcon={<ProtocolIcon />}
              onClick={() => navigate('/protocols/new')}
              fullWidth
            >
              Crear Nuevo Protocolo
            </Button>
            {(user?.role === 'medico' || user?.role === 'investigador_principal') && (
              <Button
                variant="outlined"
                startIcon={<VisitIcon />}
                onClick={() => navigate('/visits/new')}
                fullWidth
              >
                Registrar Nueva Visita
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={() => navigate('/protocols')}
              fullWidth
            >
              Ver Todos los Protocolos
            </Button>
          </Box>
        </Paper>

        {/* Actividad reciente */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Actividad Reciente
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No hay actividad reciente para mostrar.
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* Información del sistema */}
      <Paper sx={{ p: 3, bgcolor: 'info.light', mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Fase 1 - Dashboard de Administración de Protocolos
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Este sistema permite centralizar la información de los protocolos de investigación clínica,
          facilitando la carga, edición y consulta de protocolos. La extracción automatizada de datos
          mediante IA estará disponible próximamente.
        </Typography>
      </Paper>
    </Box>
  );
};

