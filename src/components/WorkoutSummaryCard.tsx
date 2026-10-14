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

/** Color de acento del tema actual (html2canvas no entiende variables CSS ni color-mix). */
function accent(): string {
  if (typeof document === 'undefined') return '#27F58B';
  return getComputedStyle(document.body).getPropertyValue('--v-accent').trim() || '#27F58B';
}
function alpha(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Rendered off-screen, captured by html2canvas, then shared as an image */
const WorkoutSummaryCard = forwardRef<HTMLDivElement, WorkoutSummaryCardProps>(({ data }, ref) => {
  const A = accent();
  const today = format(new Date(), "d 'de' MMMM, yyyy", { locale: es });
  const completionPct = data.plannedSets > 0 ? Math.round((data.completedSets / data.plannedSets) * 100) : 100;

  return (
    <div
      ref={ref}
      style={{
        width: 380,
        background: '#161616',
        borderRadius: 28,
        padding: '32px 24px 24px',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: 'none',
      }}
    >
      {/* Specular top glass reflection */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
        }}
      />

      {/* Luminous Glow Orbs */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(A, 0.22)} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -50,
          left: -50,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(A, 0.1)} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: A, letterSpacing: '0.12em' }}>⚡ VOLTBODY</span>
        </div>
        <span style={{ fontSize: 11, color: '#9A9A9A', fontFamily: "'Unbounded', 'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
          {today}
        </span>
      </div>

      {/* Trophy + Title Container (Liquid Glass Panel) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 16,
          background: 'rgba(255, 255, 255, 0.04)',
          border: `1px solid ${alpha(A, 0.3)}`,
          borderRadius: 20,
          padding: '16px',
          backdropFilter: 'blur(16px)',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15)',
        }}
      >
        <span style={{ fontSize: 40, lineHeight: 1, filter: 'drop-shadow(0 4px 12px rgba(250,204,21,0.3))' }}>🏆</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 10, color: A, textTransform: 'uppercase', letterSpacing: '0.22em', margin: 0, fontWeight: 800 }}>
            SESIÓN COMPLETADA
          </p>
          <h2 style={{ fontSize: 22, fontWeight: 900, margin: '4px 0 0', lineHeight: 1.2, color: '#ffffff', wordBreak: 'break-word' }}>
            {data.focus}
          </h2>
          {data.userName && (
            <p style={{ fontSize: 12, color: '#9A9A9A', margin: '4px 0 0', fontWeight: 500 }}>
              por <span style={{ color: '#ffffff', fontWeight: 700 }}>{data.userName}</span>
            </p>
          )}
        </div>
      </div>

      {/* Stats Grid (3 Columns) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { icon: '💪', label: 'EJERCICIOS', value: String(data.exerciseCount) },
          { icon: '✅', label: 'SERIES', value: `${data.completedSets}/${data.plannedSets}` },
          { icon: '📈', label: 'PROGRESO', value: `${completionPct}%` },
        ].map(({ icon, label, value }) => (
          <div
            key={label}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              padding: '12px 8px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 18, margin: 0 }}>{icon}</p>
            <p style={{ fontSize: 15, fontWeight: 900, color: '#ffffff', margin: '4px 0 0', fontFamily: "'Unbounded', 'Plus Jakarta Sans', sans-serif" }}>
              {value}
            </p>
            <p style={{ fontSize: 9, color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '2px 0 0', fontWeight: 700 }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Exercise List */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 10, color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.16em', margin: '0 0 8px', fontWeight: 700 }}>
          EJERCICIOS REALIZADOS
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.exercises.slice(0, 6).map((ex, i, arr) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 4px',
                borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: 10, color: '#4b5563', fontWeight: 800, minWidth: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {i + 1}.
                </span>
                <span style={{ fontSize: 12, color: '#f3f4f6', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ex.name}
                </span>
              </div>
              <span style={{ fontSize: 11, color: A, fontFamily: "'Unbounded', 'Plus Jakarta Sans', sans-serif", fontWeight: 700, marginLeft: 8 }}>
                {ex.sets}×{ex.reps}
              </span>
            </div>
          ))}
          {data.exercises.length > 6 && (
            <p style={{ fontSize: 11, color: '#9A9A9A', textAlign: 'center', margin: '4px 0 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              +{data.exercises.length - 6} ejercicios más
            </p>
          )}
        </div>
      </div>

      {/* XP + Streak Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 138, 0, 0.3)',
            borderRadius: 16,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 22 }}>🔥</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 900, color: '#FF8A00', margin: 0, fontFamily: "'Unbounded', 'Plus Jakarta Sans', sans-serif" }}>
              {data.streak} {data.streak === 1 ? 'día' : 'días'}
            </p>
            <p style={{ fontSize: 9, color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '2px 0 0', fontWeight: 700 }}>
              RACHA ACTIVA
            </p>
          </div>
        </div>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${alpha(A, 0.3)}`,
            borderRadius: 16,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 22 }}>⚡</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 900, color: A, margin: 0, fontFamily: "'Unbounded', 'Plus Jakarta Sans', sans-serif" }}>
              Nv. {data.level}
            </p>
            <p style={{ fontSize: 9, color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '2px 0 0', fontWeight: 700 }}>
              +{data.xpGained} XP
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar with Liquid Glow */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 9, color: '#9A9A9A', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>
            CUMPLIMIENTO TOTAL
          </span>
          <span style={{ fontSize: 10, color: A, fontFamily: "'Unbounded', 'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
            {completionPct}%
          </span>
        </div>
        <div style={{ height: 6, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 999, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${completionPct}%`,
              background: A,
              borderRadius: 999,
              boxShadow: '0 0 10px rgba(57,255,20,0.6)',
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <p style={{ fontSize: 10, color: '#4b5563', margin: 0, fontWeight: 700, letterSpacing: '0.04em' }}>voltbody.app</p>
        <p style={{ fontSize: 10, color: '#4b5563', margin: 0, fontWeight: 600 }}>💪 Constancia & Disciplina</p>
      </div>
    </div>
  );
});

WorkoutSummaryCard.displayName = 'WorkoutSummaryCard';
export default WorkoutSummaryCard;
