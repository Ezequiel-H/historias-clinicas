import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckIcon,
  LocalHospital as HospitalIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const DoctorDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        Bienvenido, Dr. {user?.firstName} {user?.lastName}
      </Typography>

      {!user?.isActive && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Su cuenta está pendiente de aprobación. Un administrador revisará su registro y activará su cuenta pronto.
        </Alert>
      )}

      {user?.isActive && (
        <>
          {/* Información del médico */}
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, mb: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <HospitalIcon sx={{ mr: 2, fontSize: 40, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Información Profesional
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Licencia: {user?.licenseNumber}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Email: {user?.email}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AssignmentIcon sx={{ mr: 2, fontSize: 40, color: 'success.main' }} />
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Protocolos Asignados
                      </Typography>
                      <Typography variant="h4" color="primary">
                        0
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Protocolos activos
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
          </Box>

          {/* Acciones rápidas */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Acciones Rápidas
            </Typography>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } }}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<AssignmentIcon />}
                onClick={() => navigate('/protocols')}
                sx={{ py: 2 }}
              >
                Ver Protocolos
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<CheckIcon />}
                onClick={() => navigate('/patient-visits/new')}
                sx={{ py: 2 }}
              >
                Cargar Visita
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<TimeIcon />}
                onClick={() => navigate('/protocols')}
                sx={{ py: 2 }}
              >
                Historial
              </Button>
            </Box>
          </Paper>

          {/* Estado de cuenta */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Estado de la Cuenta
            </Typography>
            <Alert severity="success" sx={{ mt: 2 }}>
              Su cuenta está activa y lista para usar. Puede comenzar a trabajar en protocolos asignados.
            </Alert>
          </Paper>
        </>
      )}

      {!user?.isActive && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Próximos Pasos
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Una vez que su cuenta sea aprobada por un administrador, recibirá un email de confirmación
            y podrá acceder a todas las funcionalidades del sistema.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

