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
  LocalHospital as HospitalIcon,
  AddCircle as AddIcon,
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
          <Card sx={{ mb: 3 }}>
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

          {/* Crear visita */}
          <Paper sx={{ p: 4, textAlign: 'center', mb: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 2, fontWeight: 'bold' }}>
              Crear Nueva Visita
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Complete el formulario de visita para un paciente seleccionando el protocolo y la visita correspondiente.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => navigate('/patient-visits/new')}
              sx={{ py: 1.5, px: 4, fontSize: '1.1rem' }}
            >
              Crear Visita
            </Button>
          </Paper>

          {/* Estado de cuenta */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Estado de la Cuenta
            </Typography>
            <Alert severity="success" sx={{ mt: 2 }}>
              Su cuenta está activa y lista para crear visitas.
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
            y podrá comenzar a crear visitas.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

