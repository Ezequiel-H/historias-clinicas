import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/common/PrivateRoute';
import { RoleBasedRedirect } from './components/common/RoleBasedRedirect';
import { RoleProtectedRoute } from './components/common/RoleProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { SignUpPage } from './pages/auth/SignUpPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { DoctorDashboardPage } from './pages/dashboard/DoctorDashboardPage';
import { ProtocolListPage } from './pages/protocols/ProtocolListPage';
import { ProtocolFormPage } from './pages/protocols/ProtocolFormPage';
import { ProtocolDetailPage } from './pages/protocols/ProtocolDetailPage';
import { VisitFormPage } from './pages/protocols/VisitFormPage';
import { VisitConfigPage } from './pages/protocols/VisitConfigPage';
import { ActivityFormPage } from './pages/protocols/ActivityFormPage';
import { PatientVisitFormPage } from './pages/protocols/PatientVisitFormPage';
import { TemplateListPage } from './pages/templates/TemplateListPage';
import { TemplateConfigPage } from './pages/templates/TemplateConfigPage';
import { TemplateActivityFormPage } from './pages/templates/TemplateActivityFormPage';
import { UsersPage } from './pages/users/UsersPage';

// Tema personalizado
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2',
    },
    success: {
      main: '#2e7d32',
    },
    error: {
      main: '#d32f2f',
    },
    warning: {
      main: '#ed6c02',
    },
    info: {
      main: '#0288d1',
      light: '#e3f2fd',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 18,
    body1: {
      fontSize: '1.125rem', // 18px
    },
    body2: {
      fontSize: '1rem', // 16px
    },
    h1: {
      fontSize: '2.5rem', // 40px
    },
    h2: {
      fontSize: '2rem', // 32px
    },
    h3: {
      fontSize: '1.75rem', // 28px
    },
    h4: {
      fontSize: '1.5rem', // 24px
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.25rem', // 20px
      fontWeight: 600,
    },
    h6: {
      fontSize: '1.125rem', // 18px
      fontWeight: 600,
    },
    button: {
      fontSize: '1rem', // 16px
    },
    caption: {
      fontSize: '0.875rem', // 14px
    },
    overline: {
      fontSize: '0.75rem', // 12px
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <Routes>
            {/* Rutas de autenticación */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />

            {/* Rutas protegidas */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <DashboardLayout />
                </PrivateRoute>
              }
            >
              {/* Dashboard */}
              <Route index element={<RoleBasedRedirect />} />
              <Route 
                path="dashboard" 
                element={
                  <RoleProtectedRoute blockedRoles={['doctor']}>
                    <DashboardPage />
                  </RoleProtectedRoute>
                } 
              />
              <Route path="doctor/dashboard" element={<DoctorDashboardPage />} />

              {/* Protocolos - Blocked for doctors */}
              <Route 
                path="protocols" 
                element={
                  <RoleProtectedRoute blockedRoles={['doctor']}>
                    <ProtocolListPage />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="protocols/new" 
                element={
                  <RoleProtectedRoute blockedRoles={['doctor']}>
                    <ProtocolFormPage />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="protocols/:id" 
                element={
                  <RoleProtectedRoute blockedRoles={['doctor']}>
                    <ProtocolDetailPage />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="protocols/:id/edit" 
                element={
                  <RoleProtectedRoute blockedRoles={['doctor']}>
                    <ProtocolFormPage />
                  </RoleProtectedRoute>
                } 
              />
              
              {/* Configuración de Visitas - Blocked for doctors */}
              <Route 
                path="protocols/:protocolId/visits/new" 
                element={
                  <RoleProtectedRoute blockedRoles={['doctor']}>
                    <VisitFormPage />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="protocols/:protocolId/visits/:visitId" 
                element={
                  <RoleProtectedRoute blockedRoles={['doctor']}>
                    <VisitFormPage />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="protocols/:protocolId/visits/:visitId/edit" 
                element={
                  <RoleProtectedRoute blockedRoles={['doctor']}>
                    <VisitConfigPage />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="protocols/:protocolId/visits/:visitId/activities/:activityId" 
                element={
                  <RoleProtectedRoute blockedRoles={['doctor']}>
                    <ActivityFormPage />
                  </RoleProtectedRoute>
                } 
              />

              {/* Carga de Visitas para Médicos - Only for doctors */}
              <Route 
                path="patient-visits/new" 
                element={
                  <RoleProtectedRoute allowedRoles={['doctor']}>
                    <PatientVisitFormPage />
                  </RoleProtectedRoute>
                } 
              />

              {/* Plantillas (Templates) - Blocked for doctors */}
              <Route 
                path="templates" 
                element={
                  <RoleProtectedRoute blockedRoles={['doctor']}>
                    <TemplateListPage />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="templates/new" 
                element={
                  <RoleProtectedRoute blockedRoles={['doctor']}>
                    <TemplateConfigPage />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="templates/:templateId/edit" 
                element={
                  <RoleProtectedRoute blockedRoles={['doctor']}>
                    <TemplateConfigPage />
                  </RoleProtectedRoute>
                } 
              />
              <Route 
                path="templates/:templateId/activities/:activityId" 
                element={
                  <RoleProtectedRoute blockedRoles={['doctor']}>
                    <TemplateActivityFormPage />
                  </RoleProtectedRoute>
                } 
              />

              {/* Usuarios - Blocked for doctors */}
              <Route 
                path="users" 
                element={
                  <RoleProtectedRoute blockedRoles={['doctor']}>
                    <UsersPage />
                  </RoleProtectedRoute>
                } 
              />
            </Route>

            {/* Ruta 404 - Redirect based on role */}
            <Route path="*" element={<RoleBasedRedirect />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
