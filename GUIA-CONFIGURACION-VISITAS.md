# 📋 Guía: Configuración de Visitas y Campos

## ✅ ¿Qué acabamos de implementar?

Ahora podés **configurar completamente las visitas y sus campos** dentro de cada protocolo. Esta configuración determinará qué formularios verán los médicos cuando carguen visitas de pacientes.

---

## 🎯 ¿Cómo usar esta funcionalidad?

### Paso 1: Crear un Protocolo

1. Ir a **Protocolos** en el menú lateral
2. Hacer clic en **Nuevo Protocolo**

Ahora tenés **dos opciones**:

**Opción A - Crear protocolo con visitas:**
1. Completar la información básica (pestaña 1)
2. Ir a la pestaña **"Visitas y Campos"**
3. Configurar todas las visitas
4. Hacer clic en **"Crear Protocolo"** (se guarda todo junto)

**Opción B - Crear primero, configurar después:**
1. Completar solo la información básica
2. Guardar el protocolo
3. Editarlo después para agregar visitas

### Paso 2: Configurar las Visitas

En la pestaña **"Visitas y Campos"**:

1. Hacer clic en **"Agregar Visita"**
2. Te lleva a una **página completa** con el formulario

**Información de la visita:**
- **Nombre**: Ej: "Visita de Screening", "Visita Basal", "Seguimiento Día 30"
- **Tipo**: Presencial / Telefónica / No Programada
- **Orden**: Número de secuencia (1, 2, 3...)
- **Frecuencia** (opcional): Ej: "Cada 30 días"
- **Número de mediciones** (opcional): Cantidad de veces que se toma una medición
- **Separación entre controles** (opcional): Minutos entre mediciones

3. Click en **"Crear Visita"**
4. Volvés automáticamente al protocolo

### Paso 3: Configurar los Campos/Preguntas de cada Visita

1. En la lista de visitas, hacer clic en el ícono de **⚙️ Configurar** (engranaje)
2. Te lleva a una **página completa** para gestionar campos
3. Hacer clic en **"Agregar Pregunta/Campo"**
4. Te lleva a **otra página completa** con el selector de tipos

**Información del campo:**
- **Nombre**: Ej: "Presión Arterial", "Peso", "Temperatura"
- **Descripción**: Pregunta completa o descripción breve
- **Tipo de Campo**: Elegís de 13 tipos disponibles (ver abajo)
- **Campo Requerido**: Si es obligatorio completarlo
- **Configuraciones específicas**: Según el tipo elegido

5. Click en **"Crear Campo"**
6. Volvés a la configuración de la visita

---

## 📝 Tipos de Campos Disponibles

### 1. **Texto Corto**
Campo de texto de una línea
- **Uso**: Nombres de medicación, observaciones breves
- **Ejemplo**: "Medicación concomitante"

### 2. **Texto Largo**
Área de texto multilínea
- **Uso**: Observaciones clínicas, notas detalladas
- **Ejemplo**: "Observaciones generales del paciente"

### 3. **Número Simple**
Campo numérico básico
- **Configuración**: Unidad de medida
- **Uso**: Peso, temperatura, frecuencia cardíaca
- **Ejemplo**: Peso (kg), Temperatura (°C)

### 4. **Número con Rango**
Número con validación de valores mín/máx
- **Configuración**: 
  - Unidad de medida
  - Valor mínimo
  - Valor máximo
- **Uso**: Presión arterial, valores de laboratorio con rangos esperados
- **Ejemplo**: Presión arterial sistólica (90-180 mmHg)

### 5. **Número Compuesto**
Múltiples números relacionados
- **Uso**: Presión arterial (sistólica/diastólica)
- **Ejemplo**: PA: Sistólica [___] / Diastólica [___]
- **Nota**: Implementación completa próximamente

### 6. **Selección Única**
Lista de opciones (solo una seleccionable)
- **Configuración**: Lista de opciones (una por línea)
- **Formato**: `valor|etiqueta` o solo `etiqueta`
- **Uso**: Estado general, resultado de ECG
- **Ejemplo**:
  ```
  bueno|Bueno
  regular|Regular
  malo|Malo
  ```

### 7. **Selección Múltiple**
Lista de opciones (varias seleccionables)
- **Configuración**: Lista de opciones
- **Uso**: Síntomas presentes, comorbilidades
- **Ejemplo**: Síntomas: ☑️ Cefalea ☑️ Náuseas ☐ Mareos

### 8. **Sí/No**
Campo booleano simple
- **Uso**: Eventos adversos, cumplimiento de tratamiento
- **Ejemplo**: "¿Tuvo eventos adversos?"

### 9. **Fecha**
Selector de fecha
- **Uso**: Fecha de inicio de síntomas, fecha de análisis

### 10. **Hora**
Selector de hora
- **Uso**: Hora de toma de medicación

### 11. **Fecha y Hora**
Selector combinado
- **Uso**: Momento exacto de un evento

### 12. **Archivo Adjunto**
Subir archivo (PDF, imagen, etc.)
- **Uso**: ECG en PDF, fotografías, resultados de laboratorio

### 13. **Tabla Repetible**
Tabla con múltiples filas
- **Uso**: Múltiples tomas de PA, cronograma de medicación
- **Nota**: Implementación completa próximamente

### 14. **Campo Condicional**
Se muestra según otra respuesta
- **Uso**: Si "Evento adverso = Sí" → Mostrar "Descripción del evento"
- **Nota**: Implementación completa próximamente

---

## 💡 Ejemplo Práctico: Visita de Screening

### Configuración de la Visita:
- **Nombre**: Visita de Screening
- **Tipo**: Presencial
- **Orden**: 1

### Campos de la Visita:

**1. Presión Arterial**
- Tipo: Número con Rango
- Unidad: mmHg
- Rango: 90-180
- Requerido: ✅
- Permitir múltiples: ✅ (para 3 tomas)

**2. Peso**
- Tipo: Número Simple
- Unidad: kg
- Requerido: ✅

**3. Talla**
- Tipo: Número Simple
- Unidad: cm
- Requerido: ✅

**4. Electrocardiograma**
- Tipo: Selección Única
- Opciones:
  ```
  normal|Normal
  anormal|Anormal - Requiere evaluación
  ```
- Requerido: ✅

**5. Observaciones del ECG**
- Tipo: Texto Largo
- Requerido: No

**6. Consentimiento Informado**
- Tipo: Sí/No
- Requerido: ✅

**7. Fecha de Consentimiento**
- Tipo: Fecha
- Requerido: ✅

---

## 🔄 Flujo Completo

```
1. Admin crea PROTOCOLO
   ↓
2. Admin agrega VISITAS al protocolo
   - Visita 1: Screening
   - Visita 2: Basal
   - Visita 3: Seguimiento 30 días
   ↓
3. Admin configura CAMPOS de cada visita
   - Screening: PA, Peso, Talla, ECG, Consentimiento
   - Basal: PA, Laboratorio, Entrega medicación
   - Seguimiento: PA, Eventos adversos, Adherencia
   ↓
4. Médico entra al sistema (Fase 2 - próximamente)
   ↓
5. Médico selecciona PROTOCOLO + VISITA
   ↓
6. Sistema genera FORMULARIO automáticamente
   basándose en la configuración
   ↓
7. Médico completa el formulario
   ↓
8. Sistema genera PDF (Fase 3-4)
```

---

## ✨ Características Implementadas

### ✅ Gestión de Visitas
- Crear/Editar/Eliminar visitas
- Orden secuencial de visitas
- Tipos de visita (presencial/telefónica/no programada)
- Configuración de frecuencia y mediciones

### ✅ Gestión de Campos
- 14 tipos de campos diferentes
- Campos requeridos/opcionales
- Mediciones repetibles
- Validación de rangos
- Unidades de medida
- Opciones configurables
- Texto de ayuda

### ✅ Interfaz Intuitiva
- Editor visual de campos
- Arrastrar y soltar para reordenar (próximamente)
- Vista previa de campos
- Validaciones en tiempo real

---

## 🚀 Próximos Pasos

### Fase 2 (En desarrollo)
- [ ] Interfaz para que médicos carguen visitas
- [ ] Generación dinámica de formularios basándose en esta configuración
- [ ] Validaciones según las reglas del protocolo

### Fase 3
- [ ] Generación de texto con IA
- [ ] Relato clínico automático

### Fase 4
- [ ] Exportación a PDF
- [ ] Firma electrónica
- [ ] Membrete personalizado

---

## 📸 ¿Cómo se ve?

Para probar esta funcionalidad:

1. Iniciá el servidor: `npm run dev`
2. Entrá a: http://localhost:5173
3. Login con cualquier credencial
4. Ir a **Protocolos** → Editar uno existente
5. Ir a la pestaña **"Visitas y Campos"**
6. ¡Empezá a configurar!

---

## 💾 Persistencia de Datos

**Importante**: Los datos actualmente usan mocks. Cuando conectes el backend:

1. Las visitas y campos se guardarán en la base de datos
2. Cada vez que edites un protocolo, se cargarán las visitas configuradas
3. Los médicos verán los formularios dinámicos basados en esta configuración

---

## 🎓 Tips de Uso

### ✅ Buenas Prácticas

1. **Nombrá las visitas claramente**: "Visita de Screening" es mejor que "V1"
2. **Usá el campo "Texto de Ayuda"**: Ayuda a los médicos a saber qué completar
3. **Marcá campos como requeridos**: Solo los realmente obligatorios
4. **Definí rangos cuando corresponda**: Ayuda a prevenir errores
5. **Agrupá lógicamente**: Primero signos vitales, luego evaluaciones, etc.

### ⚠️ Evitá

1. No crear demasiados campos opcionales (confunde)
2. No usar nombres muy largos (ocupa espacio)
3. No duplicar campos entre visitas (reutilizar cuando puedas)

---

¿Necesitás ayuda con algo específico? ¡Preguntame! 🚀

