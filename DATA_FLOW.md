# Flujo de Datos - VoltBody Powered

## 📊 ¿Dónde se almacena todo?

### ✅ Base de Datos PostgreSQL (Persistente)

Toda la información generada por la IA y los datos del usuario se almacenan en PostgreSQL:

#### 1. **Datos de Usuario** (`User` table)
- Email
- Contraseña (hasheada con bcrypt)
- Nombre
- Fecha de creación

#### 2. **Perfil Completo** (`UserProfile` table)
```json
{
  "age": 25,
  "weight": 70,
  "height": 175,
  "gender": "Masculino",
  "goal": "Ganar masa muscular",
  "currentState": "Principiante",
  "schedule": "3 días a la semana, 1 hora",
  "workHours": "09:00 - 17:00",
  "mealTimes": {
    "breakfast": "08:00",
    "lunch": "14:00",
    "snack": "18:00",
    "dinner": "21:00"
  },
  "avatarConfig": {
    "muscleMass": 0.6,
    "bodyFat": 0.5
  },
  "routine": [
    {
      "day": "Lunes",
      "focus": "Pecho y Tríceps",
      "exercises": [...]
    }
  ],
  "diet": {
    "dailyCalories": 2500,
    "macros": {...},
    "meals": [...]
  },
  "insights": {
    "sleepRecommendation": "...",
    "estimatedResults": "...",
    "dailyQuote": "..."
  }
}
```

#### 3. **Logs de Entrenamiento** (`WorkoutLog` table)
- Cada ejercicio completado
- Peso levantado
- Repeticiones
- Fecha y hora

#### 4. **Fotos de Progreso** (`ProgressPhoto` table)
- URLs de fotos
- Fechas de captura
- Asociadas a cada usuario

### 🔄 Flujo de Almacenamiento

```
┌─────────────────────────────────────────────┐
│         ONBOARDING (Primera vez)            │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
          ┌───────────────┐
          │  Gemini AI    │
          │  (Genera plan)│
          └───────┬───────┘
                  │
                  ├─► routine (JSON)
                  ├─► diet (JSON)
                  └─► insights (JSON)
                  
                  ▼
    ┌──────────────────────────────┐
    │   authService.updateProfile  │
    │   (Envía a backend API)      │
    └──────────────┬───────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │   Express Backend   │
         │   PUT /api/profile  │
         └─────────┬───────────┘
                   │
                   ▼
            ┌─────────────┐
            │   Prisma    │
            │   (ORM)     │
            └──────┬──────┘
                   │
                   ▼
         ┌──────────────────┐
         │   PostgreSQL     │
         │   (BD Persistente)│
         └──────────────────┘
```

### 🔄 Sincronización

1. **Al Registrarse:**
   - Se crea usuario en BD
   - Se genera perfil vacío

2. **Durante Onboarding:**
   - IA genera plan personalizado
   - Se guarda en Zustand (local, temporalmente)
   - Se envía inmediatamente a BD vía API

3. **Durante Uso:**
   - Cada acción se guarda en BD:
     - Completar ejercicio → `WorkoutLog`
     - Subir foto → `ProgressPhoto`
     - Cambiar peso/altura → `UserProfile`

4. **Al Volver a Iniciar Sesión:**
   - Se carga todo desde BD
   - Zustand se sincroniza con BD
   - Nada se pierde

### 💾 Ubicación Física (Docker)

```yaml
volumes:
  postgres_data:      # ← AQUÍ está toda la BD
    driver: local
  uploads_data:       # ← AQUÍ están las fotos
    driver: local
```

**En el servidor de Coolify:**
- `/var/lib/docker/volumes/voltbody_postgres_data/_data`
- `/var/lib/docker/volumes/voltbody_uploads_data/_data`

### ⚡ Zustand (Store Local)

**Uso:** Solo para estado temporal de la UI durante la sesión activa.

**NO es persistente a largo plazo.** Se sincroniza desde BD al iniciar sesión.

### 🛡️ Respaldo de Datos

Todo está en PostgreSQL, así que:

```bash
# Backup
docker exec voltbody-db pg_dump -U voltbody voltbody > backup.sql

# Restaurar
docker exec -i voltbody-db psql -U voltbody voltbody < backup.sql
```

### 📝 Resumen

| ¿Qué? | ¿Dónde? | ¿Cuándo? |
|-------|---------|----------|
| Datos de login | PostgreSQL | Registro |
| Plan IA (routine, diet, insights) | PostgreSQL | Onboarding |
| Logs de ejercicios | PostgreSQL | Cada workout |
| Fotos de progreso | PostgreSQL + Volume | Cada upload |
| Estado UI temporal | Zustand (memoria) | Durante sesión |
| Tokens JWT | LocalStorage | Login |

## ✅ Conclusión

**SÍ, TODA la información generada por la IA se almacena en la base de datos PostgreSQL** con almacenamiento persistente en volúmenes de Docker, lo que significa que:

- ✅ Sobrevive a reinicios del contenedor
- ✅ Se puede hacer backup fácilmente
- ✅ Cada usuario tiene sus propios datos aislados
- ✅ Nada se pierde al cerrar sesión
- ✅ Se puede acceder desde cualquier dispositivo

---

**Archivo actualizado:** `docker-compose.yml` → `docker-compose.yaml` ✅
