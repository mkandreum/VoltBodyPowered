import { forwardRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface WorkoutSummaryData {
  focus: string;
  exerciseCount: number;
  completedSets: number;
  plannedSets: number;
  streak: number;
  level: number;
  totalXP: number;
  xpGained: number;
  userName?: string;
  exercises: Array<{ name: string; sets: number; reps: string }>;
}

interface WorkoutSummaryCardProps {
  data: WorkoutSummaryData;
}

/** Rendered off-screen, captured by html2canvas, then shared as an image */
const WorkoutSummaryCard = forwardRef<HTMLDivElement, WorkoutSummaryCardProps>(({ data }, ref) => {
  const today = format(new Date(), "d 'de' MMMM, yyyy", { locale: es });
  const completionPct = data.plannedSets > 0 ? Math.round((data.completedSets / data.plannedSets) * 100) : 100;

  return (
    <div
      ref={ref}
      style={{
        width: 360,
        background: 'linear-gradient(145deg, #0d0d0d 0%, #111 50%, #0a1a0a 100%)',
        borderRadius: 24,
        padding: '28px 24px 24px',
        fontFamily: "'Inter', 'system-ui', sans-serif",
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Glow orb behind */}
      <div style={{
        position: 'absolute',
        top: -60,
        right: -60,
        width: 200,
        height: 200,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(57,255,20,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: -40,
        left: -40,
        width: 160,
        height: 160,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(57,255,20,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Brand header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#39ff14', letterSpacing: '0.08em' }}>⚡ VOLTBODY</span>
        </div>
        <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>{today}</span>
      </div>

      {/* Trophy + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <span style={{ fontSize: 36 }}>🏆</span>
        <div>
          <p style={{ fontSize: 11, color: '#39ff14', textTransform: 'uppercase', letterSpacing: '0.18em', margin: 0 }}>
            Sesión completada
          </p>
          <h2 style={{ fontSize: 26, fontWeight: 900, margin: '2px 0 0', lineHeight: 1.1, background: 'linear-gradient(135deg,#39ff14,#7fff7f)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {data.focus}
          </h2>
        </div>
      </div>

      {/* Name */}
      {data.userName && (
        <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16, marginTop: 4 }}>
          por <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{data.userName}</span>
        </p>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, marginTop: data.userName ? 0 : 16 }}>
        {[
          { icon: '💪', label: 'Ejercicios', value: String(data.exerciseCount) },
          { icon: '✅', label: 'Series', value: `${data.completedSets}/${data.plannedSets}` },
          { icon: '📈', label: 'Progreso', value: `${completionPct}%` },
        ].map(({ icon, label, value }) => (
          <div key={label} style={{
            flex: 1,
            background: 'rgba(57,255,20,0.06)',
            border: '1px solid rgba(57,255,20,0.18)',
            borderRadius: 14,
            padding: '10px 8px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 18, margin: 0 }}>{icon}</p>
            <p style={{ fontSize: 15, fontWeight: 900, color: '#fff', margin: '2px 0 0' }}>{value}</p>
            <p style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '2px 0 0' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Exercise list (up to 6) */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Ejercicios</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.exercises.slice(0, 6).map((ex, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '7px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(57,255,20,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#39ff14', fontWeight: 700 }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 12, color: '#e5e7eb', fontWeight: 500 }}>{ex.name}</span>
              </div>
              <span style={{ fontSize: 11, color: '#39ff14', fontFamily: 'monospace', fontWeight: 600 }}>{ex.sets}×{ex.reps}</span>
            </div>
          ))}
          {data.exercises.length > 6 && (
            <p style={{ fontSize: 11, color: '#6b7280', textAlign: 'center', margin: '2px 0 0' }}>+{data.exercises.length - 6} más</p>
          )}
        </div>
      </div>

      {/* XP + Streak row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🔥</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 900, color: '#f97316', margin: 0 }}>{data.streak} días</p>
            <p style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>Racha</p>
          </div>
        </div>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>⚡</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 900, color: '#39ff14', margin: 0 }}>Nv. {data.level}</p>
            <p style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>+{data.xpGained} XP</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Sesión completada</span>
          <span style={{ fontSize: 9, color: '#39ff14', fontFamily: 'monospace' }}>{completionPct}%</span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${completionPct}%`, background: 'linear-gradient(90deg,#39ff14,#7fff7f)', borderRadius: 999 }} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 10, color: '#4b5563', margin: 0 }}>voltbody.app</p>
        <p style={{ fontSize: 10, color: '#4b5563', margin: 0 }}>💪 Sin excusas</p>
      </div>
    </div>
  );
});

WorkoutSummaryCard.displayName = 'WorkoutSummaryCard';
export default WorkoutSummaryCard;
