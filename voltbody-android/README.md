# VoltBody Android App 📱⚡

> Versión nativa Android de **VoltBody Powered** — construida con Kotlin + Jetpack Compose.

---

## Arquitectura

```
voltbody-android/
├── app/src/main/java/com/voltbody/app/
│   ├── data/
│   │   ├── local/               # Room Database (entities + DAOs)
│   │   ├── preferences/         # DataStore (tokens, perfil, tema)
│   │   └── remote/              # Retrofit API + DTOs
│   ├── di/                      # Hilt Dependency Injection
│   ├── domain/
│   │   ├── model/               # Modelos de dominio (User, WorkoutDay, Meal…)
│   │   └── usecase/             # Lógica de negocio (FatigueIndex, RecoveryScore…)
│   ├── service/                 # BLE Heart Rate + Notifications
│   ├── ui/
│   │   ├── components/          # Componentes reutilizables (AppCard, BottomNav, Avatar3D…)
│   │   ├── navigation/          # NavGraph + rutas
│   │   ├── screens/             # Pantallas completas
│   │   │   ├── login/
│   │   │   ├── onboarding/
│   │   │   ├── home/
│   │   │   ├── workout/
│   │   │   ├── diet/
│   │   │   ├── calendar/
│   │   │   └── profile/
│   │   ├── theme/               # Color, Typography, Theme (3 temas)
│   │   └── viewmodel/           # AppViewModel (estado global)
│   ├── MainActivity.kt
│   └── VoltBodyApp.kt
└── app/src/main/res/
    ├── drawable/                # ic_volt.xml (icono del bolt)
    ├── values/                  # strings, colors, themes
    └── xml/                     # file_provider_paths, backup_rules…
```

---

## Stack tecnológico

| Capa | Librería |
|------|----------|
| UI | Jetpack Compose + Material3 |
| Navegación | Navigation Compose |
| DI | Hilt |
| Red | Retrofit 2 + OkHttp + Moshi |
| DB local | Room |
| Preferencias | DataStore |
| Imágenes | Coil |
| BLE | Android BluetoothGatt nativo |
| Animaciones | Compose Animation + Coroutines |
| Gráficas | Canvas Compose (custom) |
| Avatar | Canvas Compose (custom) |
| Async | Kotlin Coroutines + Flow |

---

## Temas de la app

Tres temas idénticos a la versión web:

| Clave | Acento | Fondo |
|-------|--------|-------|
| `verde-negro` | `#39FF14` neon green | `#09090C` |
| `aguamarina-negro` | `#3FF5D0` aquamarine | `#03110E` |
| `ocaso-negro` | `#F5813F` amber | `#120905` |

---

## Funcionalidades

### Autenticación
- Login / Registro con validación y mensajes de error localizados
- Token JWT persistido en DataStore (cifrado)
- Logout limpia DB + DataStore

### Onboarding multi-paso (6 pasos)
1. Datos personales (nombre, edad, género)
2. Métricas corporales (peso, altura, nivel)
3. Objetivo (meta, dirección de peso, plazo)
4. Horario (días/sem, duración, turno laboral)
5. Preferencias de dieta (proteínas, carbos)
6. Avatar físico configurable

Al finalizar llama a `POST /api/ai/generate-plan` y guarda rutina+dieta+insights.

### Home
- Saludo dinámico según hora del día
- Avatar 3D animado (sway animation con Compose Canvas)
- XP + Nivel con barra de progreso
- Racha inteligente, entrenos esta semana, series totales
- Recovery Score con check-in de sueño/HRV
- Fatigue Index por grupo muscular
- Vista previa del entreno de hoy con progreso
- Monitor cardíaco BLE (Polar, Garmin, Apple Watch, etc.)
- Gráfica de peso (8 semanas, canvas custom)
- Informe IA de progreso bajo demanda

### Workout
- Selector de día de la semana
- Lista de ejercicios con sets completados (puntos de progreso)
- Timer de sesión
- Timer de descanso (90s por defecto con skip)
- Log de series: pesos, reps, RIR
- Timer isométrico con display circular
- Sugerencias de sobrecarga progresiva
- Celebración al completar el entreno
- Sincronización automática al servidor

### Diet
- Plan completo de comidas con macros
- Toggle comida comida/no-comida por día
- Barras de macros (proteína, HC, grasa)
- **Swap de comida con IA** (`POST /api/ai/generate-alternative-meal`)
- Contador de hidratación (vasos de agua)

### Calendario
- Calendario mensual con navegación
- Días de entreno marcados (puntos de acento)
- Días completados marcados en verde
- Vista detallada del día seleccionado
- Resumen semanal (entrenos, series, racha)

### Perfil
- Foto de perfil (acceso a cámara/galería)
- Registro de peso con delta desde último log
- Selector de tema (verde/aguamarina/ocaso)
- Achievements (12 logros del catálogo, desbloqueados automáticamente)
- Objetivos semanales con toggle
- Activar/desactivar notificaciones
- Cerrar sesión

### BLE Heart Rate
- Escaneo automático de monitores cardíacos con perfil HR Service (`0x180D`)
- Actualización en tiempo real en Home
- Animación de pulso sincronizada con el BPM
- Compatible con Polar, Garmin, Wahoo, etc.

### Notificaciones
- Canal `workout_reminders`: recordatorios de entreno
- Canal `recovery_alerts`: alertas de recuperación
- Canal `achievements`: logros desbloqueados
- Se registran en `BootReceiver` para recrearse tras reinicio

---

## Setup / Instalación

### Prerrequisitos
- Android Studio Ladybug (2024.2) o superior
- JDK 17+
- Dispositivo / emulador con API 26+

### 1. Abrir en Android Studio
```bash
# Desde la raíz del monorepo
cd voltbody-android
# Abre la carpeta en Android Studio (File > Open)
```

### 2. Configurar la URL del servidor
Edita `voltbody-android/local.properties` (créalo si no existe):
```properties
# URL del backend VoltBody (sin barra final)
API_BASE_URL=http://10.0.2.2:3000/
# Para dispositivo físico en la misma red: http://192.168.x.x:3000/
# Para producción: https://tu-dominio.com/
```

O bien define la variable de entorno `API_BASE_URL` antes de compilar.

### 3. Compilar y ejecutar
```bash
./gradlew :app:installDebug
```

O directamente desde Android Studio con el botón ▶.

---

## Fuentes tipográficas (opcional pero recomendado)

Para replicar exactamente el estilo de la web, descarga y añade los TTF en `app/src/main/res/font/`:

| Fuente | Uso |
|--------|-----|
| Inter (Regular/Medium/SemiBold/Bold/ExtraBold/Black) | Cuerpo de texto |
| Barlow Condensed (Bold/ExtraBold/Black) | Títulos de display |
| JetBrains Mono (Bold) | Valores numéricos y métricas |

Luego actualiza `Type.kt` para referenciar `R.font.*`.

---

## Crear un repo independiente

Si quieres extraer este proyecto a su propio repositorio:

```bash
# Desde la raíz del monorepo
git subtree split --prefix=voltbody-android -b android-standalone

# Crear nuevo repo en GitHub
gh repo create TuOrg/VoltBodyAndroid --private

# Pushear
git push git@github.com:TuOrg/VoltBodyAndroid.git android-standalone:main
```

---

## Lint / Build

```bash
./gradlew :app:lintDebug        # Lint
./gradlew :app:testDebugUnitTest # Tests unitarios
./gradlew :app:assembleRelease  # APK release (requiere keystore)
```

---

## Permisos de Android

| Permiso | Motivo |
|---------|--------|
| `INTERNET` | API REST |
| `BLUETOOTH_SCAN/CONNECT` | Monitor cardíaco BLE |
| `CAMERA` | Foto de progreso |
| `READ_MEDIA_IMAGES` | Selección de fotos |
| `POST_NOTIFICATIONS` | Recordatorios y logros |
| `SCHEDULE_EXACT_ALARM` | Recordatorio puntual |
| `VIBRATE` | Feedback háptico en acciones |

---

## Notas de desarrollo

- **AppViewModel** es el estado global compartido entre todas las pantallas. Se inyecta con Hilt via `@HiltViewModel`.
- La base de datos Room se resetea en migraciones destructivas durante desarrollo (`fallbackToDestructiveMigration`). Para producción se deben escribir migraciones explícitas.
- El **avatar 3D** está implementado 100% con Compose Canvas — sin dependencias 3D externas. Replica visualmente el avatar Three.js del cliente web.
- Las **gráficas** también son Canvas custom — sin MPAndroidChart ni Vico — para reducir dependencias.
- El **BLE** usa el GATT profile estándar `0x180D / 0x2A37` compatible con cualquier monitor certificado Bluetooth LE.
