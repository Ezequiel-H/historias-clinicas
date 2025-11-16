# 🎉 Nueva Interfaz para Configurar Visitas

## ✅ ¿Qué cambió?

Ahora tenés **páginas completas dedicadas** para configurar las visitas y sus campos, en lugar de usar modales limitados.

---

## 🚀 Flujo Nuevo

### 1. **Crear/Editar Protocolo**
```
Protocolos → Editar protocolo → Pestaña "Visitas y Campos"
```

### 2. **Agregar Visita**
```
Click en "Agregar Visita"
→ Modal simple: Nombre, Tipo, Orden
→ Guardar
```

### 3. **Configurar Campos de la Visita** ⭐ NUEVO
```
Click en el ícono ⚙️ (engranaje) de la visita
→ TE LLEVA A UNA PÁGINA COMPLETA
→ Pantalla dedicada solo para esa visita
```

---

## 📺 La Nueva Pantalla de Configuración

Cuando hacés click en **⚙️ Configurar** en una visita, se abre una **página completa**:

```
┌──────────────────────────────────────────────────┐
│ ← Configurar Campos de Visita    [Guardar y Volver] │
│   Visita de Screening                             │
├──────────────────────────────────────────────────┤
│                                                  │
│  ℹ️ Configurá todos los campos/preguntas que    │
│     deben completarse en esta visita             │
│                                                  │
│ ┌──────────────────────────────────────────────┐│
│ │   ¡Empezá agregando el primer campo!        ││
│ │                                              ││
│ │   [+ AGREGAR CAMPO / PREGUNTA]  ← GRANDE    ││
│ │                                              ││
│ └──────────────────────────────────────────────┘│
│                                                  │
│  Campos Configurados (3)                         │
│                                                  │
│ ┌──────────────────────────────────────────────┐│
│ │ ≡ 1. Presión Arterial [Requerido] [Repetible]││
│ │   Número con Rango                           ││
│ │   Unidad: mmHg | Rango: 90-180               ││
│ │                          [Editar] [Eliminar] ││
│ └──────────────────────────────────────────────┘│
│                                                  │
│ ┌──────────────────────────────────────────────┐│
│ │ ≡ 2. Peso [Requerido]                       ││
│ │   Número Simple                              ││
│ │   Unidad: kg                                 ││
│ │                          [Editar] [Eliminar] ││
│ └──────────────────────────────────────────────┘│
│                                                  │
│          [+ Agregar Otro Campo]                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 🎨 Agregar un Campo - Dos Pasos Visuales

### Paso 1: Seleccionar Tipo de Campo

Cuando hacés click en **"Agregar Campo"**, se abre una nueva pantalla con TARJETAS VISUALES:

```
┌───────────────────────────────────────────┐
│ Seleccioná el Tipo de Campo               │
├───────────────────────────────────────────┤
│                                           │
│  [📝 Texto Corto]    [📝 Texto Largo]    │
│  Campo de texto      Observaciones        │
│  de una línea        clínicas             │
│                                           │
│  [🔢 Número Simple]  [🔢 Número Rango]   │
│  Peso, temperatura   PA con validación    │
│                                           │
│  [🔢 Número Comp.]   [☑️ Selección Única]│
│  Sistólica/Diastó.   Estado: Bueno/Malo  │
│                                           │
│  [☑️ Sel. Múltiple]  [⚡ Sí/No]          │
│  Varios síntomas     ¿Tuvo eventos?       │
│                                           │
│  [📅 Fecha]          [🕐 Hora]           │
│  Selector de fecha   Selector de hora     │
│                                           │
│  [📅 Fecha y Hora]   [📎 Archivo]        │
│  Momento exacto      PDF, imagen, etc.    │
│                                           │
│  [📊 Tabla]                               │
│  Múltiples filas                          │
│                                           │
└───────────────────────────────────────────┘
```

### Paso 2: Configurar el Campo

Después de elegir el tipo, se abre el **formulario de configuración**:

```
┌─────────────────────────────────────────────┐
│ ← Nuevo Campo                [Guardar Campo]│
│   🔢 Número con Rango                        │
├─────────────────────────────────────────────┤
│                                             │
│ Configuración del Campo                     │
│                                             │
│ Nombre del Campo / Pregunta *              │
│ [Presión Arterial                        ] │
│ Este es el texto que verá el médico        │
│                                             │
│ Descripción o Instrucciones                │
│ [Tomar 3 mediciones con 5 min de         ]│
│ [separación y registrar cada una          ]│
│                                             │
│ ─────────────────────────────────────────  │
│                                             │
│ Unidad de Medida                           │
│ [mmHg                                    ] │
│                                             │
│ Rango de Valores Permitidos                │
│ Valor Mínimo    Valor Máximo              │
│ [90          ]  [180                    ] │
│ El sistema validará que esté en este rango │
│                                             │
│ Texto de Ayuda (Opcional)                  │
│ [Tomar en posición sentada, luego de     ]│
│ [5 minutos de reposo                      ]│
│                                             │
│ ─────────────────────────────────────────  │
│                                             │
│ Opciones Adicionales                        │
│ ☑ Campo Requerido (obligatorio completar)  │
│ ☑ Permitir Múltiples Mediciones            │
│                                             │
│ ═════════════════════════════════════════  │
│                                             │
│ Vista Previa                                │
│ Así se verá cuando el médico cargue:       │
│                                             │
│ ┌─────────────────────────────────────────┐│
│ │ Presión Arterial * [Repetible]         ││
│ │ Tomar 3 mediciones con 5 min...        ││
│ │ [Campo: Número con Rango] (mmHg)       ││
│ │ Rango: 90 - 180                        ││
│ │ ℹ️ Tomar en posición sentada...        ││
│ └─────────────────────────────────────────┘│
│                                             │
└─────────────────────────────────────────────┘
```

---

## 📋 Tipos de Campos Disponibles

### ✅ Todos los que pediste:

1. **📝 Texto Corto** - Una línea (ej: nombre medicación)
2. **📝 Texto Largo** - Múltiples líneas (ej: observaciones)
3. **🔢 Número Simple** - Con unidad (ej: peso en kg)
4. **🔢 Número con Rango** - Con validación mín/máx
5. **🔢 Número Compuesto** - Múltiples valores (sistólica/diastólica)
6. **☑️ Selección Única** - Lista de opciones (una sola)
7. **☑️ Selección Múltiple** - Lista de opciones (varias)
8. **⚡ Sí/No** - Booleano simple
9. **📅 Fecha** - Selector de fecha
10. **🕐 Hora** - Selector de hora
11. **📅 Fecha y Hora** - Combinado
12. **📎 Archivo Adjunto** - Subir PDFs, imágenes
13. **📊 Tabla Repetible** - Múltiples filas de datos

---

## 🎯 Ventajas de la Nueva Interfaz

### ✅ Más Espacio
- No estás limitado por un modal chico
- Toda la pantalla para configurar
- Podés ver todo claramente

### ✅ Más Fácil
- Tarjetas visuales para elegir tipo
- Vista previa en tiempo real
- Instrucciones claras

### ✅ Mejor Organización
- Lista clara de todos los campos
- Fácil de editar y eliminar
- Orden visual con números

### ✅ Workflow Natural
```
Protocolo → Visitas → Campos → Configurar cada campo
```

---

## 🚀 Ejemplo Paso a Paso

### Escenario: Crear Visita de Screening

**1. Ir a protocolo**
```
Protocolos → Editar "ABC-001" → Pestaña "Visitas y Campos"
```

**2. Crear la visita**
```
Click "Agregar Visita"
- Nombre: Visita de Screening
- Tipo: Presencial
- Orden: 1
Guardar
```

**3. Configurar campos**
```
Click en ⚙️ de "Visita de Screening"
→ SE ABRE PÁGINA COMPLETA
```

**4. Agregar Presión Arterial**
```
Click "Agregar Campo"
→ Elegir "Número con Rango"
→ Completar:
  - Nombre: Presión Arterial
  - Unidad: mmHg
  - Min: 90, Max: 180
  - ☑ Requerido
  - ☑ Permitir Múltiples
→ Guardar Campo
```

**5. Agregar Peso**
```
Click "Agregar Otro Campo"
→ Elegir "Número Simple"
→ Completar:
  - Nombre: Peso
  - Unidad: kg
  - ☑ Requerido
→ Guardar Campo
```

**6. Agregar ECG**
```
Click "Agregar Otro Campo"
→ Elegir "Selección Única"
→ Completar:
  - Nombre: Electrocardiograma
  - Opciones:
    Normal
    Anormal
  - ☑ Requerido
→ Guardar Campo
```

**7. Terminar**
```
Click "Guardar y Volver"
→ Vuelves al protocolo
→ La visita ya tiene 3 campos configurados ✅
```

---

## 🔄 Rutas Nuevas

```
/protocols/:id/edit
  └─ pestaña "Visitas y Campos"
     └─ Click en ⚙️ de una visita
        └─ /protocols/:id/visits/:visitId/edit
           └─ Click "Agregar Campo"
              └─ /protocols/:id/visits/:visitId/activities/new
                 └─ Elegir tipo → Configurar → Guardar
```

---

## ✨ ¿Cómo probarlo?

```bash
npm run dev
```

1. Login
2. Protocolos → Editar uno
3. Pestaña "Visitas y Campos"
4. Click en **⚙️** de una visita
5. ¡Disfrutá de la nueva interfaz completa! 🎉

---

## 📝 Notas

- **Los datos siguen siendo mocks** (temporales)
- Cuando conectes el backend, funcionará igual
- Las visitas y campos se guardarán en la base de datos
- El flujo visual ya está completo

---

## 🎯 Próximo: Fase 2 Completa

Con esta infraestructura, ya podemos crear:
- Interfaz para que médicos carguen visitas
- Formularios dinámicos generados automáticamente
- Basados en tu configuración visual

¿Continuamos? 🚀


