/** Perfil (espejo de ui/v3/ProfileV3.kt). */
import { useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/useAppStore';
import { computeSmartStreak } from '../../lib/routineWeek';
import { Haptics } from '../../lib/haptics';
import { authService } from '../../services/authService';
import { ArtPalette, Card, FitText, FlutedArt, IconCircle, MenuRow, MixTitle, Screen, enter, trim } from '../kit';
import { themeLabel } from '../data';
import { useNav } from '../nav';

export default function Profile() {
  const s = useAppStore(useShallow((st) => ({
    profile: st.profile, user: st.user, profilePhoto: st.profilePhoto, logs: st.logs, routine: st.routine, weightLogs: st.weightLogs,
    achievements: st.achievements, progressPhotos: st.progressPhotos, weeklyGoals: st.weeklyGoals, customWorkout: st.customWorkout,
    notificationsEnabled: st.notificationsEnabled, theme: st.theme, authToken: st.authToken, setProfilePhoto: st.setProfilePhoto,
    logout: st.logout, showToast: st.showToast,
  })));
  const push = useNav((n) => n.push);
  const open = (id: string) => push({ kind: 'section', id });
  const streak = useMemo(() => computeSmartStreak(s.logs, s.routine), [s.logs, s.routine]);
  const fileRef = useRef<HTMLInputElement>(null);
  const p = s.profile;
  const name = p?.name || s.user?.name || 'Atleta';
  const lastWeight = s.weightLogs.length ? s.weightLogs[s.weightLogs.length - 1].weight : null;

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const photo = reader.result as string;
      s.setProfilePhoto(photo);
      if (s.authToken) {
        try { await authService.updateProfile(s.authToken, { profilePhoto: photo }); }
        catch { s.showToast({ type: 'error', title: 'No se pudo guardar la foto' }); }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <Screen>
      <div {...enter(0)}><MixTitle text="Tu perfil, tu progreso" maxLines={1} /></div>

      <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-6 md:items-start">
        <div className="flex flex-col gap-3">
          {/* Cabecera */}
          <Card padding={18} className="enter" style={enter(1).style}>
            <div className="flex items-center">
              <button type="button" aria-label="Cambiar foto de perfil" onClick={() => fileRef.current?.click()}
                className="tap w-[72px] h-[72px] rounded-full overflow-hidden flex items-center justify-center shrink-0 t-screen"
                style={{ background: 'var(--v-surface2)', boxShadow: 'inset 0 0 0 2px var(--v-accent)', color: 'var(--v-accent)', ['--tap' as string]: 0.92 } as CSSProperties}>
                {s.profilePhoto ? <img src={s.profilePhoto} alt="" className="w-full h-full object-cover rounded-full p-[2px]" /> : name.slice(0, 1).toUpperCase()}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
              <div className="flex-1 min-w-0 ml-4">
                <FitText text={name} className="t-section" color="var(--v-text)" maxLines={1} style={{ fontSize: 19 }} />
                <FitText text={p?.goal || 'Sin objetivo'} className="t-caption" color="var(--v-accent)" maxLines={2} minScale={0.85} style={{ fontSize: 13 }} />
                <div className="t-caption truncate" style={{ color: 'var(--v-dim)', fontSize: 13 }}>{s.user?.email ?? ''}</div>
              </div>
              <IconCircle icon="edit" o size={40} label="Editar datos" onClick={() => open('personal')} />
            </div>
            <div className="h-4" />
            <div className="grid grid-cols-3 gap-2">
              <Stat value={p?.weight ? trim(p.weight) : '—'} label="kg" />
              <Stat value={p?.height ? trim(p.height) : '—'} label="cm" />
              <Stat value={`${streak}`} label="días racha" />
            </div>
          </Card>

          <div className="t-label pl-1.5 pt-1 enter" style={{ color: 'var(--v-dim)', ...enter(2).style }}>Tu progreso</div>
          <div className="grid grid-cols-2 gap-3 enter" style={enter(2).style}>
            <ArtTile emoji="📊" title="Peso" value={lastWeight != null ? `${trim(lastWeight)} kg` : 'Registrar'} palette={ArtPalette.ice} seed={1} onClick={() => open('weight')} />
            <ArtTile emoji="🏆" title="Logros" value={`${s.achievements.length} desbloqueados`} palette={ArtPalette.ember} seed={2} onClick={() => open('achievements')} />
          </div>
          <div className="grid grid-cols-2 gap-3 enter" style={enter(3).style}>
            <ArtTile emoji="📸" title="Fotos" value={`${s.progressPhotos.length} fotos`} palette={ArtPalette.violet} seed={3} onClick={() => open('photos')} />
            <ArtTile emoji="✅" title="Hábitos" value={`${s.weeklyGoals.filter((g) => g.done).length}/${s.weeklyGoals.length} esta semana`} palette={ArtPalette.mint} seed={4} onClick={() => open('habits')} />
          </div>
          <div className="grid grid-cols-2 gap-3 enter" style={enter(4).style}>
            <ArtTile emoji="😴" title="Recovery" value="Sueño y HRV" palette={ArtPalette.ice} seed={5} onClick={() => open('recovery')} />
            <ArtTile emoji="✨" title="Informe IA" value="Tu evolución" palette={ArtPalette.mint} seed={6} onClick={() => open('report')} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <MenuGroup title="Plan" index={5}>
            <MenuRow icon="person" title="Datos personales" subtitle="Edad, medidas, horarios" onClick={() => open('personal')} />
            <MenuRow icon="restaurant" title="Plan de comidas" subtitle="Preferencias, plato especial, regenerar" onClick={() => open('diet')} />
            <MenuRow icon="fitness_center" title="Rutina personal" subtitle={`${s.customWorkout.length} ejercicios`} onClick={() => open('library')} />
          </MenuGroup>
          <MenuGroup title="Dispositivos y app" index={6}>
            <MenuRow icon="favorite_border" title="Salud y sensores" subtitle="Datos de salud · pulsómetro Bluetooth" onClick={() => open('health')} />
            <MenuRow icon="notifications" title="Notificaciones" subtitle={s.notificationsEnabled ? 'Activadas' : 'Desactivadas'} onClick={() => open('notifications')} />
            <MenuRow icon="palette" title="Tema" subtitle={themeLabel(s.theme)} onClick={() => open('theme')} />
            <MenuRow icon="storage" title="Mis datos" subtitle="Exportar o resetear" onClick={() => open('data')} />
          </MenuGroup>
          <Card padding={6} className="enter" style={enter(7).style}>
            <MenuRow icon="logout" title="Cerrar sesión" tint="var(--v-danger)" onClick={() => { Haptics.warning(); s.logout(); }} />
          </Card>
        </div>
      </div>
    </Screen>
  );
}

/** Tarjeta bento con arte de vidrio estriado: emoji, título grande y dato. */
function ArtTile({ emoji, title, value, palette, seed, onClick }: { emoji: string; title: string; value: string; palette: string[]; seed: number; onClick: () => void }) {
  return (
    <button type="button" onClick={() => { Haptics.light(); onClick(); }} aria-label={title}
      className="tap relative h-[132px] md:h-[150px] rounded-[26px] overflow-hidden text-left" style={{ ['--tap' as string]: 0.97 } as CSSProperties}>
      <FlutedArt className="absolute inset-0" colors={palette} seed={seed} stripe={11} />
      <span className="absolute top-0 left-0 p-3.5" style={{ fontSize: 22, lineHeight: 1 }}>{emoji}</span>
      <span className="absolute bottom-0 left-0 right-0 p-3.5">
        <FitText text={title} className="t-display" color="#fff" maxLines={1} style={{ fontSize: 18, lineHeight: '24px' }} />
        <span className="t-caption block truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{value}</span>
      </span>
    </button>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-[16px] py-2.5" style={{ background: 'var(--v-surface2)' }}>
      <span className="t-value" style={{ color: 'var(--v-text)', fontSize: 18, lineHeight: '24px' }}>{value}</span>
      <span className="t-caption" style={{ color: 'var(--v-dim)' }}>{label}</span>
    </div>
  );
}

function MenuGroup({ title, index, children }: { title: string; index: number; children: ReactNode }) {
  return (
    <div className="flex flex-col enter" style={enter(index).style}>
      <div className="t-label pl-1.5 pb-1.5 pt-1" style={{ color: 'var(--v-dim)' }}>{title}</div>
      <Card padding={6}>{children}</Card>
    </div>
  );
}
