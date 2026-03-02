<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# VoltBody Powered 🔋

**Tu entrenador personal inteligente con IA** - Con autenticación de usuarios, base de datos PostgreSQL y despliegue automático en Coolify.

## 🚀 Características

- ✅ **Autenticación JWT**: Login y registro con email
- ✅ **Perfiles Personalizados**: Cada usuario tiene sus propios datos
- ✅ **IA con Google Gemini**: Rutinas y dietas generadas por IA
- ✅ **Base de Datos PostgreSQL**: Todo se almacena persistentemente
- ✅ **Docker Compose**: Despliegue automático en Coolify

## 🏃 Ejecutar Localmente

### Prerequisitos
- Node.js 20+
- Docker (para PostgreSQL)

### Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Edita .env con tus valores (JWT_SECRET, GEMINI_API_KEY, etc.)

# 3. Iniciar PostgreSQL
docker run --name voltbody-db \
  -e POSTGRES_PASSWORD=voltbody123 \
  -e POSTGRES_USER=voltbody \
  -e POSTGRES_DB=voltbody \
  -p 5432:5432 -d postgres:16-alpine

# 4. Ejecutar migraciones
npx prisma migrate dev
npx prisma generate

# 5. Iniciar aplicación (2 terminales)
npm run dev          # Terminal 1: Frontend
npm run dev:server   # Terminal 2: Backend API
```

**Abrir:** http://localhost:3000

## 🚢 Despliegue en Coolify

### 1. Configuración en Coolify
- Tipo: **Docker Compose**
- Coolify detecta automáticamente `docker-compose.yaml`

### 2. Variables de Entorno Requeridas

**⚠️ IMPORTANTE:** NO configures `PORT` - Coolify lo gestiona automáticamente.

```env
# Base de Datos
POSTGRES_USER=voltbody
POSTGRES_PASSWORD=tu_password_segura_aqui
POSTGRES_DB=voltbody
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public

# Aplicación
NODE_ENV=production
APP_URL=https://tu-dominio.coolify.app

# Seguridad (CAMBIAR EN PRODUCCIÓN)
JWT_SECRET=genera_una_clave_aleatoria_de_32_caracteres

# Google Gemini AI
GEMINI_API_KEY=tu-api-key-de-gemini
```

### 3. Deploy
1. Conecta tu repositorio Git a Coolify
2. Configura las variables de entorno
3. Haz push al repositorio
4. Coolify despliega automáticamente

✅ **Incluye:**
- Migraciones de Prisma automáticas
- SSL con Let's Encrypt
- Volúmenes persistentes (PostgreSQL + uploads)
- Health checks
- Reinicio automático

## 🛠️ Stack Técnico

| Categoría | Tecnología |
|-----------|------------|
| **Frontend** | React 19, TypeScript, TailwindCSS, Motion, Three.js |
| **Backend** | Node.js, Express, Prisma ORM |
| **Base de Datos** | PostgreSQL 16 |
| **Autenticación** | JWT + bcryptjs |
| **IA** | Google Gemini API |
| **DevOps** | Docker, Docker Compose, Coolify |

## 📦 Almacenamiento

Toda la información generada por la IA se guarda en PostgreSQL:
- ✅ Rutinas de entrenamiento
- ✅ Planes de dieta
- ✅ Insights y recomendaciones
- ✅ Logs de ejercicios
- ✅ Fotos de progreso

## 🔐 Seguridad

- Contraseñas hasheadas con bcrypt
- Autenticación JWT con expiración
- Variables de entorno seguras
- HTTPS en producción (Coolify)
- Protección SQL injection (Prisma)

---

View original app in AI Studio: https://ai.studio/apps/c280fbb9-224f-4be6-8bd4-670aeef9ffbc
