/**
 * Armazón de la app (espejo de ui/v3/Nav.kt + ToastHost/LoadingProfile de MainActivity).
 * Móvil: barra flotante inferior idéntica a la APK. Tablet/escritorio: la misma píldora en vertical a la izquierda.
 */
import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store/useAppStore';
import { Haptics } from '../lib/haptics';
import { GlassSheet, Icon, LimeButton, ON_ACCENT, cx } from './kit';
import { goTab, useNav, useTab, type Route, type Tab } from './nav';
import { poseExerciseOf } from './data';

const HomeScreen = lazy(() => import('./screens/Home'));
const ActivityScreen = lazy(() => import('./screens/Activity'));
const TrainScreen = lazy(() => import('./screens/Train'));
const NutritionScreen = lazy(() => import('./screens/Nutrition'));
const ProfileScreen = lazy(() => import('./screens/Profile'));
const DayDetail = lazy(() => import('./screens/DayDetail'));
const SessionScreen = lazy(() => import('./screens/Session'));
const SectionHost = lazy(() => import('./sections/SectionHost'));
const PoseCoach = lazy(() => import('../components/PoseCoach'));

export const TABS: Array<{ id: Tab; label: string; icon: string; o: boolean }> = [
  { id: 'home', label: 'Inicio', icon: 'home', o: true },
  { id: 'activity', label: 'Actividad', icon: 'bar_chart', o: true },
  { id: 'train', label: 'Entrenar', icon: 'fitness_center', o: false },
  { id: 'food', label: 'Nutrición', icon: 'restaurant', o: true },
  { id: 'profile', label: 'Perfil', icon: 'person', o: true },
];

function TabSkeleton() {
  return (
    <div className="px-5 pt-[calc(10px+env(safe-area-inset-top))] flex flex-col gap-3 md:max-w-[1100px] md:mx-auto md:px-8 md:pt-8">
      {[90, 90, 180, 90].map((h, i) => <div key={i} className="skeleton rounded-[24px]" style={{ height: h }} />)}
    </div>
  );
}

export default function AppShell() {
  const tab = useTab();
  const stack = useNav((s) => s.stack);
  const pages = stack.filter((r) => r.kind !== 'section');
  const page = pages[pages.length - 1];
  const section = [...stack].reverse().find((r) => r.kind === 'section') as Extract<Route, { kind: 'section' }> | undefined;
  const sectionOnTop = stack[stack.length - 1]?.kind === 'section';

  // Al cambiar de pestaña, arriba del todo (como la app).
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); }, [tab]);

  return (
    <div className="min-h-[100dvh] md:pl-[112px]" style={{ background: 'var(--v-bg)' }}>
      <SideRail selected={tab} />
      <div key={tab} className="tab-in" style={{ display: page ? 'none' : undefined }}>
        <Suspense fallback={<TabSkeleton />}>
          {tab === 'home' && <HomeScreen />}
          {tab === 'activity' && <ActivityScreen />}
          {tab === 'train' && <TrainScreen />}
          {tab === 'food' && <NutritionScreen />}
          {tab === 'profile' && <ProfileScreen />}
        </Suspense>
      </div>

      {page && (
        <div key={`${pages.length}-${JSON.stringify(page)}`} className="page-in min-h-[100dvh]" style={{ background: 'var(--v-bg)' }}>
          <Suspense fallback={<TabSkeleton />}>
            {page.kind === 'day' && <DayDetail weekday={page.weekday} />}
            {page.kind === 'session' && <SessionScreen route={page} />}
            {page.kind === 'pose' && (
              <div className="fixed inset-0 z-[60]" style={{ background: 'var(--v-bg)' }}>
                <PoseCoach exercise={poseExerciseOf(page.exercise)} exerciseName={page.exercise} onClose={() => useNav.getState().pop()} />
              </div>
            )}
          </Suspense>
        </div>
      )}

      {/* Barra flotante (móvil): se oculta dentro de pantallas secundarias */}
      <FloatingNav selected={tab} hidden={!!page} />

      {section && sectionOnTop && (
        <GlassSheet key={section.id} onDismiss={() => useNav.getState().pop()} label="Sección">
          <Suspense fallback={<div className="px-5 pb-8 flex flex-col gap-3">{[80, 160].map((h, i) => <div key={i} className="skeleton rounded-[24px]" style={{ height: h }} />)}</div>}>
            <SectionHost id={section.id} />
          </Suspense>
        </GlassSheet>
      )}
    </div>
  );
}

/** Píldora oscura con círculo de acento bajo el icono activo, que se desliza con muelle. */
function FloatingNav({ selected, hidden }: { selected: Tab; hidden: boolean }) {
  const idx = TABS.findIndex((t) => t.id === selected);
  return (
    <nav aria-label="Navegación principal"
      className="md:hidden fixed left-6 right-6 z-50 h-[66px] rounded-full flex items-center"
      style={{
        bottom: 'calc(12px + env(safe-area-inset-bottom))', background: '#1A1A1A', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
        transform: hidden ? 'translateY(140%)' : 'none', opacity: hidden ? 0 : 1,
        transition: hidden ? 'transform 160ms ease-in, opacity 120ms' : 'transform 420ms cubic-bezier(0.3,1.3,0.5,1), opacity 200ms',
      }}>
      {/* Indicador: brillo radial + círculo de 50px */}
      <div aria-hidden className="absolute inset-y-0 left-0 pointer-events-none" style={{
        width: `${100 / TABS.length}%`, transform: `translateX(${idx * 100}%)`,
        transition: 'transform 380ms cubic-bezier(0.3,1.35,0.5,1)',
      }}>
        <div className="absolute left-1/2 top-1/2 w-[88px] h-[88px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--v-accent) 35%, transparent), transparent 70%)' }} />
        <div className="absolute left-1/2 top-1/2 w-[50px] h-[50px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: 'var(--v-accent)' }} />
      </div>
      {TABS.map((t) => <NavIcon key={t.id} t={t} active={t.id === selected} />)}
    </nav>
  );
}

function NavIcon({ t, active, vertical }: { t: (typeof TABS)[number]; active: boolean; vertical?: boolean }) {
  const [bounce, setBounce] = useState(0);
  const was = useRef(active);
  useEffect(() => { if (active && !was.current) setBounce((b) => b + 1); was.current = active; }, [active]);
  return (
    <button type="button" aria-label={t.label} title={vertical ? t.label : undefined} aria-current={active ? 'page' : undefined}
      onClick={() => { if (!active) { Haptics.selection(); goTab(t.id); } }}
      className={cx('tap relative z-10 flex items-center justify-center', vertical ? 'w-full h-[66px]' : 'flex-1 h-full')}
      style={{ ['--tap' as string]: 0.86 } as CSSProperties}>
      <span key={bounce} className={bounce ? 'pop' : undefined} style={{ display: 'inline-flex' }}>
        <Icon n={t.icon} o={t.o} size={t.id === 'train' ? 26 : 24} color={active ? ON_ACCENT : '#8A8A8A'} style={{ transition: 'color 140ms' }} />
      </span>
    </button>
  );
}

/** Tablet/escritorio: la misma píldora de la barra móvil, en vertical y fija a la izquierda. */
function SideRail({ selected }: { selected: Tab }) {
  const idx = TABS.findIndex((t) => t.id === selected);
  const name = useAppStore((s) => s.profile?.name ?? s.user?.name ?? 'A');
  const photo = useAppStore((s) => s.profilePhoto);
  return (
    <aside className="hidden md:flex fixed left-6 top-6 bottom-6 z-50 w-[66px] flex-col items-center">
      <button type="button" aria-label="VoltBody — Inicio" onClick={() => goTab('home')}
        className="tap w-[50px] h-[50px] rounded-[16px] flex items-center justify-center" style={{ background: 'var(--v-accent)' }}>
        <Icon n="bolt" size={28} color={ON_ACCENT} />
      </button>
      <div className="flex-1 flex items-center">
        <nav aria-label="Navegación principal" className="relative w-[66px] rounded-full py-1"
          style={{ background: '#1A1A1A', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}>
          <div aria-hidden className="absolute left-0 right-0 top-1 pointer-events-none" style={{
            height: 66, transform: `translateY(${idx * 66}px)`, transition: 'transform 380ms cubic-bezier(0.3,1.35,0.5,1)',
          }}>
            <div className="absolute left-1/2 top-1/2 w-[88px] h-[88px] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--v-accent) 35%, transparent), transparent 70%)' }} />
            <div className="absolute left-1/2 top-1/2 w-[50px] h-[50px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: 'var(--v-accent)' }} />
          </div>
          {TABS.map((t) => <NavIcon key={t.id} t={t} active={t.id === selected} vertical />)}
        </nav>
      </div>
      <button type="button" aria-label="Perfil" onClick={() => goTab('profile')}
        className="tap w-[46px] h-[46px] rounded-full overflow-hidden flex items-center justify-center t-section" style={{ background: 'var(--v-surface2)', color: 'var(--v-accent)' }}>
        {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : name.slice(0, 1).toUpperCase()}
      </button>
    </aside>
  );
}

// ───────────────────────── Avisos ─────────────────────────

export function ToastHost() {
  const { toasts, dismissToast } = useAppStore(useShallow((s) => ({ toasts: s.toasts, dismissToast: s.dismissToast })));
  const t = toasts[0];
  useEffect(() => {
    if (!t) return;
    const id = setTimeout(() => dismissToast(t.id), 3200);
    return () => clearTimeout(id);
  }, [t?.id, dismissToast]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!t) return null;
  const info = t.type !== 'error' && t.type !== 'success';
  const bg = t.type === 'error' ? 'linear-gradient(135deg, var(--v-danger), #FF8A5B)' : t.type === 'success' ? 'var(--v-accent)' : 'var(--v-surface2)';
  const fg = info ? 'var(--v-text)' : ON_ACCENT;
  const icon = t.type === 'error' ? 'error_outline' : t.type === 'success' ? 'check_circle' : 'info';
  return (
    <div className="fixed inset-x-0 top-0 z-[90] flex justify-center px-4 pointer-events-none" style={{ paddingTop: 'calc(16px + env(safe-area-inset-top))' }}>
      <div key={t.id} role="status" onClick={() => dismissToast(t.id)}
        className="pointer-events-auto flex items-center max-w-[420px] rounded-[28px] px-[18px] py-3.5 toast-in cursor-pointer"
        style={{ background: bg, boxShadow: info ? 'inset 0 0 0 1px color-mix(in srgb, var(--v-accent) 35%, transparent)' : undefined }}>
        <Icon n={icon} size={24} color={info ? 'var(--v-accent)' : fg} />
        <div className="ml-3 min-w-0">
          <div style={{ color: fg, font: '700 17px/22px var(--font-sans)' }} className="line-clamp-2">{t.title}</div>
          {t.message && <div style={{ color: fg, opacity: 0.78, font: '500 12px/16px var(--font-sans)' }} className="line-clamp-3">{t.message}</div>}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Carga del perfil ─────────────────────────

export function LoadingProfile({ error, onRetry, onLogout }: { error?: string | null; onRetry?: () => void; onLogout?: () => void }) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-7 text-center" style={{ background: 'var(--v-bg)' }}>
      <div className="w-[84px] h-[84px] rounded-full flex items-center justify-center breathe" style={{ background: 'var(--v-accent)' }}>
        <Icon n="bolt" size={44} color={ON_ACCENT} />
      </div>
      <div className="h-6" />
      {!error ? (
        <>
          <div className="t-section" style={{ color: 'var(--v-text)' }}>Cargando tu plan…</div>
          <div className="h-4" />
          <VoltPulse />
        </>
      ) : (
        <div className="w-full max-w-[360px]">
          <div className="t-screen" style={{ color: 'var(--v-text)' }}>No pudimos conectar</div>
          <p className="t-body mt-2" style={{ color: 'var(--v-dim)' }}>{error}</p>
          <div className="h-6" />
          <LimeButton text="Reintentar" onClick={() => onRetry?.()} />
          <button type="button" className="tap t-body p-2.5 mt-2.5" style={{ color: 'var(--v-dim)' }} onClick={onLogout}>Cerrar sesión</button>
        </div>
      )}
    </div>
  );
}

/** Firma visual: línea de "voltaje" tipo electrocardiograma con una chispa que la recorre. */
export function VoltPulse({ width = 220, height = 28 }: { width?: number; height?: number }) {
  const w = width, h = height, mid = h / 2;
  let d = `M0,${mid}`;
  for (let b = 0; b < 3; b++) {
    const x0 = (w * b) / 3, bw = w / 3;
    d += ` L${x0 + bw * 0.38},${mid} L${x0 + bw * 0.44},${mid - h * 0.18} L${x0 + bw * 0.5},${mid + h * 0.42} L${x0 + bw * 0.56},${mid - h * 0.48} L${x0 + bw * 0.62},${mid + h * 0.12} L${x0 + bw * 0.68},${mid}`;
  }
  d += ` L${w},${mid}`;
  return (
    <svg width={w} height={h} aria-hidden className="overflow-visible">
      <path d={d} fill="none" stroke="var(--v-accent)" strokeOpacity={0.28} strokeWidth={1.6} strokeLinejoin="round" />
      <path d={d} fill="none" stroke="var(--v-accent)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" pathLength={1}
        strokeDasharray="0.16 0.84" className="volt-spark" />
    </svg>
  );
}
