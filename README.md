# Sistema de Gestión de Historias Clínicas

Sistema de soporte para la escritura de historias clínicas en estudios de investigación clínica, minimizando errores derivados de distracciones o desconocimiento de los lineamientos de los protocolos.

## 🚀 Características

### Fase 1 - Dashboard de Administración de Protocolos (Implementado)

- ✅ Panel administrativo para carga, edición y consulta de protocolos
- ✅ Sistema de autenticación con roles de usuario
- ✅ Gestión completa de protocolos (CRUD)
- ✅ Búsqueda y filtrado de protocolos
- ✅ Interfaz moderna y responsiva con Material-UI
- ✅ Preparado para extracción automatizada de datos (mock implementado)
- ✅ Sistema de servicios API preparado para integración backend

### Próximas Fases

- **Fase 2**: Interfaz de carga de visitas (presenciales, telefónicas, no programadas)
- **Fase 3**: Generación de texto asistida (redactor clínico)
- **Fase 4**: Descarga de documentos PDF con firma electrónica

## 🛠️ Tecnologías Utilizadas

- **React 18** - Biblioteca de UI
- **Vite** - Build tool y dev server
- **TypeScript** - Tipado estático
- **Material-UI (MUI)** - Framework de componentes UI
- **React Router** - Navegación
- **React Hook Form** - Manejo de formularios
- **Axios** - Cliente HTTP
- **Emotion** - Styling

## 📋 Requisitos Previos

- Node.js 18+ (recomendado 20+)
- npm 9+

## 🔧 Instalación

1. **Navegar al directorio**
   ```bash
   cd historias-clinicas
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   
   El proyecto incluye configuración para conectarse a una API backend. Por ahora está usando mocks:
   
   ```
   VITE_API_BASE_URL=http://localhost:3000/api
   ```

4. **Iniciar el servidor de desarrollo**
   ```bash
   npm run dev
   ```

   La aplicación estará disponible en `http://localhost:5173`

## 🎯 Uso

### Credenciales de Prueba

Mientras el backend está en desarrollo, puedes usar **cualquier email y contraseña** para acceder al sistema. El sistema está usando datos mock para demostración.

### Navegación Principal

1. **Dashboard**: Vista general con estadísticas y acciones rápidas
2. **Protocolos**: Gestión completa de protocolos clínicos
   - Crear nuevo protocolo
   - Editar protocolo existente
   - Ver detalles del protocolo
   - Eliminar protocolos
   - Búsqueda y filtrado

### Extracción de Datos (Mock)

En el formulario de creación de protocolos, puedes simular la carga de un documento. El sistema mostrará una barra de progreso y llenará automáticamente los campos con datos de ejemplo.

## 📁 Estructura del Proyecto

```
historias-clinicas/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── common/          # Componentes comunes (PrivateRoute)
│   │   ├── layout/          # Layouts (DashboardLayout)
│   │   ├── protocols/       # Componentes específicos de protocolos
│   │   └── auth/            # Componentes de autenticación
│   ├── contexts/            # Contextos de React (AuthContext)
│   ├── hooks/               # Custom hooks
│   ├── pages/               # Páginas de la aplicación
│   │   ├── auth/            # Login
│   │   ├── dashboard/       # Dashboard principal
│   │   └── protocols/       # Gestión de protocolos
│   ├── services/            # Servicios de API
│   │   ├── api.ts           # Cliente HTTP base
│   │   ├── authService.ts   # Autenticación
│   │   └── protocolService.ts # Protocolos
│   ├── types/               # Definiciones de TypeScript
│   ├── utils/               # Utilidades
│   ├── App.tsx              # Componente principal
│   └── main.tsx             # Punto de entrada
├── public/                  # Archivos estáticos
└── package.json             # Dependencias
```

## 🔌 Integración con Backend

### Servicios API Preparados

Todos los servicios están preparados para conectarse al backend. Simplemente necesitas:

1. **Configurar la URL del backend** en las variables de entorno
2. **Descomentar las líneas reales de API** en los servicios
3. **Comentar/eliminar los mocks temporales**

Ejemplo en `authService.ts`:

```typescript
// Cambiar de:
// Mock temporal
return new Promise((resolve) => { ... });

// A:
return apiService.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
```

### Endpoints Esperados

El sistema espera los siguientes endpoints:

#### Autenticación
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Usuario actual
- `POST /api/auth/logout` - Logout

#### Protocolos
- `GET /api/protocols` - Listar protocolos (con paginación)
- `GET /api/protocols/:id` - Obtener protocolo
- `POST /api/protocols` - Crear protocolo
- `PUT /api/protocols/:id` - Actualizar protocolo
- `DELETE /api/protocols/:id` - Eliminar protocolo
- `POST /api/protocols/extract` - Extraer datos de documento (procesamiento asistido)

## 🎨 Personalización

### Tema

El tema de Material-UI se configura en `App.tsx`. Puedes personalizar colores, tipografía y componentes:

```typescript
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    // ... más configuraciones
  },
});
```

## 🧪 Testing

```bash
npm run test
```

## 🏗️ Build para Producción

```bash
npm run build
```

Los archivos optimizados se generarán en la carpeta `dist/`.

## 📝 Scripts Disponibles

- `npm run dev` - Iniciar servidor de desarrollo
- `npm run build` - Build para producción
- `npm run preview` - Preview del build de producción
- `npm run lint` - Ejecutar linter

## 🔒 Seguridad

- ✅ Autenticación con tokens JWT (preparado)
- ✅ Rutas protegidas con control de acceso por rol
- ✅ Validación de formularios
- ✅ No se almacena información sensible de pacientes en el frontend
- ✅ Interceptores para manejo de tokens expirados

## 📞 Soporte

Para reportar problemas o solicitar nuevas características, contacta al equipo de desarrollo.

## 📄 Licencia

Proyecto privado - Todos los derechos reservados

---

**Desarrollado para el Centro de Investigación Clínica**
