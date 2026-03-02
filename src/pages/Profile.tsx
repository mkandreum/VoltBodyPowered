import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { authService } from '../services/authService';
import { workoutService } from '../services/workoutService';
import { User, LogOut, Activity, Target, Clock, Scale, Ruler, Camera, Plus, Edit2, Check, Palette, Quote } from 'lucide-react';

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

  return (
    <div className="min-h-screen app-shell p-6 pb-32">
      <header className="mb-8 mt-4 flex justify-between items-center">
        <h1 className="brutal-title text-white flex items-center gap-3">
          <User className="app-accent" size={32} />
          👤 Perfil
        </h1>
        <button 
          onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
          className="pressable p-2 app-surface border border-[var(--app-border)] rounded-full hover:border-[color:var(--app-accent)]/50 transition-colors"
        >
          {isEditing ? <Check className="app-accent" /> : <Edit2 className="text-gray-400 hover:text-white transition-colors" />}
        </button>
      </header>

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
            className="pressable absolute bottom-0 right-0 bg-[var(--app-accent)] p-2 rounded-full text-black hover:brightness-95 transition-colors"
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
          <h2 className="text-2xl font-bold text-white mb-1">{profile.name || 'Usuario Volt'}</h2>
          <p className="app-accent font-mono text-sm glow-text">{profile.goal}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="app-surface border border-[var(--app-border)] rounded-3xl p-5 flex items-center gap-4">
          <Scale className="app-accent" size={24} />
          <div>
            <p className="text-xs text-gray-500 font-mono">Peso</p>
            {isEditing ? (
              <input 
                type="number" 
                value={editData.weight} 
                  onChange={(e) => setEditData({...editData, weight: e.target.value})}
                className="w-16 bg-black border border-[var(--app-accent)] rounded px-2 text-white font-bold"
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
                className="w-16 bg-black border border-[var(--app-accent)] rounded px-2 text-white font-bold"
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
      </div>

      <div className="glass-panel border border-[var(--app-border)] rounded-3xl p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Camera className="app-accent" size={20} />
            📸 Fotos de Progreso
          </h3>
          <button 
            onClick={() => progressInputRef.current?.click()}
            className="pressable p-2 bg-[var(--app-border)] rounded-full text-white hover:text-[var(--app-accent)] transition-colors"
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

      <div className="app-surface border border-[var(--app-border)] rounded-3xl p-6 mb-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Target className="app-accent" size={20} />
          Disponibilidad 📆
        </h3>
        <p className="text-gray-400 font-mono">{profile.schedule}</p>
      </div>

      <div className="app-surface border border-[var(--app-border)] rounded-3xl p-6 mb-8">
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
              className={`text-left px-4 py-3 rounded-xl border transition-all ${
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
          className="w-full bg-black border border-[var(--app-border)] rounded-xl py-3 px-4 text-white mb-4 focus:border-[var(--app-accent)] outline-none"
          placeholder="Escribe tu frase motivacional"
        />

        <button
          onClick={() => motivationInputRef.current?.click()}
          className="pressable w-full mb-4 bg-[var(--app-border)] text-white py-3 rounded-xl hover:text-[var(--app-accent)] transition-colors"
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

      <button
        onClick={logout}
        className="w-full bg-red-500/10 border border-red-500/30 text-red-500 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
      >
        <LogOut size={20} />
        🚪 Cerrar Sesión
      </button>
    </div>
  );
}
