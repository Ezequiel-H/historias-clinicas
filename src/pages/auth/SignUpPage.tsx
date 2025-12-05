import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { LocalHospital as HospitalIcon, Visibility, VisibilityOff, CloudUpload } from '@mui/icons-material';
import { authService } from '../../services/authService';
import type { SignupCredentials } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';

export const SignUpPage: React.FC = () => {
  const [formData, setFormData] = useState<SignupCredentials>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    licenseNumber: '',
    sealSignaturePhoto: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Only allow numbers for license number
    if (name === 'licenseNumber') {
      // Remove any non-numeric characters
      const numericValue = value.replace(/\D/g, '');
      setFormData((prev) => ({
        ...prev,
        [name]: numericValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    setError('');
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
      setError('Por favor, seleccione un archivo de imagen válido');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('La imagen no debe superar los 5MB');
      setError('La imagen no debe superar los 5MB');
      return;
    }

    // Convertir a base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFormData((prev) => ({
        ...prev,
        sealSignaturePhoto: base64String,
      }));
      setPhotoPreview(base64String);
      setPhotoError('');
      setError('');
    };
    reader.onerror = () => {
      setPhotoError('Error al leer la imagen');
      setError('Error al leer la imagen');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setPhotoError('');

    // Validaciones básicas
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName || !formData.licenseNumber) {
      setError('Por favor, complete todos los campos requeridos');
      return;
    }

    // Validar foto específicamente - check for empty string or falsy
    const hasPhoto = formData.sealSignaturePhoto && formData.sealSignaturePhoto.trim() !== '';
    if (!hasPhoto) {
      console.log('Photo validation failed:', formData.sealSignaturePhoto);
      setPhotoError('La foto de sello y firma es requerida');
      setError('Por favor, suba una foto de su sello y firma médica');
      // Scroll to error
      setTimeout(() => {
        const errorElement = document.getElementById('seal-signature-photo');
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    // Validate license number is numeric
    if (!/^\d+$/.test(formData.licenseNumber)) {
      setError('El número de licencia debe contener solo números');
      return;
    }

    if (formData.password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.signup(formData);
      
      if (response.success && response.data) {
        // Save token and auto-login
        authService.saveToken(response.data.token);
        
        // Use login function to update auth context
        await login(formData.email, formData.password);
        
        // Redirect based on user role
        if (response.data.user.role === 'doctor') {
          setSuccess('Registro exitoso. Será redirigido a su dashboard...');
          setTimeout(() => {
            navigate('/doctor/dashboard');
          }, 1000);
        } else {
          setSuccess('Registro exitoso. Será redirigido al dashboard...');
          setTimeout(() => {
            navigate('/dashboard');
          }, 1000);
        }
      } else {
        setError(response.message || 'Error al registrar usuario');
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || err?.message || 'Error al registrar usuario. Por favor, intente nuevamente.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4,
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
            Registro de Médico
          </Typography>
          
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Complete el formulario para crear su cuenta
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
              {success}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="firstName"
              label="Nombre"
              name="firstName"
              autoComplete="given-name"
              autoFocus
              value={formData.firstName}
              onChange={handleInputChange}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="lastName"
              label="Apellido"
              name="lastName"
              autoComplete="family-name"
              value={formData.lastName}
              onChange={handleInputChange}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="licenseNumber"
              label="Número de Licencia"
              name="licenseNumber"
              type="text"
              value={formData.licenseNumber}
              onChange={handleInputChange}
              disabled={loading}
              helperText="Ingrese su número de licencia médica (solo números)"
              inputProps={{
                inputMode: 'numeric',
                pattern: '[0-9]*',
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Correo Electrónico"
              name="email"
              autoComplete="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleInputChange}
              disabled={loading}
              helperText="Mínimo 6 caracteres"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirmar Contraseña"
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Foto de Sello y Firma <span style={{ color: 'red' }}>*</span>
              </Typography>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="seal-signature-photo"
                type="file"
                onChange={handlePhotoChange}
                disabled={loading}
              />
              <label htmlFor="seal-signature-photo">
                <Button
                  variant="outlined"
                  component="span"
                  fullWidth
                  startIcon={<CloudUpload />}
                  disabled={loading}
                  sx={{ 
                    mb: 1,
                    borderColor: photoError ? 'error.main' : photoPreview ? 'success.main' : 'rgba(0, 0, 0, 0.23)',
                    borderWidth: photoError ? 2 : 1,
                    '&:hover': {
                      borderColor: photoError ? 'error.dark' : photoPreview ? 'success.dark' : 'rgba(0, 0, 0, 0.87)',
                      borderWidth: photoError ? 2 : 1,
                    }
                  }}
                  color={photoError ? 'error' : photoPreview ? 'success' : 'primary'}
                >
                  {photoPreview ? 'Cambiar Foto' : 'Subir Foto de Sello y Firma'}
                </Button>
              </label>
              {photoError && (
                <Alert 
                  severity="error" 
                  sx={{ 
                    mt: 1,
                    '& .MuiAlert-icon': {
                      fontSize: '1.25rem'
                    }
                  }}
                >
                  {photoError}
                </Alert>
              )}
              {photoPreview && (
                <Box
                  sx={{
                    mt: 2,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <img
                    src={photoPreview}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '200px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                    }}
                  />
                </Box>
              )}
              <Typography 
                variant="caption" 
                color="text.secondary" 
                display="block" 
                sx={{ mt: 1 }}
              >
                Suba una foto de su sello y firma médica (requerido, máximo 5MB)
              </Typography>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Registrarse'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                ¿Ya tiene una cuenta?{' '}
                <Link to="/login" style={{ color: 'inherit', textDecoration: 'none' }}>
                  <Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 500 }}>
                    Iniciar Sesión
                  </Typography>
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

