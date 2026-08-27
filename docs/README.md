# Empodérate Vecino - Sistema de Gestión de Voluntariado

Sistema web para la gestión integral del voluntariado de la organización juvenil **Empodérate Vecino**, acreditada ante la Secretaría Nacional de la Juventud del Ministerio de Educación del Perú.

🔗 **Demo en producción**: https://empoderate-vecino-rrhh.vercel.app

## 📋 Descripción

Aplicación web que permite a la ONG gestionar de forma centralizada:

- **Registro y gestión de voluntarios** (49+ miembros activos)
- **Control de horas de voluntariado** por actividad y comisión
- **Generación de constancias oficiales** con numeración correlativa
- **Sistema de roles y permisos** (RRHH, coordinadores, subcoordinadores, dirección, tecnología)
- **Reportes y exportación** de datos en formato XLS

## ✨ Características principales

### Autenticación y seguridad
- Login con correo y contraseña
- Recuperación de contraseña por email
- Validación robusta de contraseñas (mayúsculas, minúsculas, números, caracteres especiales)
- Sesiones persistentes con Supabase Auth

### Gestión de personas (RRHH)
- Alta, edición y baja de voluntarios
- Ficha completa con datos de contacto, emergencia, alergias, seguro
- Filtros por comisión y búsqueda por nombre/DNI/email
- Paginación de 15 registros por página

### Control de horas
- Registro de horas por coordinadores autorizados
- Validación de fechas (no futuras, no antes del ingreso)
- Anulación de registros por RRHH con motivo obligatorio
- Gráfico de horas por mes y actividad (Chart.js)
- Exportación a Excel (XLSX)

### Generación de constancias
- Formato oficial con membrete y numeración correlativa (EV-2026-0001)
- Firma digital del Coordinador de RRHH y Legal
- Impresión directa o exportación a PDF
- Validación de horas acumuladas en el periodo

### Roles y permisos
- **RRHH**: Gestión completa de personas, horas y constancias
- **Coordinador**: Registro de horas de su comisión, autorización de subcoordinadores
- **Subcoordinador**: Registro de horas (requiere autorización)
- **Dirección**: Vista global de todas las comisiones
- **Tecnología**: Acceso técnico y gestión de su propia comisión

## 🛠️ Tecnologías

### Frontend
- **HTML5** + **CSS3** (Tailwind CSS via CDN)
- **JavaScript vanilla** (sin frameworks)
- **Alpine.js 3.14.1** (reactividad ligera)
- **Chart.js 4.4.1** (gráficos)
- **SheetJS (XLSX)** (exportación a Excel)

### Backend
- **Supabase** (PostgreSQL + Auth + Realtime)
- Row Level Security (RLS) para control de acceso a nivel de fila
- Funciones RPC para lógica de negocio

### Despliegue
- **Vercel** (frontend estático)
- **Supabase Cloud** (base de datos)

## 📁 Estructura del proyecto
