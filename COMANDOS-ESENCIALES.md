# ⚡ Comandos Esenciales

## 🚀 Inicio Rápido

```bash
# 1. Ir al directorio del proyecto
cd /Users/ezequiel/Documents/WORK/FREELANCE/historias-clinicas

# 2. Instalar dependencias (solo la primera vez)
npm install

# 3. Iniciar el servidor de desarrollo
npm run dev

# 4. Abrir en el navegador
# http://localhost:5173
```

---

## 📝 Comandos Principales

### Desarrollo
```bash
npm run dev          # Iniciar servidor de desarrollo
npm run build        # Compilar para producción
npm run preview      # Preview del build de producción
npm run lint         # Ejecutar linter
```

### Instalación/Actualización
```bash
npm install          # Instalar dependencias
npm update           # Actualizar dependencias
npm audit fix        # Corregir vulnerabilidades
```

### Limpieza
```bash
rm -rf node_modules package-lock.json && npm install  # Reinstalar desde cero
rm -rf dist          # Limpiar build
```

---

## 🔑 Credenciales de Prueba

**Email**: cualquier email (ej: `admin@test.com`)  
**Password**: cualquier password (ej: `123456`)

*Actualmente usa mocks, cualquier credencial funciona*

---

## 📂 Estructura de URLs

```
http://localhost:5173/login      # Login
http://localhost:5173/dashboard  # Dashboard principal
http://localhost:5173/protocols  # Lista de protocolos
http://localhost:5173/protocols/new  # Crear protocolo
http://localhost:5173/protocols/:id  # Ver protocolo
http://localhost:5173/protocols/:id/edit  # Editar protocolo
```

---

## 🛠️ Solución de Problemas

### El servidor no inicia
```bash
# Limpiar y reinstalar
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Errores de compilación
```bash
# Verificar errores de TypeScript
npm run build

# Ejecutar linter
npm run lint
```

### Puerto 5173 ocupado
```bash
# Vite cambiará automáticamente al siguiente puerto disponible
# O puedes especificar uno diferente en vite.config.ts
```

---

## 📚 Archivos de Documentación

- `INICIO-RAPIDO.md` - Guía de inicio rápido
- `README.md` - Documentación completa
- `INTEGRATION.md` - Integración con backend
- `RESUMEN-FASE-1.md` - Resumen de lo implementado
- `COMANDOS-ESENCIALES.md` - Este archivo

---

## 🎯 Próximos Pasos

1. **Probar la aplicación**
   ```bash
   npm run dev
   ```

2. **Explorar las funcionalidades**
   - Login → Dashboard → Protocolos

3. **Revisar el código**
   - Ver `src/` para entender la estructura
   - Ver `src/services/` para los servicios API

4. **Conectar con backend**
   - Seguir guía en `INTEGRATION.md`
   - Configurar `.env` con tu API
   - Actualizar servicios

5. **Continuar con Fase 2**
   - Implementar carga de visitas
   - Agregar nuevas funcionalidades

---

**¡Listo para empezar!** 🚀

