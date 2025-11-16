import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { PrivateRoute } from './components/common/PrivateRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProtocolListPage } from './pages/protocols/ProtocolListPage';
import { ProtocolFormPage } from './pages/protocols/ProtocolFormPage';
import { ProtocolDetailPage } from './pages/protocols/ProtocolDetailPage';
import { VisitFormPage } from './pages/protocols/VisitFormPage';
import { VisitConfigPage } from './pages/protocols/VisitConfigPage';
import { ActivityFormPage } from './pages/protocols/ActivityFormPage';

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
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
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
            {/* Ruta de login */}
            <Route path="/login" element={<LoginPage />} />

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
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />

              {/* Protocolos */}
              <Route path="protocols" element={<ProtocolListPage />} />
              <Route path="protocols/new" element={<ProtocolFormPage />} />
              <Route path="protocols/:id" element={<ProtocolDetailPage />} />
              <Route path="protocols/:id/edit" element={<ProtocolFormPage />} />
              
              {/* Configuración de Visitas */}
              <Route path="protocols/:protocolId/visits/new" element={<VisitFormPage />} />
              <Route path="protocols/:protocolId/visits/:visitId" element={<VisitFormPage />} />
              <Route path="protocols/:protocolId/visits/:visitId/edit" element={<VisitConfigPage />} />
              <Route path="protocols/:protocolId/visits/:visitId/activities/:activityId" element={<ActivityFormPage />} />

              {/* Otras rutas pendientes de implementación */}
              <Route path="visits" element={<div>Visitas - En desarrollo</div>} />
              <Route path="users" element={<div>Usuarios - En desarrollo</div>} />
            </Route>

            {/* Ruta 404 */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
