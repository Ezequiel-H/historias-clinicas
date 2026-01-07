import React, { useRef } from 'react';
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
  UploadFile as UploadIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const DoctorDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={() => navigate('/patient-visits/new')}
                sx={{ py: 1.5, px: 4, fontSize: '1.1rem' }}
              >
                Crear Visita
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
                sx={{ py: 1.5, px: 4, fontSize: '1.1rem' }}
              >
                Cargar desde JSON
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const jsonData = JSON.parse(event.target?.result as string);
                        // Navigate to visit creation page with the JSON data
                        navigate('/patient-visits/new', { state: { importedData: jsonData } });
                      } catch (error) {
                        alert('Error al leer el archivo JSON. Por favor verifica que el archivo sea válido.');
                        console.error('Error parsing JSON:', error);
                      }
                    };
                    reader.readAsText(file);
                  }
                  // Reset input so the same file can be selected again
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
              />
            </Box>
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

