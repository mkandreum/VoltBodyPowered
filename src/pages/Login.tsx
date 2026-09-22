import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Mail, Lock, User, LogIn, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { authService } from '../services/authService';
import { workoutService } from '../services/workoutService';
import { useAppStore } from '../store/useAppStore';
import SplashScreen from '../components/SplashScreen';

export default function Login() {
  const {
    setAuthToken,
    setUser,
    setProfile,
    setProfilePhoto,
    setRoutine,
    setDiet,
    setInsights,
    completeOnboarding,
    setTheme,
    setMotivationPhrase,
    setMotivationPhoto,
    setLogs,
    setProgressPhotos,
    setWeightLogs,
  } = useAppStore();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response;
      if (isLogin) {
        response = await authService.login({
          email: formData.email,
          password: formData.password
        });
      } else {
        response = await authService.register({
          email: formData.email,
          password: formData.password,
          name: formData.name
        });
      }

      // ── Instant State Hydration from Login Response ──────────
      // The backend /auth/login route already returns user, profile, routine,
      // diet, and insights in the response payload. We hydrate the store immediately
      // to achieve sub-100ms instant transitions without waterfall network roundtrips.
      if (isLogin) {
        const profileData = (response as any).profile;
        const routineData = (response as any).routine || profileData?.routine;
        const dietData = (response as any).diet || profileData?.diet;

        if (profileData && routineData && dietData) {
          const appPreferences = profileData.insights?.appPreferences || {};

          setAuthToken(response.token);
          setUser(response.user);
          setProfile({
            name: response.user.name || '',
            age: profileData.age,
            weight: profileData.weight,
            height: profileData.height,
            gender: profileData.gender,
            goal: profileData.goal,
            currentState: profileData.currentState,
            schedule: profileData.schedule,
            workHours: profileData.workHours,
            trainingDaysPerWeek: profileData.trainingDaysPerWeek || appPreferences.trainingDaysPerWeek || 3,
            sessionMinutes: profileData.sessionMinutes || appPreferences.sessionMinutes || 45,
            goalDirection: profileData.goalDirection || appPreferences.goalDirection || 'Perder',
            goalTargetKg: profileData.goalTargetKg || appPreferences.goalTargetKg || 5,
            goalTimelineMonths: profileData.goalTimelineMonths || appPreferences.goalTimelineMonths || 3,
            mealTimes: {
              breakfast: profileData.mealTimes?.breakfast || '08:00',
              brunch: profileData.mealTimes?.brunch || '11:30',
              lunch: profileData.mealTimes?.lunch || '14:00',
              snack: profileData.mealTimes?.snack || '18:00',
              dinner: profileData.mealTimes?.dinner || '21:00',
            },
            foodPreferences: {
              vegetables: profileData.foodPreferences?.vegetables || appPreferences.foodPreferences?.vegetables || [],
              carbs: profileData.foodPreferences?.carbs || appPreferences.foodPreferences?.carbs || [],
              proteins: profileData.foodPreferences?.proteins || appPreferences.foodPreferences?.proteins || [],
            },
            weeklySpecialSession: profileData.weeklySpecialSession || appPreferences.weeklySpecialSession || {
              enabled: false,
              activity: 'Zumba',
              day: 'Sábado',
              durationMinutes: 60,
            },
            avatarConfig: profileData.avatarConfig ?? { muscleMass: 0.5, bodyFat: 0.5 },
          });
          setRoutine(routineData);
          setDiet(dietData);
          if (profileData.insights || (response as any).insights) {
            setInsights(profileData.insights || (response as any).insights);
          }
          if (profileData.theme || appPreferences.theme) {
            setTheme(profileData.theme || appPreferences.theme);
          }
          if (profileData.motivationPhrase || appPreferences.motivationPhrase || (response as any).motivationPhrase) {
            setMotivationPhrase(profileData.motivationPhrase || appPreferences.motivationPhrase || (response as any).motivationPhrase);
          }
          if (profileData.motivationPhoto || (response as any).motivationPhoto) {
            setMotivationPhoto(profileData.motivationPhoto || (response as any).motivationPhoto);
          }
          if (profileData.profilePhoto || (response as any).profilePhoto) {
            setProfilePhoto(profileData.profilePhoto || (response as any).profilePhoto);
          }
          completeOnboarding();

          // Non-blocking background sync for workout logs, photos, and weight logs
          Promise.allSettled([
            workoutService.getLogs(response.token),
            workoutService.getPhotos(response.token),
            workoutService.getWeightLogs(response.token),
          ]).then(([logsRes, photosRes, weightsRes]) => {
            if (logsRes.status === 'fulfilled' && Array.isArray(logsRes.value)) setLogs(logsRes.value);
            if (photosRes.status === 'fulfilled' && Array.isArray(photosRes.value)) setProgressPhotos(photosRes.value);
            if (weightsRes.status === 'fulfilled' && Array.isArray(weightsRes.value)) setWeightLogs(weightsRes.value);
          });

          return;
        }

        // Fallback: If backend payload didn't include full profile, fetch concurrently
        try {
          const profile = await authService.getProfile(response.token);
          if (profile && profile.routine && profile.diet) {
            const appPreferences = profile.insights?.appPreferences || {};

            setAuthToken(response.token);
            setUser(response.user);
            setProfile({
              name: response.user.name || '',
              age: profile.age,
              weight: profile.weight,
              height: profile.height,
              gender: profile.gender,
              goal: profile.goal,
              currentState: profile.currentState,
              schedule: profile.schedule,
              workHours: profile.workHours,
              trainingDaysPerWeek: profile.trainingDaysPerWeek || appPreferences.trainingDaysPerWeek || 3,
              sessionMinutes: profile.sessionMinutes || appPreferences.sessionMinutes || 45,
              goalDirection: profile.goalDirection || appPreferences.goalDirection || 'Perder',
              goalTargetKg: profile.goalTargetKg || appPreferences.goalTargetKg || 5,
              goalTimelineMonths: profile.goalTimelineMonths || appPreferences.goalTimelineMonths || 3,
              mealTimes: {
                breakfast: profile.mealTimes?.breakfast || '08:00',
                brunch: profile.mealTimes?.brunch || '11:30',
                lunch: profile.mealTimes?.lunch || '14:00',
                snack: profile.mealTimes?.snack || '18:00',
                dinner: profile.mealTimes?.dinner || '21:00',
              },
              foodPreferences: {
                vegetables: profile.foodPreferences?.vegetables || appPreferences.foodPreferences?.vegetables || [],
                carbs: profile.foodPreferences?.carbs || appPreferences.foodPreferences?.carbs || [],
                proteins: profile.foodPreferences?.proteins || appPreferences.foodPreferences?.proteins || [],
              },
              weeklySpecialSession: profile.weeklySpecialSession || appPreferences.weeklySpecialSession || {
                enabled: false,
                activity: 'Zumba',
                day: 'Sábado',
                durationMinutes: 60,
              },
              avatarConfig: profile.avatarConfig ?? { muscleMass: 0.5, bodyFat: 0.5 },
            });
            setRoutine(profile.routine);
            setDiet(profile.diet);
            if (profile.insights) setInsights(profile.insights);
            if (profile.theme || appPreferences.theme) setTheme(profile.theme || appPreferences.theme);
            if (profile.motivationPhrase || appPreferences.motivationPhrase) setMotivationPhrase(profile.motivationPhrase || appPreferences.motivationPhrase);
            if (profile.motivationPhoto) setMotivationPhoto(profile.motivationPhoto);
            if (profile.profilePhoto) setProfilePhoto(profile.profilePhoto);
            completeOnboarding();

            Promise.allSettled([
              workoutService.getLogs(response.token),
              workoutService.getPhotos(response.token),
              workoutService.getWeightLogs(response.token),
            ]).then(([logsRes, photosRes, weightsRes]) => {
              if (logsRes.status === 'fulfilled' && Array.isArray(logsRes.value)) setLogs(logsRes.value);
              if (photosRes.status === 'fulfilled' && Array.isArray(photosRes.value)) setProgressPhotos(photosRes.value);
              if (weightsRes.status === 'fulfilled' && Array.isArray(weightsRes.value)) setWeightLogs(weightsRes.value);
            });

            return;
          }
        } catch (err) {
          console.error('Could not restore saved plan, proceeding to onboarding:', err);
        }
      }

      // New registration or no saved profile: set auth and proceed to onboarding
      setAuthToken(response.token);
      setUser(response.user);
    } catch (err: any) {
      setError(err.message || 'Ha ocurrido un error al conectar');
    } finally {
      setLoading(false);
    }
  };

  // While login/register API calls are in flight, show the splash screen so the
  // user never sees the form flicker or the Onboarding steps appear.
  if (loading) {
    return <SplashScreen />;
  }

  return (
    <div className="min-h-screen app-shell flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden safe-top safe-bottom">
      {/* Dynamic ambient lighting backdrop */}
      <div className="absolute -top-32 -left-20 w-80 h-80 rounded-full bg-[color:var(--app-accent)]/15 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-[color:var(--app-accent)]/10 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[420px] relative z-10 my-auto"
      >
        {/* iOS App Brand Header */}
        <div className="text-center mb-7">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-[22px] bg-gradient-to-br from-white/10 to-white/5 border border-white/15 mb-4 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-xl relative group"
          >
            <div className="absolute inset-0 rounded-[22px] bg-[color:var(--app-accent)]/10 blur-md pointer-events-none" />
            <Zap className="w-10 h-10 app-accent drop-shadow-[0_0_12px_var(--app-accent-dim)]" strokeWidth={2.4} />
          </motion.div>
          <p className="text-[11px] font-mono tracking-[0.24em] uppercase text-gray-400 font-semibold mb-1">
            VoltBody Ecosystem
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            MODO <span className="headline-gradient">BESTIA</span>
          </h1>
          <p className="text-xs text-gray-400 font-normal leading-relaxed max-w-xs mx-auto">
            Entrenamiento de alta precisión y nutrición guiada por IA.
          </p>
        </div>

        {/* Liquid Glass Form Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="glass-panel border border-white/10 rounded-3xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] relative overflow-hidden"
        >
          {/* iOS Segmented Control */}
          <div className="flex p-1 mb-6 bg-black/50 rounded-2xl border border-white/10 relative">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`tap-target relative flex-1 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all z-10 flex items-center justify-center ${
                isLogin ? 'text-black font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              {isLogin && (
                <motion.div
                  layoutId="authTabIndicator"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="absolute inset-0 bg-[var(--app-accent)] rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.4)] z-[-1]"
                />
              )}
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`tap-target relative flex-1 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all z-10 flex items-center justify-center ${
                !isLogin ? 'text-black font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              {!isLogin && (
                <motion.div
                  layoutId="authTabIndicator"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className="absolute inset-0 bg-[var(--app-accent)] rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.4)] z-[-1]"
                />
              )}
              Crear Cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence initial={false}>
              {!isLogin && (
                <motion.div
                  key="name-field"
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <label htmlFor="register-name" className="block text-xs font-medium text-gray-300 mb-1.5 ml-1">
                    Nombre completo
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-gray-400 pointer-events-none flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      id="register-name"
                      type="text"
                      required={!isLogin}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input-field min-h-[50px] pl-10 pr-4 text-[15px] bg-black/40 rounded-2xl border-white/10 focus:border-[var(--app-accent)]"
                      placeholder="Ej. Alex Vega"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-gray-300 mb-1.5 ml-1">
                Correo Electrónico
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-gray-400 pointer-events-none flex items-center justify-center">
                  <Mail className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field min-h-[50px] pl-10 pr-4 text-[15px] bg-black/40 rounded-2xl border-white/10 focus:border-[var(--app-accent)]"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-medium text-gray-300 mb-1.5 ml-1">
                Contraseña
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-gray-400 pointer-events-none flex items-center justify-center">
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-field min-h-[50px] pl-10 pr-12 text-[15px] bg-black/40 rounded-2xl border-white/10 focus:border-[var(--app-accent)] tracking-normal font-sans"
                  placeholder="••••••••"
                  minLength={6}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="tap-target absolute right-1 w-11 h-11 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-3.5 flex items-center gap-2.5 text-rose-300 text-xs font-medium"
              >
                <AlertCircle size={16} className="text-rose-400 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              className="tap-target pulse-surface pressable primary-btn w-full min-h-[52px] rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 mt-3 shadow-lg"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLogin ? 'Iniciar Sesión' : 'Comenzar Registro'}</span>
              <ArrowRight className="w-4 h-4 ml-0.5 opacity-75" />
            </motion.button>
          </form>
        </motion.div>

        {/* Footer info */}
        <p className="text-center text-gray-500 text-[11px] mt-6 tracking-tight">
          Protegido con encriptación de extremo a extremo · VoltBody AI
        </p>
      </motion.div>
    </div>
  );
}

