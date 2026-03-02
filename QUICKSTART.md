# Inicio Rápido - VoltBody Powered

## 🚀 Despliegue Inmediato en Coolify

### 1. Variables de Entorno (Coolify Dashboard)

Copia estas variables en tu proyecto de Coolify:

```env
# Base de Datos
POSTGRES_USER=voltbody
POSTGRES_PASSWORD=CAMBIA_ESTA_CONTRASEÑA_SEGURA
POSTGRES_DB=voltbody
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public

# Aplicación
PORT=3000
NODE_ENV=production
APP_URL=https://tu-dominio.coolify.app

# Seguridad (CAMBIA ESTOS VALORES)
JWT_SECRET=GENERA_UNA_CLAVE_ALEATORIA_AQUI_32_CARACTERES_MINIMO

# Google Gemini AI
GEMINI_API_KEY=tu-api-key-de-gemini-aqui
```

### 2. Comandos para generar valores seguros

```bash
# Generar JWT_SECRET seguro
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generar contraseña de PostgreSQL
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### 3. Configuración en Coolify

1. **Crear Proyecto**
   - Tipo: Docker Compose
   - Seleccionar repositorio Git
   - Coolify detectará automáticamente `docker-compose.yaml`

2. **Configurar Variables**
   - Pegar las variables de entorno
   - Actualizar `APP_URL` con tu dominio

3. **Desplegar**
   - Coolify construirá automáticamente
   - Migraciones de BD se ejecutan al iniciar
   - SSL configurado automáticamente
   - **Toda la información de la IA se guarda en PostgreSQL**

### 4. Verificar Despliegue

```bash
# Health check
curl https://tu-dominio.coolify.app/api/health

# Respuesta esperada:
# {"status":"ok","timestamp":"2026-03-02T..."}
```

## 🎯 Checklist Pre-Despliegue

- [ ] Variables de entorno configuradas
- [ ] `JWT_SECRET` cambiado a valor aleatorio
- [ ] `POSTGRES_PASSWORD` cambiado a valor seguro
- [ ] `GEMINI_API_KEY` configurada
- [ ] `APP_URL` actualizada con tu dominio
- [ ] Repositorio Git conectado a Coolify
- [ ] Dominio personalizado configurado en Coolify

## 📊 Arquitectura Desplegada

```
┌─────────────────────────────────┐
│      Coolify (Orquestador)      │
│           + Let's Encrypt        │
└──────────────┬──────────────────┘
               │
        HTTPS (puerto 443)
               │
┌──────────────▼──────────────────┐
│      Load Balancer/Proxy        │
│      (Automático en Coolify)    │
└──────────────┬──────────────────┘
               │
        ┌──────┴──────┐
        │             │
┌───────▼──────┐  ┌──▼──────────┐
│  App Container│  │  PostgreSQL │
│  (Node+React) │  │  Container  │
│  Puerto: 3000 │  │  (BD)       │
└───────────────┘  └─────────────┘
        │                  │
   ┌────┴────┐        ┌───┴────┐
   │ uploads │        │ pg_data│
   │ (volume)│        │(volume)│
   └─────────┘        └────────┘
```

## 🔍 Monitoreo

### Logs en Tiempo Real
```bash
# En Coolify, ir a tu aplicación > Logs
# O vía SSH al servidor:
docker logs -f <voltbody-container-name>
```

### Prisma Studio (Base de Datos)
```bash
# SSH al contenedor
docker exec -it <voltbody-container> sh

# Iniciar Prisma Studio
npx prisma studio

# Acceder vía port-forward si es necesario
```

## ⚡ Comandos Útiles

```bash
# Ver estado de contenedores
docker ps

# Reiniciar aplicación
docker restart <voltbody-container>

# Ver logs de PostgreSQL
docker logs <postgres-container>

# Backup de base de datos
docker exec <postgres-container> pg_dump -U voltbody voltbody > backup.sql

# Restaurar base de datos
docker exec -i <postgres-container> psql -U voltbody voltbody < backup.sql
```

## 🐛 Troubleshooting

### Error: "Connection refused"
- Verificar que PostgreSQL esté corriendo
- Revisar `DATABASE_URL` en variables de entorno

### Error: "Invalid JWT"
- Verificar que `JWT_SECRET` esté configurado
- Asegurar que sea el mismo en todas las instancias

### Error: "Gemini API"
- Verificar `GEMINI_API_KEY`
- Comprobar límites de API en Google Cloud

### La aplicación no carga
1. Verificar logs: `docker logs <container>`
2. Comprobar health check: `/api/health`
3. Verificar DNS y SSL en Coolify
4. Revisar que el puerto 3000 esté expuesto

## 📱 Primer Uso

1. Abre tu URL: `https://tu-dominio.coolify.app`
2. Registra tu primera cuenta
3. Completa el onboarding
4. ¡Disfruta tu entrenador personal IA!

## 🔐 Seguridad Post-Despliegue

- [ ] Cambiar contraseñas por defecto
- [ ] Habilitar 2FA en Coolify
- [ ] Configurar backups automáticos
- [ ] Monitorear logs de acceso
- [ ] Actualizar dependencias regularmente

---

¿Problemas? Revisa [COOLIFY_SETUP.md](./COOLIFY_SETUP.md) para más detalles.
