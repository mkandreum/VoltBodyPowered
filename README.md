<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# VoltBody Powered 🔋

**Tu entrenador personal inteligente con IA** - Ahora con autenticación de usuarios, base de datos PostgreSQL y despliegue automático en Coolify.

## 🚀 Características

- ✅ **Autenticación de Usuario**: Login y registro con email
- ✅ **Perfiles Personalizados**: Cada usuario tiene su propio perfil
- ✅ **IA con Google Gemini**: Planes personalizados
- ✅ **Base de Datos PostgreSQL**: Almacenamiento persistente
- ✅ **Docker & Coolify**: Auto-despliegue con una sola URL

## 🏃 Ejecutar Localmente

**Prerequisitos:** Node.js 20+, Docker (opcional para PostgreSQL)

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   # Edita .env con tus valores
   ```

3. **Iniciar PostgreSQL** (con Docker o local):
   ```bash
   docker run --name voltbody-db \
     -e POSTGRES_PASSWORD=voltbody123 \
     -e POSTGRES_USER=voltbody \
     -e POSTGRES_DB=voltbody \
     -p 5432:5432 -d postgres:16-alpine
   ```

4. **Ejecutar migraciones de Prisma:**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Iniciar la aplicación:**
   ```bash
   # Frontend (terminal 1)
   npm run dev
   
   # Backend API (terminal 2)
   npm run dev:server
   ```

6. **Abrir:** http://localhost:3000

## 🚢 Despliegue en Coolify

Para despliegue en producción con Coolify, consulta la guía completa: **[COOLIFY_SETUP.md](./COOLIFY_SETUP.md)**

### Resumen rápido:
1. Crea proyecto en Coolify con Docker Compose
2. Sube `docker-compose.yaml` y Dockerfile
3. Configura variables de entorno (ver `.env.example`)
4. Conecta repositorio Git
5. Deploy automático ✨

**Nota:** Toda la información generada por la IA (rutinas, dietas, insights) se almacena automáticamente en PostgreSQL.

## 🔑 Variables de Entorno Requeridas

```env
DATABASE_URL=postgresql://user:password@localhost:5432/voltbody
JWT_SECRET=your-secret-key-here
GEMINI_API_KEY=your-gemini-api-key
APP_URL=http://localhost:3000
```

## 📱 Uso

1. **Registro** → Crea tu cuenta
2. **Onboarding** → Completa tu perfil
3. **Dashboard** → Rutinas y dieta personalizadas
4. **Progreso** → Sube fotos y registra entrenamientos

## 🛠️ Stack Técnico

**Frontend:** React 19, TypeScript, TailwindCSS, Motion, Three.js  
**Backend:** Node.js, Express, Prisma, PostgreSQL, JWT  
**DevOps:** Docker, Docker Compose, Coolify

## 📞 Soporte

- Ver logs: `docker logs voltbody-app`
- Prisma Studio: `npx prisma studio`
- Documentación completa: [COOLIFY_SETUP.md](./COOLIFY_SETUP.md)

---

View original app in AI Studio: https://ai.studio/apps/c280fbb9-224f-4be6-8bd4-670aeef9ffbc
