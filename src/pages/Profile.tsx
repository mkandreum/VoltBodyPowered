import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { authService } from '../services/authService';
import { User, Settings, LogOut, Activity, Target, Clock, Scale, Ruler, Camera, Plus, Edit2, Check } from 'lucide-react';

export default function Profile() {
  const { profile, profilePhoto, progressPhotos, setProfilePhoto, addProgressPhoto, updateProfile, logout } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ weight: profile?.weight || 0, height: profile?.height || 0 });

  if (!profile) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'progress') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'profile') {
          setProfilePhoto(reader.result as string);
        } else {
          addProgressPhoto({ date: new Date().toISOString(), url: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    updateProfile({ weight: editData.weight, height: editData.height });
    // Persist to backend
    const token = useAppStore.getState().authToken;
    if (token) {
      try {
        await authService.updateProfile(token, { weight: editData.weight, height: editData.height });
      } catch (e) {
        console.error('Error saving profile to backend:', e);
      }
    }
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] p-6 pb-32">
      <header className="mb-8 mt-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <User className="text-[#39ff14]" size={32} />
          Perfil
        </h1>
        <button 
          onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
          className="p-2 bg-[#121212] border border-[#262626] rounded-full hover:border-[#39ff14]/50 transition-colors"
        >
          {isEditing ? <Check className="text-[#39ff14]" /> : <Edit2 className="text-gray-400 hover:text-white transition-colors" />}
        </button>
      </header>

      <div className="bg-[#121212] border border-[#262626] rounded-3xl p-6 mb-8 flex items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#39ff14]/5 rounded-full blur-3xl -mr-16 -mt-16" />
        
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#39ff14] to-black p-1 glow-box">
            <div className="w-full h-full bg-black rounded-full flex items-center justify-center border-2 border-[#121212] overflow-hidden">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="text-[#39ff14]" size={40} />
              )}
            </div>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 bg-[#39ff14] p-2 rounded-full text-black hover:bg-[#32e612] transition-colors"
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
          <p className="text-[#39ff14] font-mono text-sm glow-text">{profile.goal}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[#121212] border border-[#262626] rounded-3xl p-5 flex items-center gap-4">
          <Scale className="text-[#39ff14]" size={24} />
          <div>
            <p className="text-xs text-gray-500 font-mono">Peso</p>
            {isEditing ? (
              <input 
                type="number" 
                value={editData.weight} 
                onChange={(e) => setEditData({...editData, weight: Number(e.target.value)})}
                className="w-16 bg-black border border-[#39ff14] rounded px-2 text-white font-bold"
              />
            ) : (
              <p className="text-lg font-bold text-white">{profile.weight} kg</p>
            )}
          </div>
        </div>
        <div className="bg-[#121212] border border-[#262626] rounded-3xl p-5 flex items-center gap-4">
          <Ruler className="text-[#39ff14]" size={24} />
          <div>
            <p className="text-xs text-gray-500 font-mono">Altura</p>
            {isEditing ? (
              <input 
                type="number" 
                value={editData.height} 
                onChange={(e) => setEditData({...editData, height: Number(e.target.value)})}
                className="w-16 bg-black border border-[#39ff14] rounded px-2 text-white font-bold"
              />
            ) : (
              <p className="text-lg font-bold text-white">{profile.height} cm</p>
            )}
          </div>
        </div>
        <div className="bg-[#121212] border border-[#262626] rounded-3xl p-5 flex items-center gap-4">
          <Activity className="text-[#39ff14]" size={24} />
          <div>
            <p className="text-xs text-gray-500 font-mono">Nivel</p>
            <p className="text-lg font-bold text-white capitalize">{profile.currentState.split(' ')[0]}</p>
          </div>
        </div>
        <div className="bg-[#121212] border border-[#262626] rounded-3xl p-5 flex items-center gap-4">
          <Clock className="text-[#39ff14]" size={24} />
          <div>
            <p className="text-xs text-gray-500 font-mono">Edad</p>
            <p className="text-lg font-bold text-white">{profile.age} años</p>
          </div>
        </div>
      </div>

      <div className="bg-[#121212] border border-[#262626] rounded-3xl p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Camera className="text-[#39ff14]" size={20} />
            Fotos de Progreso
          </h3>
          <button 
            onClick={() => progressInputRef.current?.click()}
            className="p-2 bg-[#262626] rounded-full text-white hover:text-[#39ff14] transition-colors"
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
              <div key={i} className="min-w-[120px] h-[160px] rounded-xl overflow-hidden border border-[#262626] relative">
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

      <div className="bg-[#121212] border border-[#262626] rounded-3xl p-6 mb-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Target className="text-[#39ff14]" size={20} />
          Disponibilidad
        </h3>
        <p className="text-gray-400 font-mono">{profile.schedule}</p>
      </div>

      <button
        onClick={logout}
        className="w-full bg-red-500/10 border border-red-500/30 text-red-500 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
      >
        <LogOut size={20} />
        Cerrar Sesión
      </button>
    </div>
  );
}
