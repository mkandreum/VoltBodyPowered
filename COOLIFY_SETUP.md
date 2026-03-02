# VoltBody Powered - Guía de Despliegue en Coolify

## 📋 Configuración en Coolify

### 1. Crear Nuevo Proyecto en Coolify

1. Accede a tu panel de Coolify
2. Crea un nuevo proyecto con **Docker Compose**
3. Conecta tu repositorio Git o sube los archivos del proyecto
4. Coolify detectará automáticamente el archivo `docker-compose.yaml`

### 2. Variables de Entorno Requeridas

Configura las siguientes variables de entorno en Coolify:

```env
# Base de Datos PostgreSQL
POSTGRES_USER=voltbody
POSTGRES_PASSWORD=tu_password_segura_aqui
POSTGRES_DB=voltbody

# URL de la Base de Datos (Coolify la generará automáticamente)
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public

# Configuración de la Aplicación
PORT=3000
NODE_ENV=production
APP_URL=https://tu-dominio.com

# JWT Secret (IMPORTANTE: Cambia esto por una clave segura)
JWT_SECRET=tu-clave-jwt-super-secreta-cambiala-ahora

# Google Gemini API
GEMINI_API_KEY=tu-gemini-api-key-aqui
```

### 3. Configuración de Dominio

1. En Coolify, ve a la configuración de tu aplicación
2. Añade tu dominio personalizado
3. Coolify configurará automáticamente SSL con Let's Encrypt
4. Actualiza `APP_URL` con tu dominio final

### 4. Volúmenes Persistentes

El `docker-compose.yml` ya incluye dos volúmenes persistentes:

- **postgres_data**: Base de datos PostgreSQL
- **uploads_data**: Archivos subidos por usuarios (fotos, etc.)

Coolify gestiona estos volúmenes automáticamente.

### 5. Despliegue

1. Sube los cambios a tu repositorio Git (incluyendo `docker-compose.yaml`)
2. En Coolify, haz clic en **Deploy**
3. Coolify ejecutará:
   - Build de la imagen Docker
   - Migraciones de Prisma automáticamente
   - Inicio de los servicios (PostgreSQL + App)
   - Toda la información generada por la IA se guarda en PostgreSQL

## 🔧 Comandos Útiles

### Acceder a la base de datos
```bash
docker exec -it <container-name> psql -U voltbody -d voltbody
```

### Ver logs del servidor
```bash
docker logs -f <container-name>
```

### Ejecutar migraciones manualmente
```bash
docker exec -it <container-name> npx prisma migrate deploy
```

### Ver Prisma Studio
```bash
docker exec -it <container-name> npx prisma studio
```

## 🌟 Características Implementadas

✅ **Autenticación JWT**
- Login y registro por email
- Sesiones persistentes

✅ **Base de Datos PostgreSQL**
- Perfiles de usuario
- Rutinas de entrenamiento
- Planes de dieta
- Logs de ejercicios
- Fotos de progreso

✅ **Docker Multi-Stage Build**
- Imagen optimizada para producción
- Cache de dependencias

✅ **Almacenamiento Persistente**
- Datos de PostgreSQL
- Archivos de usuarios

✅ **Auto-Despliegue**
- Migraciones automáticas al iniciar
- Health checks configurados
- Reinicio automático en fallos

## 🔐 Seguridad

**IMPORTANTE**: Antes de desplegar en producción:

1. ✅ Cambia `JWT_SECRET` por una clave fuerte y aleatoria
2. ✅ Usa una contraseña segura para PostgreSQL
3. ✅ Configura HTTPS (Coolify lo hace automáticamente)
4. ✅ No expongas las variables de entorno en el código
5. ✅ Revisa los logs regularmente

## 📱 Uso de la Aplicación

1. **Registro**: Los usuarios pueden registrarse con email y contraseña
2. **Login**: Sistema de autenticación seguro con JWT
3. **Onboarding**: Configuración inicial del perfil
4. **Dashboard**: Rutinas, dieta, calendario y progreso personalizados
5. **Perfil**: Gestión de datos personales y fotos de progreso

## 🚀 Arquitectura

```
┌─────────────────┐
│   Coolify       │
│   (Orquestador) │
└────────┬────────┘
         │
    ┌────┴─────┐
    │          │
┌───▼──┐   ┌──▼────┐
│ App  │───│ PostgreSQL │
│ (Node)│   │  (DB)    │
└──────┘   └─────────┘
```

## 🛠️ Desarrollo Local

```bash
# Instalar dependencias
npm install

# Configurar base de datos local
npm run prisma:migrate

# Generar cliente Prisma
npm run prisma:generate

# Iniciar en desarrollo
npm run dev

# Iniciar servidor backend
npm run dev:server
```

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs en Coolify
2. Verifica que todas las variables de entorno estén configuradas
3. Asegúrate de que el contenedor de PostgreSQL esté saludable
4. Verifica la conectividad de red entre contenedores

---

**¡Listo!** 🎉 Tu aplicación VoltBody Powered está configurada para auto-desplegarse en Coolify bajo una sola URL.
