import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { LocalHospital as HospitalIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Login and get the response to check user role
      const response = await authService.login({ email, password });
      // Also call the context login to update the auth state
      await login(email, password);
      
      // Redirect based on user role from the response
      if (response.data.user.role === 'doctor') {
        navigate('/doctor/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      // Extraer el mensaje de error del backend si está disponible
      let errorMessage = 'Error al iniciar sesión. Por favor, intente nuevamente.';
      
      if (err?.response?.data?.error) {
        // Si el backend devuelve un mensaje específico, usarlo
        errorMessage = err.response.data.error;
      } else if (err?.response?.status === 401) {
        // Si es un error 401, mostrar mensaje específico sobre credenciales
        errorMessage = 'Usuario o contraseña incorrectos. Por favor, verifique sus credenciales e intente nuevamente.';
      } else if (err?.message) {
        // Si hay un mensaje de error genérico, usarlo
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <HospitalIcon sx={{ fontSize: 36, color: 'white' }} />
          </Box>
          
          <Typography component="h1" variant="h5" gutterBottom>
            Historias Clínicas
          </Typography>
          
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Sistema de Gestión de Protocolos de Investigación Clínica
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Correo Electrónico"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contraseña"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Iniciar Sesión'}
            </Button>
          </Box>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              ¿Es médico y no tiene cuenta?
            </Typography>
            <Button
              type="button"
              fullWidth
              variant="outlined"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Button clicked, navigating to /signup');
                // Try navigate first
                const result = navigate('/signup', { replace: false });
                console.log('Navigate result:', result);
                // If navigate doesn't work, use window.location as fallback
                setTimeout(() => {
                  if (window.location.pathname !== '/signup') {
                    console.log('Navigate did not work, using window.location');
                    window.location.href = '/signup';
                  }
                }, 100);
              }}
              disabled={loading}
            >
              Registrarse como Médico
            </Button>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
              Credenciales de prueba: cualquier email/password
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

