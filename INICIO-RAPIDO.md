# 🚀 Inicio Rápido - Historias Clínicas

## ¡Felicidades! La Fase 1 está completada ✅

### 📦 Lo que está listo

✅ **Proyecto React + Vite** con TypeScript  
✅ **Sistema de autenticación** con contexto y rutas protegidas  
✅ **Dashboard administrativo** con estadísticas y acciones rápidas  
✅ **Gestión completa de protocolos** (crear, editar, ver, eliminar)  
✅ **Búsqueda y filtrado** de protocolos  
✅ **Servicios API preparados** con mocks para desarrollo  
✅ **UI moderna y responsiva** con Material-UI  
✅ **Preparado para IA** (mock de extracción de datos de documentos)  

---

## 🎯 Cómo iniciar

### 1. Abrir el proyecto

```bash
cd /Users/ezequiel/Documents/WORK/FREELANCE/historias-clinicas
```

### 2. Iniciar el servidor de desarrollo

```bash
npm run dev
```

### 3. Abrir en el navegador

La aplicación se abrirá automáticamente en: **http://localhost:5173**

### 4. Iniciar sesión

**Credenciales**: Cualquier email y contraseña (mock de desarrollo)

Ejemplo:
- Email: `admin@test.com`
- Password: `123456`

---

## 🏗️ Estructura del Proyecto

```
historias-clinicas/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── common/          # PrivateRoute
│   │   └── layout/          # DashboardLayout
│   ├── contexts/            # AuthContext
│   ├── pages/               # Páginas principales
│   │   ├── auth/            # Login
│   │   ├── dashboard/       # Dashboard
│   │   └── protocols/       # Gestión de protocolos
│   ├── services/            # Servicios API (mocks)
│   │   ├── api.ts           # Cliente HTTP
│   │   ├── authService.ts   # Autenticación
│   │   └── protocolService.ts # Protocolos
│   ├── types/               # Tipos TypeScript
│   └── App.tsx              # Configuración principal
├── public/                  # Archivos estáticos
├── package.json
└── README.md
```

---

## 🎨 Funcionalidades Disponibles

### Dashboard (`/dashboard`)
- Estadísticas de protocolos y visitas
- Acciones rápidas (crear protocolo, registrar visita)
- Información del sistema

### Protocolos (`/protocols`)
- **Listar** todos los protocolos con búsqueda
- **Crear** nuevo protocolo (con opción de subir documento para extracción IA)
- **Ver detalles** de un protocolo
- **Editar** protocolo existente
- **Eliminar** protocolos

### Login (`/login`)
- Autenticación con email/password
- Guardado de sesión en localStorage
- Redirección automática

---

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo

# Producción
npm run build            # Compilar para producción
npm run preview          # Preview del build

# Linting
npm run lint             # Ejecutar ESLint
```

---

## 🔌 Integración con Backend

### Pasos para conectar con tu API:

1. **Configurar la URL del backend** en `.env`:
   ```env
   VITE_API_BASE_URL=https://tu-api.com/api
   ```

2. **Actualizar los servicios** (ver `INTEGRATION.md` para detalles)

3. **Descomentar las llamadas reales** y **comentar los mocks**

**Archivos a modificar**:
- `src/services/authService.ts`
- `src/services/protocolService.ts`

**Documentación detallada**: Ver archivo `INTEGRATION.md`

---

## 📝 Notas Importantes

### ⚠️ Versión de Node.js

El proyecto está configurado con Vite 5.4 para ser compatible con Node.js 18.

**Si tienes Node.js 20+**, puedes actualizar Vite:
```bash
npm install vite@latest @vitejs/plugin-react@latest
```

### 🔐 Seguridad

- Los tokens JWT se guardan en `localStorage`
- Las rutas están protegidas con `PrivateRoute`
- Los interceptores manejan automáticamente tokens expirados
- **NO se almacena información sensible de pacientes**

### 🎭 Datos Mock

Actualmente todos los servicios usan datos mock. Esto permite:
- Desarrollar el frontend independientemente
- Probar la UI sin backend
- Ver cómo funcionará con datos reales

---

## 🐛 Troubleshooting

### El servidor no inicia

```bash
# Limpiar cache y reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Error de CORS

Configura tu backend para permitir CORS desde `http://localhost:5173`

### Build falla

Verifica errores de TypeScript:
```bash
npm run build
```

---

## 📚 Próximos Pasos

### Fase 2 - Interfaz de Carga de Visitas
- Sistema de login con usuario y contraseña para médicos
- Carga guiada de visitas
- Señalización de participación del investigador principal
- Revisión paso a paso

### Fase 3 - Generación de Texto con IA
- Generación de texto automático
- Visualización sin almacenamiento

### Fase 4 - Descarga de Documentos
- Generación de PDFs
- Firma electrónica
- Formato estandarizado

---

## 🎉 ¡Listo para usar!

Todo está configurado y funcionando. Puedes empezar a:
1. Explorar la interfaz
2. Probar las funcionalidades
3. Modificar según tus necesidades
4. Conectar con tu backend

**¿Preguntas?** Revisa los archivos `README.md` e `INTEGRATION.md` para más detalles.

---

**Desarrollado para el Sistema de Gestión de Protocolos Clínicos**  
Fase 1 - Completada ✅

