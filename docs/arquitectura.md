# Arquitectura del Sistema — Empodérate Vecino

Versión 1.1 — Agosto 2026 · Mantenido por: Linder López Rivera (Coordinador de TI)

## 1. Diagrama de alto nivel

┌────────────────────────── Vercel (frontend estático) ──────────────────────────┐
│  index.html (Alpine.js + Tailwind) · app.js · styles.css · assets/logo.png     │
└──────────────────────────────────┬─────────────────────────────────────────────┘
                                   │ HTTPS (supabase-js, anon key pública)
┌──────────────────────────────────▼─────────────────────────────────────────────┐
│                            Supabase Cloud                                      │
│  Auth (correo/contraseña + recuperación) · PostgreSQL con RLS · Funciones RPC  │
└────────────────────────────────────────────────────────────────────────────────┘

Sin servidor propio, sin framework y sin build: el frontend es una página que
consume Supabase; la seguridad vive en la base de datos (Row Level Security).

## 2. Stack

- Frontend: HTML + JavaScript vanilla + Alpine.js 3.14 · Tailwind CDN · Chart.js 4 · SheetJS (XLSX)
- Backend: Supabase (PostgreSQL + Auth + RPC)
- Hosting: Vercel (Root Directory = `frontend`, sin build)

## 3. Modelo de datos

- commissions: comisiones (ACAD, COM, DIR, FIN, INC, PROY, RRPP, RRHH, TI, CD)
- people: ficha del voluntario (DNI, contacto, emergencia, alergias; estado activo/suspendido/baja)
- profiles: cuentas del sistema. NO ligadas a persona: ligadas a comisión (commission_id) y rol (app_role)
- commission_roles: rol persona×comisión (coordinador/sub) con can_read/can_write; historial y autorización de subs
- activities: catálogo de actividades
- hour_entries: horas por voluntario/actividad/fecha; nunca se borran, se anulan con motivo
- certificates: constancias con correlativo EV-AAAA-####
- audit_log: trazabilidad de cambios (triggers)

## 4. Roles y accesos

| Rol | Acceso |
|---|---|
| rrhh | Todo: altas/bajas, anular horas, constancias |
| coordinador | Su comisión: ver voluntarios, registrar horas, autorizar subs |
| subcoordinador | Lectura de su comisión; escribe solo si el coordinador lo autoriza |
| direccion | Lectura global |
| tecnologia | Acceso técnico + su comisión |

Cuentas por comisión (coordinacionrh.ev@gmail.com, coordinacioninnovadigital.ev@gmail.com, etc.):
cuando rota la persona, solo se entrega la contraseña; no se toca Supabase.

## 5. Seguridad

- Auth email/contraseña + recuperación por correo (redirectTo a la app)
- Política de contraseña: ≥8, mayúscula, minúscula, número y símbolo (barra de fortaleza en UI)
- RLS por tabla: cada cuenta ve solo su comisión; RRHH y Dirección ven todo
- Escrituras sensibles vía RPC: register_hour(), annul_hour(), set_subcoordinator_write()
- Sin borrados físicos de horas/personas: anulación/baja con motivo e historial

## 6. Flujos principales

1. Login → profiles → comisión/rol → panel según rol
2. Horas: coordinador → RPC register_hour → validaciones (fecha no futura, voluntario activo, permiso de escritura)
3. Constancia: RRHH elige persona + rango → correlativo → documento membretado (SENAJU 00227-2022-MINEDU/DM-SENAJU, firma RRHH) → Imprimir/PDF
4. Recuperación: correo → pantalla propia "Enviar" → enlace type=recovery → nueva contraseña → vuelve al login

## 7. Despliegue

- Vercel: repo GitHub Linder-debug/Empoderate_Vecino_RRHH, root `frontend`, redeploy automático en cada push
- Supabase: URLs autorizadas en Auth (Vercel + localhost)
- Cuenta nueva: crear en Authentication + SQL plantilla de profiles (comisión, sin persona)

## 8. Backlog

- [ ] Gestión de usuarios por RRHH desde la app (Edge Function)
- [ ] SMTP propio para correos sin límite
- [ ] Ocultar campos sensibles a coordinadores
- [ ] Ajuste cosmético en recuperación (flash del panel)
- [ ] 2FA para roles críticos
