# VoltBody Powered 🔋

Una aplicación web de entrenamiento personal inteligente con IA, ahora con autenticación de usuarios y despliegue automático en Coolify.

## 🚀 Características

- **Autenticación de Usuario**: Login y registro con email y contraseña
- **Perfiles Personalizados**: Cada usuario tiene su propio perfil y datos
- **IA con Google Gemini**: Planes de entrenamiento y dieta personalizados
- **Rutinas Adaptativas**: Ejercicios adaptados a tu nivel y objetivos
- **Seguimiento de Progreso**: Fotos, logs de ejercicios y calendario
- **Avatar 3D**: Representación visual de tu progreso
- **Base de Datos PostgreSQL**: Almacenamiento persistente con Prisma
- **Docker & Coolify**: Despliegue automático con un solo comando

## 🛠️ Stack Técnico

### Frontend
- React 19 + TypeScript
- Vite
- TailwindCSS
- Motion (Framer Motion)
- Zustand (Estado global)
- Three.js + React Three Fiber (Avatar 3D)

### Backend
- Node.js + Express
- Prisma ORM
- PostgreSQL
- JWT Authentication
- bcryptjs

### DevOps
- Docker & Docker Compose
- Coolify
- Multi-stage builds

## 📦 Instalación Local

```bash
# Clonar el repositorio
git clone <tu-repo>
cd VoltBodyPowered

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# Iniciar PostgreSQL (con Docker)
docker run --name voltbody-db -e POSTGRES_PASSWORD=voltbody123 -e POSTGRES_USER=voltbody -e POSTGRES_DB=voltbody -p 5432:5432 -d postgres:16-alpine

# Ejecutar migraciones
npx prisma migrate dev

# Generar cliente Prisma
npx prisma generate

# Iniciar frontend en modo desarrollo
npm run dev

# En otra terminal, iniciar backend
npm run dev:server
```

## 🚢 Despliegue en Coolify

Sigue las instrucciones detalladas en [COOLIFY_SETUP.md](./COOLIFY_SETUP.md)

### Resumen Rápido:

1. Crea un proyecto en Coolify con Docker Compose
2. Configura las variables de entorno (ver `.env.example`)
3. Conecta tu repositorio Git
4. Deploy automático en cada push

## 🔑 Variables de Entorno

```env
# Base de datos
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT
JWT_SECRET=tu-secret-key-segura

# Google Gemini
GEMINI_API_KEY=tu-api-key

# App
APP_URL=https://tu-dominio.com
PORT=3000
NODE_ENV=production
```

## 📱 Uso

1. **Registro**: Crea tu cuenta con email y contraseña
2. **Onboarding**: Completa tu perfil inicial
3. **Dashboard**: Accede a tus rutinas y planes personalizados
4. **Entrenamiento**: Sigue tus ejercicios con videos guía
5. **Dieta**: Consulta tu plan nutricional personalizado
6. **Progreso**: Sube fotos y registra tus ejercicios

## 🗂️ Estructura del Proyecto

```
VoltBodyPowered/
├── src/
│   ├── components/     # Componentes reutilizables
│   ├── pages/          # Páginas de la aplicación
│   ├── services/       # Servicios API
│   └── store/          # Estado global (Zustand)
├── server/
│   ├── routes/         # Rutas API
│   ├── middleware/     # Middleware (auth, etc.)
│   └── index.js        # Servidor Express
├── prisma/
│   ├── schema.prisma   # Esquema de base de datos
│   └── migrations/     # Migraciones
├── Dockerfile          # Imagen Docker multi-stage
├── docker-compose.yml  # Orquestación de servicios
└── COOLIFY_SETUP.md    # Guía de despliegue
```

## 🔐 Seguridad

- ✅ Contraseñas hasheadas con bcrypt
- ✅ Autenticación JWT
- ✅ Tokens con expiración
- ✅ Variables de entorno seguras
- ✅ HTTPS en producción (Coolify)
- ✅ SQL injection protection (Prisma)

## 🛣️ Roadmap

- [ ] OAuth con Google/GitHub
- [ ] Notificaciones push
- [ ] App móvil nativa
- [ ] Integración con wearables
- [ ] Chat con coach IA en tiempo real
- [ ] Marketplace de rutinas

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles

## 👨‍💻 Autor

Daniel González - [VoltBody Powered](https://voltbody.com)

---

**Hecho con ⚡ por VoltBody**
