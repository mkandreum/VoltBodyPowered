import { useState } from 'react';
import { motion } from 'motion/react';
import { Zap, Mail, Lock, User, LogIn } from 'lucide-react';
import { authService } from '../services/authService';
import { workoutService } from '../services/workoutService';
import { useAppStore } from '../store/useAppStore';

export default function Login() {
  const {
    setAuthToken,
    setUser,
    setProfile,
    setRoutine,
    setDiet,
    setInsights,
    completeOnboarding,
    setTheme,
    setMotivationPhrase,
    setMotivationPhoto,
    setLogs,
    setProgressPhotos,
  } = useAppStore();
  const [isLogin, setIsLogin] = useState(true);
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

      setAuthToken(response.token);
      setUser(response.user);

      // If logging in (not registering), try to restore saved plan from backend
      if (isLogin) {
        try {
          const profile = await authService.getProfile(response.token);
          if (profile && profile.routine && profile.diet) {
            const appPreferences = profile.insights?.appPreferences || {};

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
              avatarConfig: profile.avatarConfig,
            });
            setRoutine(profile.routine);
            setDiet(profile.diet);
            if (profile.insights) {
              setInsights(profile.insights);
            }
            if (profile.theme || appPreferences.theme) {
              setTheme(profile.theme || appPreferences.theme);
            }
            if (profile.motivationPhrase || appPreferences.motivationPhrase) {
              setMotivationPhrase(profile.motivationPhrase || appPreferences.motivationPhrase);
            }
            if (profile.motivationPhoto) {
              setMotivationPhoto(profile.motivationPhoto);
            }

            try {
              const [logs, photos] = await Promise.all([
                workoutService.getLogs(response.token),
                workoutService.getPhotos(response.token),
              ]);
              setLogs(logs);
              setProgressPhotos(photos);
            } catch (syncError) {
              console.error('Could not sync logs/photos from backend:', syncError);
            }

            completeOnboarding();
          }
        } catch (err) {
          console.error('Could not restore saved plan, proceeding to onboarding:', err);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ha ocurrido un error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen app-shell flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-36 -left-24 w-72 h-72 rounded-full bg-[color:var(--app-accent)]/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-28 -right-10 w-64 h-64 rounded-full bg-[color:var(--app-accent)]/10 blur-3xl pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[color:var(--app-accent)]/15 border border-[color:var(--app-accent)]/35 mb-4 glow-box"
          >
            <Zap className="w-10 h-10 app-accent" />
          </motion.div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">⚡ VoltBody OS</p>
          <h1 className="brutal-title mb-1 headline-gradient">🦁 MODO BESTIA</h1>
          <p className="text-gray-400">🤖 Entrena, come y evoluciona con IA.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-panel border border-[var(--app-border)] rounded-3xl p-7 md:p-8"
        >
          <div className="flex gap-2 mb-6 bg-black/40 rounded-xl p-1 border border-[var(--app-border)]">
            <button
              onClick={() => setIsLogin(true)}
              className={`pressable flex-1 py-2.5 rounded-lg font-medium transition-all ${
                isLogin
                  ? 'bg-[var(--app-accent)] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`pressable flex-1 py-2.5 rounded-lg font-medium transition-all ${
                !isLogin
                  ? 'bg-[var(--app-accent)] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field py-3 pl-11 pr-4"
                    placeholder="Tu nombre"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field py-3 pl-11 pr-4"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-field py-3 pl-11 pr-4"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="pulse-surface pressable primary-btn w-full py-3.5 rounded-xl font-semibold transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Procesando...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                </>
              )}
            </button>
          </form>
        </motion.div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Al continuar, aceptas nuestros términos y condiciones
        </p>
      </motion.div>
    </div>
  );
}
