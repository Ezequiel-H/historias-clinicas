# Guía de Integración con Backend

Esta guía explica cómo conectar el frontend con tu API backend.

## 🔗 Conexión Rápida

### 1. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con:

```env
VITE_API_BASE_URL=https://tu-api.com/api
```

### 2. Actualizar Servicios

#### authService.ts

**Ubicación**: `src/services/authService.ts`

**Cambios necesarios**:

```typescript
// REEMPLAZAR esta sección (líneas ~23-40):
// Mock temporal para desarrollo
return new Promise((resolve) => {
  setTimeout(() => {
    resolve({
      success: true,
      data: {
        user: { ... },
        token: 'mock-jwt-token-123456789',
      },
    });
  }, 1000);
});

// POR ESTA:
return apiService.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
```

#### protocolService.ts

**Ubicación**: `src/services/protocolService.ts`

**Cambios necesarios en cada método**:

```typescript
// getProtocols - línea ~14
return apiService.get<PaginatedResponse<Protocol>>('/protocols', { page, pageSize, status });

// getProtocolById - línea ~70
return apiService.get<ApiResponse<Protocol>>(`/protocols/${id}`);

// createProtocol - línea ~125
return apiService.post<ApiResponse<Protocol>>('/protocols', data);

// updateProtocol - línea ~145
return apiService.put<ApiResponse<Protocol>>(`/protocols/${id}`, data);

// deleteProtocol - línea ~165
return apiService.delete<ApiResponse<null>>(`/protocols/${id}`);

// extractProtocolData - línea ~180
return apiService.uploadFile<ApiResponse<Partial<Protocol>>>('/protocols/extract', file, onProgress);
```

## 📋 Formato de Respuestas Esperadas

### Autenticación

#### POST /auth/login

**Request:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "1",
      "email": "usuario@ejemplo.com",
      "name": "Nombre Usuario",
      "role": "admin",
      "isActive": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login exitoso"
}
```

#### GET /auth/me

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "email": "usuario@ejemplo.com",
    "name": "Nombre Usuario",
    "role": "admin",
    "isActive": true
  }
}
```

### Protocolos

#### GET /protocols

**Query Params:**
- `page`: número de página (default: 1)
- `pageSize`: tamaño de página (default: 10)
- `status`: filtro por estado (opcional)

**Response:**
```json
{
  "data": [
    {
      "id": "1",
      "name": "Estudio Cardiovascular ABC-001",
      "code": "ABC-001",
      "sponsor": "Laboratorio XYZ",
      "description": "Descripción del estudio",
      "status": "active",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-10-20T14:30:00Z",
      "visits": [],
      "clinicalRules": []
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

#### GET /protocols/:id

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "name": "Estudio Cardiovascular ABC-001",
    "code": "ABC-001",
    "sponsor": "Laboratorio XYZ",
    "description": "Descripción detallada",
    "status": "active",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-10-20T14:30:00Z",
    "visits": [
      {
        "id": "v1",
        "protocolId": "1",
        "name": "Visita de Screening",
        "type": "presencial",
        "order": 1,
        "activities": [],
        "measurementCount": 3,
        "separationBetweenControls": 5
      }
    ],
    "clinicalRules": [
      {
        "id": "r1",
        "protocolId": "1",
        "name": "Presión Arterial Sistólica",
        "parameter": "presion_arterial_sistolica",
        "condition": "range",
        "minValue": 90,
        "maxValue": 180,
        "errorMessage": "La presión debe estar entre 90 y 180 mmHg",
        "isActive": true
      }
    ]
  }
}
```

#### POST /protocols

**Request:**
```json
{
  "name": "Nuevo Protocolo",
  "code": "NP-001",
  "sponsor": "Farmacéutica ABC",
  "description": "Descripción del nuevo protocolo",
  "status": "draft"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "2",
    "name": "Nuevo Protocolo",
    "code": "NP-001",
    "sponsor": "Farmacéutica ABC",
    "description": "Descripción del nuevo protocolo",
    "status": "draft",
    "createdAt": "2024-11-04T10:00:00Z",
    "updatedAt": "2024-11-04T10:00:00Z",
    "visits": [],
    "clinicalRules": []
  },
  "message": "Protocolo creado exitosamente"
}
```

#### PUT /protocols/:id

**Request:**
```json
{
  "name": "Protocolo Actualizado",
  "status": "active"
}
```

**Response:** (Similar a POST /protocols)

#### DELETE /protocols/:id

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "Protocolo eliminado exitosamente"
}
```

#### POST /protocols/extract

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (PDF, DOC, DOCX)

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Protocolo extraído del documento",
    "code": "EXT-001",
    "sponsor": "Sponsor extraído",
    "description": "Descripción extraída mediante IA",
    "status": "draft"
  },
  "message": "Datos extraídos exitosamente"
}
```

## 🔐 Autenticación

El sistema usa JWT tokens. El cliente automáticamente:

1. Guarda el token en `localStorage` al hacer login
2. Agrega el token en el header `Authorization: Bearer {token}` en cada request
3. Redirige a `/login` si recibe un 401 (token inválido o expirado)

### Implementación en el Backend

Tu backend debe:

1. Verificar el token en cada request protegido
2. Retornar 401 si el token es inválido o expiró
3. Incluir información del usuario en el token

## 🎯 Tipos de TypeScript

Todos los tipos están definidos en `src/types/index.ts`. Puedes usarlos en tu documentación de API o generación de código.

### Tipos Principales

```typescript
interface Protocol {
  id: string;
  name: string;
  code: string;
  sponsor: string;
  description: string;
  status: 'active' | 'inactive' | 'draft';
  createdAt: string;
  updatedAt: string;
  visits: Visit[];
  clinicalRules: ClinicalRule[];
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'medico' | 'investigador_principal';
  isActive: boolean;
}
```

## 🚨 Manejo de Errores

El frontend espera respuestas de error en este formato:

```json
{
  "success": false,
  "message": "Descripción del error",
  "errors": {
    "field": ["Error específico del campo"]
  }
}
```

## 📊 Paginación

Para endpoints paginados, usa:

**Query Params:**
- `page`: número de página (1-indexed)
- `pageSize`: cantidad de items por página

**Response:**
```json
{
  "data": [...],
  "total": 50,
  "page": 1,
  "pageSize": 10
}
```

## 🔍 Testing de la Integración

1. **Configurar la URL del backend** en `.env`
2. **Actualizar un servicio** (por ejemplo, `authService.ts`)
3. **Probar el login** en la aplicación
4. **Verificar en DevTools** (Network tab) que los requests se envían correctamente
5. **Verificar que el token** se guarda en localStorage

## ⚡ Próximos Pasos

Una vez conectado el backend para la Fase 1:

1. Implementar endpoints de **Visitas** (Fase 2)
2. Integrar servicio de **IA para generación de texto** (Fase 3)
3. Implementar **generación de PDFs** (Fase 4)

## 🆘 Troubleshooting

### CORS Errors

Si ves errores de CORS, configura tu backend para permitir:

```javascript
// Express ejemplo
app.use(cors({
  origin: 'http://localhost:5173', // URL del frontend en desarrollo
  credentials: true
}));
```

### 401 Unauthorized Loop

Verifica que:
1. El token se está guardando correctamente
2. El backend acepta el formato `Bearer {token}`
3. El token no ha expirado

### Network Errors

Verifica:
1. La URL del backend en `.env`
2. Que el backend esté corriendo
3. Que no haya firewall bloqueando

---

¿Necesitas ayuda con la integración? Contacta al equipo de desarrollo.

