import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { authService } from '../services/authService';
import { workoutService } from '../services/workoutService';
import { User, LogOut, Activity, Target, Clock, Scale, Ruler, Camera, Plus, Edit2, Check, Palette, Quote } from 'lucide-react';
import { listStagger } from '../lib/motion';

export default function Profile() {
  const {
    profile,
    profilePhoto,
    progressPhotos,
    setProfilePhoto,
    addProgressPhoto,
    updateProfile,
    logout,
    theme,
    setTheme,
    motivationPhrase,
    motivationPhoto,
    setMotivationPhrase,
    setMotivationPhoto,
    authToken,
    showToast,
  } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressInputRef = useRef<HTMLInputElement>(null);
  const motivationInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    weight: String(profile?.weight || ''),
    height: String(profile?.height || ''),
  });
  const [weeklyGoals, setWeeklyGoals] = useState([
    { id: 'habit-1', label: 'Completar 3 sesiones de fuerza', done: false },
    { id: 'habit-2', label: 'Dormir 7h al menos 5 dias', done: false },
    { id: 'habit-3', label: 'Cumplir proteina diaria 5 dias', done: false },
  ]);

  if (!profile) return null;

  const persistProfilePatch = async (patch: Record<string, unknown>, silent = true) => {
    if (!authToken) return;

    try {
      await authService.updateProfile(authToken, patch);
      if (!silent) {
        showToast({
          type: 'success',
          title: 'Perfil actualizado',
        });
      }
    } catch (error) {
      console.error('Error persisting profile patch:', error);
      if (!silent) {
        showToast({
          type: 'error',
          title: 'No se pudo guardar',
          message: 'Reintenta en unos segundos.',
        });
      }
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'progress' | 'motivation') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (type === 'profile') {
          const photo = reader.result as string;
          setProfilePhoto(photo);
          await persistProfilePatch({ profilePhoto: photo });
        } else if (type === 'progress') {
          const newPhoto = { date: new Date().toISOString(), url: reader.result as string };
          addProgressPhoto(newPhoto);

          if (authToken) {
            try {
              await workoutService.addPhoto(authToken, newPhoto);
            } catch (error) {
              console.error('Error persisting progress photo:', error);
            }
          }
        } else {
          const photo = reader.result as string;
          setMotivationPhoto(photo);
          await persistProfilePatch({ motivationPhoto: photo });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    const parsedWeight = Number(editData.weight) || profile.weight;
    const parsedHeight = Number(editData.height) || profile.height;

    updateProfile({ weight: parsedWeight, height: parsedHeight });
    // Persist to backend
    await persistProfilePatch(
      {
        weight: parsedWeight,
        height: parsedHeight,
        theme,
        motivationPhrase,
        motivationPhoto,
      },
      true
    );

    showToast({
      type: 'success',
      title: 'Cambios guardados ✅',
    });

    setIsEditing(false);
  };

  const handleThemeChange = async (nextTheme: 'aguamarina-negro' | 'verde-negro' | 'ocaso-negro') => {
    setTheme(nextTheme);
    await persistProfilePatch({ theme: nextTheme });
  };

  const handleMotivationPhraseBlur = async () => {
    await persistProfilePatch({ motivationPhrase });
  };

  const toggleWeeklyGoal = (id: string) => {
    setWeeklyGoals((prev) => prev.map((goal) => (goal.id === id ? { ...goal, done: !goal.done } : goal)));
  };

  const completedGoals = weeklyGoals.filter((goal) => goal.done).length;
  const weeklyGoalProgress = Math.round((completedGoals / weeklyGoals.length) * 100);

  return (
    <div className="min-h-screen app-shell px-4 pt-5 md:px-6 safe-bottom">
      <div className="page-wrap">
      <header className="mb-8 mt-2 flex justify-between items-center">
        <h1 className="brutal-title text-white flex items-center gap-3">
          <User className="app-accent" size={32} />
          👤 Perfil
        </h1>
        <button 
          onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
          className="tap-target pressable p-2 app-surface border border-[var(--app-border)] rounded-full hover:border-[color:var(--app-accent)]/50 transition-colors"
        >
          {isEditing ? <Check className="app-accent" /> : <Edit2 className="text-gray-400 hover:text-white transition-colors" />}
        </button>
      </header>

      <motion.div {...listStagger(0)}>
      <div className="glass-panel border border-[var(--app-border)] rounded-3xl p-6 mb-8 flex items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[color:var(--app-accent)]/10 rounded-full blur-3xl -mr-16 -mt-16" />
        
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[color:var(--app-accent)] to-black p-1 glow-box">
            <div className="w-full h-full bg-black rounded-full flex items-center justify-center border-2 border-[#121212] overflow-hidden">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="app-accent" size={40} />
              )}
            </div>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="tap-target pressable absolute bottom-0 right-0 bg-[var(--app-accent)] p-2 rounded-full text-black hover:brightness-95 transition-colors"
          >
            <Camera size={16} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => handlePhotoUpload(e, 'profile')} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold mb-1 headline-gradient">{profile.name || 'Usuario Volt'}</h2>
          <p className="app-accent font-mono text-sm glow-text">{profile.goal}</p>
        </div>
      </div>
      </motion.div>

      <motion.div {...listStagger(1)} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="app-surface border border-[var(--app-border)] rounded-3xl p-5 flex items-center gap-4">
          <Scale className="app-accent" size={24} />
          <div>
            <p className="text-xs text-gray-500 font-mono">Peso</p>
            {isEditing ? (
              <input 
                type="number" 
                value={editData.weight} 
                  onChange={(e) => setEditData({...editData, weight: e.target.value})}
                className="w-20 input-field rounded-lg px-2 py-1 text-sm font-bold"
              />
            ) : (
              <p className="text-lg font-bold text-white">{profile.weight} kg</p>
            )}
          </div>
        </div>
        <div className="app-surface border border-[var(--app-border)] rounded-3xl p-5 flex items-center gap-4">
          <Ruler className="app-accent" size={24} />
          <div>
            <p className="text-xs text-gray-500 font-mono">Altura</p>
            {isEditing ? (
              <input 
                type="number" 
                value={editData.height} 
                  onChange={(e) => setEditData({...editData, height: e.target.value})}
                className="w-20 input-field rounded-lg px-2 py-1 text-sm font-bold"
              />
            ) : (
              <p className="text-lg font-bold text-white">{profile.height} cm</p>
            )}
          </div>
        </div>
        <div className="app-surface border border-[var(--app-border)] rounded-3xl p-5 flex items-center gap-4">
          <Activity className="app-accent" size={24} />
          <div>
            <p className="text-xs text-gray-500 font-mono">Nivel</p>
            <p className="text-lg font-bold text-white capitalize">{profile.currentState.split(' ')[0]}</p>
          </div>
        </div>
        <div className="app-surface border border-[var(--app-border)] rounded-3xl p-5 flex items-center gap-4">
          <Clock className="app-accent" size={24} />
          <div>
            <p className="text-xs text-gray-500 font-mono">Edad</p>
            <p className="text-lg font-bold text-white">{profile.age} años</p>
          </div>
        </div>
      </motion.div>

      <div className="glass-panel border border-[var(--app-border)] rounded-3xl p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Camera className="app-accent" size={20} />
            📸 Fotos de Progreso
          </h3>
          <button 
            onClick={() => progressInputRef.current?.click()}
            className="tap-target pressable p-2 bg-[var(--app-border)] rounded-full text-white hover:text-[var(--app-accent)] transition-colors"
          >
            <Plus size={16} />
          </button>
          <input 
            type="file" 
            ref={progressInputRef} 
            onChange={(e) => handlePhotoUpload(e, 'progress')} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
        
        {progressPhotos.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {progressPhotos.map((photo, i) => (
              <div key={i} className="min-w-[120px] h-[160px] rounded-xl overflow-hidden border border-[var(--app-border)] relative">
                <img src={photo.url} alt="Progreso" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm p-1 text-center text-[10px] font-mono text-gray-300">
                  {new Date(photo.date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">Sube fotos para ver tu evolución.</p>
        )}
      </div>

      <motion.div {...listStagger(2)} className="panel-soft rounded-3xl p-6 mb-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Target className="app-accent" size={20} />
          Disponibilidad 📆
        </h3>
        <p className="text-gray-400 font-mono">{profile.schedule}</p>
      </motion.div>

      <div className="panel-soft rounded-3xl p-6 mb-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Palette className="app-accent" size={20} />
          Tema Visual 🎨
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {[
            { id: 'aguamarina-negro', label: '🌊 Aguamarina - Negro' },
            { id: 'verde-negro', label: '💚 Verde - Negro' },
            { id: 'ocaso-negro', label: '🌅 Ocaso - Negro' },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => handleThemeChange(option.id as 'aguamarina-negro' | 'verde-negro' | 'ocaso-negro')}
              className={`tap-target text-left px-4 py-3 rounded-xl border transition-all ${
                theme === option.id
                  ? 'border-[var(--app-accent)] bg-[color:var(--app-accent)]/10 text-[var(--app-accent)]'
                  : 'border-[var(--app-border)] text-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel border border-[var(--app-border)] rounded-3xl p-6 mb-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Quote className="app-accent" size={20} />
          Motivación 💪
        </h3>
        <input
          type="text"
          value={motivationPhrase}
          onChange={(e) => setMotivationPhrase(e.target.value)}
          onBlur={handleMotivationPhraseBlur}
          className="input-field mb-4"
          placeholder="Escribe tu frase motivacional"
        />

        <button
          onClick={() => motivationInputRef.current?.click()}
          className="tap-target pressable secondary-btn w-full mb-4 text-white py-3 rounded-xl hover:text-[var(--app-accent)] transition-colors"
        >
          Subir foto motivacional 📷
        </button>
        <input
          type="file"
          ref={motivationInputRef}
          onChange={(e) => handlePhotoUpload(e, 'motivation')}
          accept="image/*"
          className="hidden"
        />

        {motivationPhoto && (
          <div className="rounded-xl overflow-hidden border border-[var(--app-border)] relative">
            <img src={motivationPhoto} alt="Motivación" className="w-full h-48 object-cover" />
            <div className="absolute inset-0 bg-black/40 flex items-end p-3">
              <p className="text-sm text-white font-medium">{motivationPhrase}</p>
            </div>
          </div>
        )}
      </div>

      <div className="glass-panel border border-[var(--app-border)] rounded-3xl p-6 mb-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Target className="app-accent" size={20} />
          Metas semanales accionables
        </h3>
        <div className="mb-3 flex items-center justify-between text-xs text-gray-400">
          <span>Progreso semanal</span>
          <span>{completedGoals}/{weeklyGoals.length} metas</span>
        </div>
        <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-black/45">
          <div className="h-full rounded-full bg-[var(--app-accent)]" style={{ width: `${weeklyGoalProgress}%` }} />
        </div>
        <div className="space-y-2">
          {weeklyGoals.map((goal) => (
            <button
              key={goal.id}
              type="button"
              onClick={() => toggleWeeklyGoal(goal.id)}
              className={`tap-target w-full rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                goal.done
                  ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-300'
                  : 'border-[var(--app-border)] bg-black/30 text-gray-200'
              }`}
            >
              {goal.done ? '✅' : '⬜'} {goal.label}
            </button>
          ))}
        </div>
      </div>

      <motion.button
        {...listStagger(3)}
        onClick={logout}
        className="tap-target w-full danger-btn font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
      >
        <LogOut size={20} />
        🚪 Cerrar Sesión
      </motion.button>
      </div>
    </div>
  );
}
