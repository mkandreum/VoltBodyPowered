/**
 * Kit de UI de VoltBody (espejo web de ui/v3/Kit.kt + Art.kt de la app Android).
 * Las medidas en px equivalen a los dp de la app: en móvil la web es idéntica a la APK.
 */
import {
  createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState,
  type CSSProperties, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Haptics } from '../lib/haptics';

// ─────────────────────────────── Utilidades ───────────────────────────────

export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

/** Entero con separador de miles español siempre ("6.000", como la app). */
export function fmt(n: number): string {
  const s = Math.round(n).toString();
  const neg = s.startsWith('-');
  const digits = neg ? s.slice(1) : s;
  return (neg ? '-' : '') + digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
/** Dos decimales con coma ("4,50"). */
export const fmt1 = (d: number) => d.toFixed(2).replace('.', ',');
/** Sin decimales si es entero; si no, un decimal con coma ("78,3"). */
export const trim = (d: number) => (d % 1 === 0 ? String(Math.trunc(d)) : d.toFixed(1).replace('.', ','));

/** Jerga de gimnasio: algunos términos suenan mejor en inglés. */
export function gymTerm(s: string): string {
  let r = s;
  const rules: Array<[RegExp, string]> = [
    [/cuerpo completo|cuerpo entero/gi, 'Full body'],
    [/tren superior/gi, 'Upper body'], [/tren inferior/gi, 'Lower body'],
    [/\bempuje\b/gi, 'Push'], [/\btir[oó]n\b|\btracci[oó]n\b/gi, 'Pull'],
    [/abdominales|zona media/gi, 'Core'], [/\bhiit\b/gi, 'HIIT'],
    [/movilidad y estiramientos/gi, 'Mobility'], [/d[ií]a de pierna/gi, 'Leg day'],
  ];
  rules.forEach(([re, v]) => { r = r.replace(re, v); });
  return r.charAt(0).toUpperCase() + r.slice(1);
}

export const ON_ACCENT = '#0a0a0a';

/** Lee el color de acento actual (para canvas). */
export function useAccent(): string {
  const [c, setC] = useState(() => readVar('--v-accent', '#27f58b'));
  useEffect(() => {
    const obs = new MutationObserver(() => setC(readVar('--v-accent', '#27f58b')));
    obs.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return c;
}
function readVar(name: string, def: string) {
  if (typeof window === 'undefined') return def;
  return getComputedStyle(document.body).getPropertyValue(name).trim() || def;
}

/** Ancho de un elemento (ResizeObserver). */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** Arranca en 0 y pasa a 1 en el siguiente frame (para transiciones de "crecer al aparecer"). */
export function useMounted(dep?: unknown): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    setM(false);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setM(true)));
    return () => cancelAnimationFrame(id);
  }, [dep]);
  return m;
}

export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Clase + retardo de entrada escalonada (Modifier.enter). */
export const enter = (i = 0): { className: string; style: CSSProperties } => ({ className: 'enter', style: { ['--i' as string]: i } as CSSProperties });

// ─────────────────────────────── Iconos ───────────────────────────────

/** Icono Material (mismo set que Compose: `o` = Outlined, si no Filled). */
export function Icon({ n, o, size = 24, color, className, style, label }: {
  n: string; o?: boolean; size?: number; color?: string; className?: string; style?: CSSProperties; label?: string;
}) {
  return (
    <span className={cx('mi', o && 'o', className)} style={{ fontSize: size, width: size, height: size, color, ...style }}
      aria-hidden={label ? undefined : true} aria-label={label} role={label ? 'img' : undefined}>{n}</span>
  );
}

// ─────────────────────────────── Texto ───────────────────────────────

/** Encoge el texto (hasta minScale) para que quepa en maxLines sin "..." (FitText de la app). */
function useFit(ref: React.RefObject<HTMLElement | null>, deps: unknown[], maxLines: number, minScale: number): CSSProperties {
  const [scale, setScale] = useState(1);
  const base = useRef<{ fs: number; lh: number } | null>(null);
  useLayoutEffect(() => { setScale(1); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (scale === 1) {
      const cs = getComputedStyle(el);
      const fs = parseFloat(cs.fontSize);
      base.current = { fs, lh: parseFloat(cs.lineHeight) || fs * 1.2 };
    }
    const b = base.current;
    if (!b) return;
    const fits = el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= b.lh * scale * maxLines + 2;
    if (!fits && scale > minScale) setScale((s) => Math.max(minScale, +(s - 0.06).toFixed(2)));
  });
  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    let w = el.clientWidth;
    const ro = new ResizeObserver(() => { if (Math.abs(el.clientWidth - w) > 1) { w = el.clientWidth; setScale(1); } });
    ro.observe(el);
    // Las fuentes web cambian el ancho: volver a medir cuando terminen de cargar.
    const refit = () => setScale(1);
    document.fonts?.addEventListener?.('loadingdone', refit);
    document.fonts?.ready.then(refit);
    return () => { ro.disconnect(); document.fonts?.removeEventListener?.('loadingdone', refit); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const b = base.current;
  return scale < 1 && b ? { fontSize: b.fs * scale, lineHeight: `${b.lh * scale}px` } : {};
}

export function FitText({ text, className, color, maxLines = 2, minScale = 0.7, style, as = 'div' }: {
  text: string; className?: string; color?: string; maxLines?: number; minScale?: number; style?: CSSProperties; as?: 'div' | 'h1' | 'h2' | 'h3' | 'span';
}) {
  const ref = useRef<HTMLElement>(null);
  const fit = useFit(ref, [text], maxLines, minScale);
  const Tag = as as 'div';
  const clamp: CSSProperties = maxLines === 1
    ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
    : { display: '-webkit-box', WebkitLineClamp: maxLines, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'break-word' };
  return <Tag ref={ref as React.RefObject<HTMLDivElement>} className={cx(className, 'm-0 min-w-0')} style={{ color, ...clamp, ...style, ...fit }}>{text}</Tag>;
}

/**
 * Título con dos tipografías: lo anterior a la primera coma (coma incluida) en serif cursiva y tono suave;
 * el resto en la grotesca de titulares. Se encoge si no cabe (MixTitle de la app).
 */
export function MixTitle({ text, className = 't-screen', color = 'var(--v-text)', maxLines = 2, minScale = 0.7, as = 'h1' }: {
  text: string; className?: string; color?: string; maxLines?: number; minScale?: number; as?: 'h1' | 'h2' | 'div';
}) {
  const ref = useRef<HTMLElement>(null);
  const fit = useFit(ref, [text], maxLines, minScale);
  const comma = text.indexOf(',');
  const Tag = as as 'h1';
  return (
    <Tag ref={ref as React.RefObject<HTMLHeadingElement>} className={cx(className, 'm-0')}
      style={{ color, overflow: 'hidden', whiteSpace: maxLines === 1 ? 'nowrap' : undefined, ...fit }}>
      {comma > 0 ? (<><span className="serif-it" style={{ color: 'var(--v-dim)' }}>{text.slice(0, comma + 1)}</span>{text.slice(comma + 1)}</>) : text}
    </Tag>
  );
}

/** Número que "rueda" al cambiar (sube si aumenta, baja si disminuye). */
export function RollingText({ text, className, color }: { text: string; className?: string; color?: string }) {
  const prev = useRef(text);
  const [dir, setDir] = useState<'up' | 'down' | null>(null);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (prev.current === text) return;
    const num = (s: string) => Number(s.replace(/\D/g, '')) || 0;
    setDir(num(text) >= num(prev.current) ? 'up' : 'down');
    setKey((k) => k + 1);
    prev.current = text;
  }, [text]);
  return (
    <span className={cx(className, 'inline-block overflow-hidden whitespace-nowrap align-bottom')} style={{ color }}>
      <span key={key} className={dir === 'up' ? 'roll-up' : dir === 'down' ? 'roll-down' : undefined}>{text}</span>
    </span>
  );
}

/** Valor + unidad en línea base (o la unidad debajo). */
export function ValueUnit({ value, unit, unitBelow, valueClass = 't-value', className }: {
  value: string; unit?: string | null; unitBelow?: boolean; valueClass?: string; className?: string;
}) {
  if (unitBelow) return (
    <div className={cx('flex flex-col min-w-0', className)}>
      <RollingText text={value} className={valueClass} color="var(--v-text)" />
      {unit && <span className="t-unit truncate" style={{ color: 'var(--v-dim)' }}>{unit}</span>}
    </div>
  );
  return (
    <div className={cx('flex items-baseline gap-1 min-w-0', className)}>
      <RollingText text={value} className={valueClass} color="var(--v-text)" />
      {unit && <span className="t-unit truncate" style={{ color: 'var(--v-dim)' }}>{unit}</span>}
    </div>
  );
}

// ─────────────────────────────── Estructura ───────────────────────────────

/** Pantalla de pestaña: fondo negro, padding lateral 20, hueco para la barra flotante (móvil). */
export function Screen({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return (
    <main className={cx(
      'w-full min-h-[100dvh] flex flex-col gap-3 px-5 pt-[calc(10px+env(safe-area-inset-top))]',
      'pb-[calc(var(--k-nav-space)+env(safe-area-inset-bottom))] md:pb-12 md:px-8 md:pt-8 lg:px-12 lg:pt-10',
      wide ? 'md:max-w-[1240px]' : 'md:max-w-[1100px]', 'md:mx-auto', className,
    )}>
      {children}
    </main>
  );
}

const GlassCtx = createContext(false);
export const useInGlass = () => useContext(GlassCtx);

/** Tarjeta (radio 24, superficie). Dentro de hojas de cristal pasa a panel translúcido. */
export function Card({ children, className, style, onClick, padding = 16, color, label }: {
  children: ReactNode; className?: string; style?: CSSProperties; onClick?: () => void; padding?: number; color?: string; label?: string;
}) {
  const glass = useInGlass();
  const bg = color ?? (glass ? 'rgba(255,255,255,0.05)' : 'var(--v-surface)');
  const common = { className: cx('flex flex-col text-left rounded-[24px] min-w-0', onClick && 'tap', className), style: { background: bg, padding, ['--tap' as string]: 0.97, ...style } as CSSProperties };
  if (onClick) return <div role="button" tabIndex={0} aria-label={label} onClick={() => { Haptics.light(); onClick(); }}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }} {...common}>{children}</div>;
  return <div {...common}>{children}</div>;
}

/** Cabecera de tarjeta: icono de color + título + chevron. */
export function CardHeader({ icon, o, tint, title, chevron = true, trailing }: {
  icon: string; o?: boolean; tint: string; title: string; chevron?: boolean; trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center w-full min-h-[20px]">
      <Icon n={icon} o={o} size={16} color={tint} />
      <span className="t-card truncate flex-1 ml-1.5" style={{ color: 'var(--v-text)' }}>{title}</span>
      {trailing ?? (chevron && <Icon n="keyboard_arrow_right" size={20} color="var(--v-text)" />)}
    </div>
  );
}

export function IconCircle({ icon, o, size = 44, bg = 'var(--v-surface2)', tint = 'var(--v-text)', label, onClick, className }: {
  icon: string; o?: boolean; size?: number; bg?: string; tint?: string; label?: string; onClick?: () => void; className?: string;
}) {
  const inner = <Icon n={icon} o={o} size={Math.round(size * 0.46)} color={tint} />;
  const style: CSSProperties = { width: size, height: size, background: bg, ['--tap' as string]: 0.9 } as CSSProperties;
  if (!onClick) return <div className={cx('rounded-full flex items-center justify-center shrink-0', className)} style={style}>{inner}</div>;
  return (
    <button type="button" aria-label={label} title={label} onClick={() => { Haptics.light(); onClick(); }}
      className={cx('tap rounded-full flex items-center justify-center shrink-0', className)} style={style}>{inner}</button>
  );
}

export function Spinner({ color, size = 20 }: { color: string; size?: number }) {
  return <span className="spin inline-block rounded-full" style={{ width: size, height: size, border: `2px solid ${color}`, borderTopColor: 'transparent' }} />;
}

/** Botón principal de acento (pill). */
export function LimeButton({ text, onClick, icon, enabled = true, loading, height = 56, className, type = 'button' }: {
  text: string; onClick?: () => void; icon?: string; enabled?: boolean; loading?: boolean; height?: number; className?: string; type?: 'button' | 'submit';
}) {
  const fg = enabled ? ON_ACCENT : 'var(--v-dim)';
  return (
    <button type={type} disabled={!enabled || loading} onClick={() => { if (enabled && !loading) { Haptics.light(); onClick?.(); } }}
      className={cx('w-full flex items-center justify-center gap-2 rounded-full', enabled && !loading && 'tap', className)}
      style={{ height, background: enabled ? 'var(--v-accent)' : 'var(--v-surface2)', color: fg, ['--tap' as string]: 0.97 } as CSSProperties}>
      {loading ? <Spinner color={fg} /> : (<><span className="t-button truncate">{text}</span>{icon && <Icon n={icon} size={18} color={fg} />}</>)}
    </button>
  );
}

/** Botón secundario oscuro. */
export function DarkButton({ text, onClick, icon, height = 52, tint = 'var(--v-text)', className }: {
  text: string; onClick: () => void; icon?: string; height?: number; tint?: string; className?: string;
}) {
  return (
    <button type="button" onClick={() => { Haptics.light(); onClick(); }} className={cx('tap inline-flex items-center justify-center gap-2 rounded-full px-[18px] self-start', className)}
      style={{ height, background: 'var(--v-surface2)', color: tint, ['--tap' as string]: 0.97 } as CSSProperties}>
      {icon && <Icon n={icon} size={18} color={tint} />}
      <span className="t-card truncate">{text}</span>
    </button>
  );
}

/** Píldora pequeña ("Diario ⌄"). */
export function SmallPill({ text, icon, selected, onClick, className }: { text: string; icon?: string; selected?: boolean; onClick?: () => void; className?: string }) {
  const fg = selected ? ON_ACCENT : 'var(--v-text)';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick ? () => { Haptics.light(); onClick(); } : undefined}
      className={cx('inline-flex items-center h-[34px] px-3.5 rounded-[17px] shrink-0', onClick && 'tap', className)}
      style={{ background: selected ? 'var(--v-accent)' : 'var(--v-surface2)', color: fg, ['--tap' as string]: 0.94 } as CSSProperties}>
      <span className="t-card whitespace-nowrap" style={{ fontSize: 12 }}>{text}</span>
      {icon && <Icon n={icon} size={16} color={fg} className="ml-1" />}
    </Tag>
  );
}

/** Barra superior de pantallas secundarias: atrás + título centrado + acción. */
export function TopBar({ title, onBack, trailing }: { title: string; onBack: () => void; trailing?: ReactNode }) {
  return (
    <div className="relative w-full h-12 flex items-center">
      <IconCircle icon="arrow_back" label="Atrás" onClick={onBack} />
      <div className="absolute inset-0 flex items-center justify-center px-14 pointer-events-none">
        <FitText text={title} className="t-section text-center" color="var(--v-text)" maxLines={1} minScale={0.75} />
      </div>
      {trailing && <div className="ml-auto relative">{trailing}</div>}
    </div>
  );
}

export function SectionLabel({ text, action, onAction, className, style }: { text: string; action?: string; onAction?: () => void; className?: string; style?: CSSProperties }) {
  return (
    <div className={cx('flex items-center w-full pt-1', className)} style={style}>
      <h2 className="t-section flex-1 truncate m-0" style={{ color: 'var(--v-text)' }}>{text}</h2>
      {action && onAction && (
        <button type="button" onClick={() => { Haptics.light(); onAction(); }} className="tap t-caption p-1" style={{ color: 'var(--v-accent)', fontSize: 13 }}>{action}</button>
      )}
    </div>
  );
}

/** Fila de menú (Perfil). */
export function MenuRow({ icon, o = true, title, subtitle, value, tint = 'var(--v-accent)', onClick }: {
  icon: string; o?: boolean; title: string; subtitle?: string; value?: string; tint?: string; onClick: () => void;
}) {
  return (
    <button type="button" onClick={() => { Haptics.light(); onClick(); }} className="tap w-full flex items-center rounded-[18px] py-2.5 px-1 text-left" style={{ ['--tap' as string]: 0.98 } as CSSProperties}>
      <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--v-surface2)' }}>
        <Icon n={icon} o={o} size={20} color={tint} />
      </span>
      <span className="flex-1 min-w-0 ml-3">
        <span className="t-card block truncate" style={{ color: 'var(--v-text)', fontSize: 14 }}>{title}</span>
        {subtitle && <span className="t-caption block truncate" style={{ color: 'var(--v-dim)' }}>{subtitle}</span>}
      </span>
      {value && <span className="t-caption pl-2 shrink-0" style={{ color: 'var(--v-dim)' }}>{value}</span>}
      <Icon n="keyboard_arrow_right" size={20} color="var(--v-dim)" />
    </button>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => { Haptics.light(); onChange(!checked); }}
      className="relative w-[52px] h-8 rounded-full shrink-0 transition-colors" style={{ background: checked ? 'var(--v-accent)' : 'var(--v-surface2)' }}>
      <span className="absolute top-1 w-6 h-6 rounded-full transition-all" style={{ left: checked ? 24 : 4, background: checked ? ON_ACCENT : 'var(--v-dim)' }} />
    </button>
  );
}

// ─────────────────────────────── Gráficas ───────────────────────────────

/**
 * Barras redondeadas: apagadas en acento al 32 % y la destacada en acento con burbuja blanca encima.
 * Crecen al aparecer; tocar una la selecciona.
 */
export function MockBars({ values, highlight, bubble, height = 86, onSelect }: {
  values: number[]; highlight: number; bubble?: string | null; height?: number; onSelect?: (i: number) => void;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const grown = useMounted(values.join(','));
  const n = values.length;
  const top = 20;
  const bw = n ? Math.min(22, w / (n * 1.6)) : 0;
  const gap = n > 1 ? (w - bw * n) / (n - 1) : 0;
  const max = Math.max(1, ...values);
  const avail = height - top;
  const hOf = (v: number) => avail * (0.18 + 0.82 * (v / max));
  const hlX = highlight * (bw + gap) + bw / 2;
  const bubbleW = bubble ? bubble.length * 6.4 + 12 : 0;
  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }}
      onClick={onSelect ? (e) => {
        const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const i = Math.min(n - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * n)));
        Haptics.selection(); onSelect(i);
      } : undefined}>
      {w > 0 && values.map((v, i) => {
        const sel = i === highlight;
        const h = hOf(v);
        return (
          <div key={i} className="absolute bottom-0" style={{
            left: i * (bw + gap), width: bw, height: h, borderRadius: bw / 2.2,
            background: sel ? 'var(--v-accent)' : 'color-mix(in srgb, var(--v-accent) 32%, transparent)',
            boxShadow: sel ? `0 0 ${bw * 1.6}px ${bw * 0.5}px color-mix(in srgb, var(--v-accent) 30%, transparent)` : undefined,
            transform: `scaleY(${grown ? 1 : 0})`, transformOrigin: 'bottom',
            transition: 'transform 520ms cubic-bezier(0.4,0,0.2,1), background 200ms',
          }} />
        );
      })}
      {w > 0 && bubble && highlight >= 0 && highlight < n && (
        <div className="absolute rounded-full flex items-center justify-center" style={{
          height: 20, width: bubbleW, background: '#fff', color: ON_ACCENT, font: '700 10px/1 var(--font-sans)',
          left: Math.min(Math.max(0, hlX - bubbleW / 2), w - bubbleW), top: Math.max(0, height - hOf(values[highlight]) - 24),
          opacity: grown ? 1 : 0, transition: 'opacity 520ms, left 300ms cubic-bezier(0.3,1.4,0.5,1)',
        }}>{bubble}</div>
      )}
    </div>
  );
}

function Ring({ progress, size, stroke, color, duration }: { progress: number; size: number; stroke: number; color: string; duration: number }) {
  const m = useMounted();
  const p = Math.min(1, Math.max(0, progress));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--v-surface2)" strokeWidth={stroke} />
      {p > 0.001 && (
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={m ? c * (1 - p) : c} transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: `stroke-dashoffset ${duration}ms cubic-bezier(0.4,0,0.2,1)` }} />
      )}
    </svg>
  );
}

/** Mini donut (tarjeta Calorías). */
export const MiniDonut = ({ progress, size = 42, color = 'var(--v-orange)', stroke = 6 }: { progress: number; size?: number; color?: string; stroke?: number }) =>
  <Ring progress={progress} size={size} stroke={stroke} color={color} duration={700} />;

/** Donut grande con contenido centrado. */
export function BigDonut({ progress, size = 220, color = 'var(--v-orange)', stroke = 26, children }: {
  progress: number; size?: number; color?: string; stroke?: number; children?: ReactNode;
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <Ring progress={progress} size={size} stroke={stroke} color={color} duration={900} />
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

function smoothPath(pts: Array<[number, number]>) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const m = (pts[i - 1][0] + pts[i][0]) / 2;
    d += ` C${m},${pts[i - 1][1]} ${m},${pts[i][1]} ${pts[i][0]},${pts[i][1]}`;
  }
  return d;
}

/** Línea ondulada suave que se dibuja (tarjeta Agua). */
export function WaveLine({ values, width, height = 36, color = 'var(--v-water)', strokeWidth = 2.5, className }: {
  values: number[]; width?: number; height?: number; color?: string; strokeWidth?: number; className?: string;
}) {
  const [ref, measured] = useWidth<HTMLDivElement>();
  const w = width ?? measured;
  const m = useMounted(values.join(','));
  const vs = values.length >= 2 ? values : [0.3, 0.6, 0.4, 0.8, 0.5, 0.7];
  const mn = Math.min(...vs), mx = Math.max(...vs), r = Math.max(mx - mn, 0.0001);
  const pts = vs.map((v, i) => [(i * (w - strokeWidth)) / (vs.length - 1) + strokeWidth / 2, height * 0.88 - ((v - mn) / r) * height * 0.76] as [number, number]);
  return (
    <div ref={ref} className={className} style={{ width: width ?? '100%', height }}>
      {w > 0 && (
        <svg width={w} height={height} className="block overflow-visible">
          <path d={smoothPath(pts)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" pathLength={1}
            strokeDasharray={1} strokeDashoffset={m ? 0 : 1} style={{ transition: 'stroke-dashoffset 800ms cubic-bezier(0.4,0,0.2,1)' }} />
        </svg>
      )}
    </div>
  );
}

/** Mini barras verticales (tarjeta Pasos de Actividad). */
export function MiniBars({ values, width = 54, height = 40 }: { values: number[]; width?: number; height?: number }) {
  const m = useMounted(values.join(','));
  const vs = (values.length ? values : [0.4, 0.7, 0.5, 1]).slice(-4);
  const gap = 5, n = vs.length;
  const bw = (width - gap * (n - 1)) / n;
  const mx = Math.max(0.0001, ...vs);
  return (
    <div className="relative shrink-0" style={{ width, height }}>
      {vs.map((v, i) => (
        <div key={i} className="absolute bottom-0" style={{
          left: i * (bw + gap), width: bw, height: height * (0.25 + 0.75 * v / mx), borderRadius: bw / 2,
          background: i === n - 1 ? 'var(--v-accent)' : 'color-mix(in srgb, var(--v-accent) 35%, transparent)',
          transform: `scaleY(${m ? 1 : 0})`, transformOrigin: 'bottom', transition: 'transform 600ms cubic-bezier(0.4,0,0.2,1)',
        }} />
      ))}
    </div>
  );
}

// ─────────────────────────────── Arte ───────────────────────────────

/** Paletas de arte por "tono" de entreno (manchas vistas a través de vidrio estriado). */
export const ArtPalette = {
  mint: ['#27F58B', '#0B6B45', '#00E0C7', '#0A0A0A'],
  ember: ['#FF8A00', '#27F58B', '#5B1E00', '#0A0A0A'],
  ice: ['#38BDF8', '#27F58B', '#0B2B5B', '#0A0A0A'],
  violet: ['#8B7CFF', '#27F58B', '#231A5B', '#0A0A0A'],
  /** Paleta estable para un texto (mismo entreno = mismo arte), igual que String.hashCode de Kotlin. */
  forKey(key: string): string[] {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
    const all = [ArtPalette.mint, ArtPalette.ember, ArtPalette.ice, ArtPalette.violet];
    return all[(h & 0x7fffffff) % all.length];
  },
};

/** java.util.Random para que el arte salga igual que en la app con la misma semilla. */
class JRandom {
  private seed: bigint;
  constructor(seed: number) { this.seed = (BigInt(seed) ^ 0x5DEECE66Dn) & ((1n << 48n) - 1n); }
  private next(bits: number): number {
    this.seed = (this.seed * 0x5DEECE66Dn + 0xBn) & ((1n << 48n) - 1n);
    // (int)(seed >>> (48 - bits)): solo puede salir negativo con 32 bits.
    let r = Number(this.seed >> BigInt(48 - bits));
    if (bits === 32 && r >= 2 ** 31) r -= 2 ** 32;
    return r;
  }
  nextFloat(): number { return this.next(24) / (1 << 24); }
}

function hexA(hex: string, a: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * Arte de "vidrio estriado": manchas de color que derivan despacio, vistas a través de franjas verticales
 * que las desplazan (refracción) y les dan relieve. Canvas; se pausa fuera de pantalla.
 */
export function FlutedArt({ colors = ArtPalette.mint, seed = 0, stripe = 13, animated = true, className, style }: {
  colors?: string[]; seed?: number; stripe?: number; animated?: boolean; className?: string; style?: CSSProperties;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const blobs = useMemo(() => {
    const r = new JRandom(seed * 7919 + 17);
    return colors.slice(0, -1).map((c, i) => ({ p: [0.15 + r.nextFloat() * 0.7, 0.15 + r.nextFloat() * 0.7, 0.45 + r.nextFloat() * 0.35, i], c }));
  }, [seed, colors]);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let raf = 0, visible = true, last = 0;
    const start = performance.now();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { cv.width = Math.max(1, cv.clientWidth * dpr); cv.height = Math.max(1, cv.clientHeight * dpr); };
    resize();
    const draw = (now: number) => {
      const W = cv.width, H = cv.height;
      // deriva 0..1..0 en 28 s (14 s por sentido), como RepeatMode.Reverse
      const t = ((now - start) / 14000) % 2;
      const d = animated && !reducedMotion() ? (t < 1 ? t : 2 - t) : 0.5;
      ctx.fillStyle = colors[colors.length - 1];
      ctx.fillRect(0, 0, W, H);
      const sw = stripe * dpr;
      const n = Math.floor(W / sw) + 1;
      const maxDim = Math.max(W, H);
      for (let k = 0; k < n; k++) {
        const x0 = k * sw;
        const dx = Math.sin(k * 1.7 + d * Math.PI * 2) * sw * 0.9;
        const dy = Math.sin(k * 0.9 + d * Math.PI) * sw * 0.6;
        ctx.save();
        ctx.beginPath(); ctx.rect(x0, 0, sw, H); ctx.clip();
        for (const { p, c } of blobs) {
          const cx = W * (p[0] + 0.08 * Math.sin(d * 6.28 + p[3])) + dx;
          const cy = H * (p[1] + 0.06 * Math.sin(d * 4.2 + p[3] * 2)) + dy;
          const rad = maxDim * p[2];
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
          g.addColorStop(0, hexA(c, 1)); g.addColorStop(1, hexA(c, 0));
          ctx.fillStyle = g;
          ctx.fillRect(x0, 0, sw, H);
        }
        const rg = ctx.createLinearGradient(x0, 0, x0 + sw, 0);
        rg.addColorStop(0, 'rgba(255,255,255,0.16)'); rg.addColorStop(0.5, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,0.32)');
        ctx.fillStyle = rg; ctx.fillRect(x0, 0, sw, H);
        ctx.restore();
      }
    };
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || now - last < 33) return; // ~30 fps: la deriva es muy lenta
      last = now; draw(now);
    };
    draw(performance.now());
    if (animated && !reducedMotion()) raf = requestAnimationFrame(loop);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(cv);
    const ro = new ResizeObserver(() => { resize(); draw(performance.now()); });
    ro.observe(cv);
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); };
  }, [blobs, colors, stripe, animated]);
  return <canvas ref={ref} aria-hidden className={cx('block w-full h-full', className)} style={style} />;
}

/**
 * CTA "líquido": píldora con texto fusionada con un círculo con flecha (puente cóncavo, efecto metaball).
 */
export function GooeyCta({ text, onClick, icon = 'arrow_forward', height = 60, bg = 'var(--v-bg)', loading, enabled = true, className }: {
  text: string; onClick: () => void; icon?: string; height?: number; bg?: string; loading?: boolean; enabled?: boolean; className?: string;
}) {
  const [ref, w] = useWidth<HTMLButtonElement>();
  const fill = enabled ? 'var(--v-accent)' : 'var(--v-surface2)';
  const fg = enabled ? ON_ACCENT : 'var(--v-dim)';
  const h = height, r = h / 2, gap = h * 0.18;
  const pillW = w - h - gap, circleX = w - r;
  const bx = pillW - r * 0.5, bwid = circleX - r * 0.5 - bx, bh = h * 0.54;
  const nx = pillW + gap / 2, nr = gap * 1.15;
  return (
    <button ref={ref} type="button" disabled={!enabled || loading} onClick={() => { if (enabled && !loading) { Haptics.light(); onClick(); } }}
      className={cx('relative w-full block', enabled && !loading && 'tap', className)} style={{ height, ['--tap' as string]: 0.97 } as CSSProperties}>
      {w > 0 && (
        <svg width={w} height={h} className="absolute inset-0" aria-hidden>
          <rect x={0} y={0} width={pillW} height={h} rx={r} fill={fill} />
          <circle cx={circleX} cy={r} r={r} fill={fill} />
          <rect x={bx} y={(h - bh) / 2} width={bwid} height={bh} fill={fill} />
          <circle cx={nx} cy={(h - bh) / 2 - nr * 0.62} r={nr} fill={bg} />
          <circle cx={nx} cy={(h + bh) / 2 + nr * 0.62} r={nr} fill={bg} />
        </svg>
      )}
      <span className="absolute inset-y-0 left-0 flex items-center px-6" style={{ right: h + gap, color: fg }}>
        {loading ? <Spinner color={fg} /> : <span className="t-button truncate">{text}</span>}
      </span>
      <span className="absolute inset-y-0 right-0 flex items-center justify-center" style={{ width: h }}>
        <Icon n={icon} size={Math.round(h * 0.38)} color={fg} />
      </span>
    </button>
  );
}

/** Imagen circular con burbuja de dato pegada arriba a la derecha (recortada con anillo de fondo). */
export function CircleMedia({ size, bubble, ring = 'var(--v-bg)', children, className, style }: {
  size: number; bubble?: string | null; ring?: string; children: ReactNode; className?: string; style?: CSSProperties;
}) {
  const b = size * 0.36;
  return (
    <div className={cx('relative shrink-0', className)} style={{ width: size, height: size, ...style }}>
      <div className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center" style={{ background: 'var(--v-surface2)' }}>{children}</div>
      {bubble != null && (
        <div className="absolute rounded-full flex items-center justify-center" style={{ width: b, height: b, top: -b * 0.05, right: -b * 0.12, background: ring, padding: 5 }}>
          <div className="w-full h-full rounded-full flex items-center justify-center t-card" style={{ background: 'var(--v-accent)', color: ON_ACCENT }}>{bubble}</div>
        </div>
      )}
    </div>
  );
}

/** Imagen/GIF de ejercicio (con icono de pesa si falta). */
export function ExerciseImage({ url, iconSize = 30, className, eager }: { url?: string | null; iconSize?: number; className?: string; eager?: boolean }) {
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [url]);
  if (!url || err) return <Icon n="fitness_center" o size={iconSize} color="var(--v-dim)" />;
  return <img src={url} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer" onError={() => setErr(true)}
    className={cx('w-full h-full object-cover', className)} />;
}

// ─────────────────────────────── Fechas ───────────────────────────────

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
export const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const addDays = (d: Date, n: number) => { const c = new Date(d.getFullYear(), d.getMonth(), d.getDate()); c.setDate(c.getDate() + n); return c; };
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Tira de días: números sueltos y el seleccionado en píldora de acento ("Hoy, 14 oct"). */
export function DayStrip({ today, selected, onSelect, className, style }: {
  today: Date; selected: Date; onSelect: (d: Date) => void; className?: string; style?: CSSProperties;
}) {
  const days = useMemo(() => Array.from({ length: 43 }, (_, i) => addDays(today, i - 35)), [today]);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const target = el?.children[Math.max(0, 35 - 2)] as HTMLElement | undefined;
    if (el && target) el.scrollLeft = target.offsetLeft - el.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft || '0');
  }, []);
  return (
    <div ref={ref} className={cx('flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-5 px-5 md:mx-0 md:px-0', className)} style={style}>
      {days.map((d) => {
        const sel = sameDay(d, selected);
        const isToday = sameDay(d, today);
        const label = sel && isToday ? `Hoy, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
          : sel ? `${WEEKDAYS_SHORT[d.getDay()].replace(/^./, (c) => c.toUpperCase())} ${d.getDate()}` : String(d.getDate());
        const color = sel ? ON_ACCENT : d > today ? 'color-mix(in srgb, var(--v-dim) 50%, transparent)' : 'var(--v-dim)';
        return (
          <button key={d.getTime()} type="button" onClick={() => onSelect(d)} aria-pressed={sel}
            className="tap h-[38px] rounded-[19px] flex items-center justify-center shrink-0 transition-[background,padding] duration-200"
            style={{ background: sel ? 'var(--v-accent)' : 'transparent', padding: `0 ${sel ? 16 : 10}px`, ['--tap' as string]: 0.92 } as CSSProperties}>
            <span className="t-card whitespace-nowrap" style={{ color, fontSize: 14 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────── Hojas de cristal ───────────────────────────────

const SheetCloseCtx = createContext<(() => void) | null>(null);
export const useSheetClose = () => useContext(SheetCloseCtx);

/**
 * Hoja de cristal esmerilado. Móvil: hoja inferior (se cierra arrastrando hacia abajo).
 * Tablet/escritorio: panel lateral derecho con el mismo cristal.
 */
export function GlassSheet({ onDismiss, children, label }: { onDismiss: () => void; children: ReactNode; label?: string }) {
  const [closing, setClosing] = useState(false);
  const [drag, setDrag] = useState(0);
  const startY = useRef<number | null>(null);
  const close = () => { if (closing) return; setClosing(true); setTimeout(onDismiss, 200); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }); // eslint-disable-line react-hooks/exhaustive-deps
  return createPortal(
    <SheetCloseCtx.Provider value={close}>
      <GlassCtx.Provider value>
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={label}>
          <div className="absolute inset-0 transition-opacity duration-200" style={{ background: 'rgba(0,0,0,0.55)', opacity: closing ? 0 : 1, animation: 'v-fade 200ms ease' }} onClick={close} />
          <div
            className={cx(
              'glass-sheet in-glass absolute flex flex-col overflow-hidden',
              'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[32px]',
              'md:inset-x-auto md:right-3 md:top-3 md:bottom-3 md:w-[480px] md:max-h-none md:rounded-[32px]',
              'sheet-anim',
            )}
            style={{
              transform: drag > 0 ? `translateY(${drag}px)` : undefined,
              transition: startY.current == null ? 'transform 260ms cubic-bezier(0.3,1.2,0.5,1), opacity 200ms' : 'none',
              opacity: closing ? 0 : 1,
              boxShadow: '0 -1px 0 rgba(255,255,255,0.08)',
            }}
            data-closing={closing || undefined}
          >
            <div className="md:hidden flex justify-center pt-3 pb-3 cursor-grab touch-none"
              onPointerDown={(e) => { startY.current = e.clientY; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
              onPointerMove={(e) => { if (startY.current != null) setDrag(Math.max(0, e.clientY - startY.current)); }}
              onPointerUp={() => { const d = drag; startY.current = null; if (d > 110) close(); else setDrag(0); }}
              onPointerCancel={() => { startY.current = null; setDrag(0); }}>
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
            </div>
            <div className="hidden md:block h-5" />
            {children}
          </div>
        </div>
      </GlassCtx.Provider>
    </SheetCloseCtx.Provider>,
    document.body,
  );
}

/** Contenido de hoja: cabecera fija (antetítulo + título + cerrar) y cuerpo desplazable. */
export function SheetScaffold({ title, eyebrow, mixTitle, children, onClose }: {
  title: string; eyebrow?: string; mixTitle?: boolean; children: ReactNode; onClose?: () => void;
}) {
  const ctxClose = useSheetClose();
  const close = onClose ?? ctxClose ?? (() => {});
  const [scrolled, setScrolled] = useState(0);
  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex items-center px-5 pt-0.5 pb-3 enter">
        <div className="flex-1 min-w-0">
          {eyebrow && <div className="t-label mb-0.5" style={{ color: 'var(--v-accent)' }}>{eyebrow}</div>}
          {mixTitle
            ? <MixTitle text={title} className="t-screen" maxLines={1} as="h2" />
            : <FitText as="h2" text={title} className="t-screen m-0" color="var(--v-text)" maxLines={1} style={{ fontSize: 28, lineHeight: '32px' }} />}
        </div>
        <IconCircle icon="close" size={40} label="Cerrar" onClick={close} className="ml-3" />
      </div>
      <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.08)', opacity: Math.min(1, scrolled / 24) }} />
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-5 pt-2.5 pb-[calc(28px+env(safe-area-inset-bottom))] flex flex-col gap-3"
        onScroll={(e) => setScrolled((e.target as HTMLDivElement).scrollTop)}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────── Varios ───────────────────────────────

/** Paso +/- (sesión): etiqueta, valor y botones redondos. */
export function Stepper({ label, value, onMinus, onPlus, className, style }: {
  label: string; value: string; onMinus: () => void; onPlus: () => void; className?: string; style?: CSSProperties;
}) {
  return (
    <div className={cx('flex flex-col items-center rounded-[20px] py-2.5 px-2 min-w-0', className)} style={{ background: 'var(--v-surface)', ...style }}>
      <span className="t-label truncate max-w-full" style={{ color: 'var(--v-dim)' }}>{label}</span>
      <div className="flex items-center w-full mt-1">
        <SmallRound icon="remove" label={`Menos ${label}`} onClick={onMinus} />
        <RollingText text={value} className="t-value flex-1 text-center" color="var(--v-text)" />
        <SmallRound icon="add" label={`Más ${label}`} onClick={onPlus} />
      </div>
    </div>
  );
}

export function SmallRound({ icon, label, onClick, size = 30 }: { icon: string; label: string; onClick: () => void; size?: number }) {
  return (
    <button type="button" aria-label={label} onClick={() => { Haptics.selection(); onClick(); }}
      className="tap rounded-full flex items-center justify-center shrink-0" style={{ width: size, height: size, background: 'var(--v-surface2)', ['--tap' as string]: 0.85 } as CSSProperties}>
      <Icon n={icon} size={16} color="var(--v-text)" />
    </button>
  );
}

/** Ráfaga de confeti contenida (cambia `burst` para disparar). */
export function ConfettiBurst({ burst }: { burst: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const accent = useAccent();
  useEffect(() => {
    if (!burst || reducedMotion()) return;
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr;
    const colors = [accent, '#38BDF8', '#FF8A00', '#FFFFFF', '#8B7CFF'];
    const ps = Array.from({ length: 70 }, () => ({
      x: cv.width / 2, y: cv.height * 0.45, vx: (Math.random() - 0.5) * 14 * dpr, vy: (-Math.random() * 14 - 4) * dpr,
      r: (3 + Math.random() * 4) * dpr, c: colors[(Math.random() * colors.length) | 0], a: Math.random() * Math.PI,
    }));
    let raf = 0; const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0) / 1400;
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (t >= 1) return;
      ps.forEach((p) => {
        p.vy += 0.45 * dpr; p.x += p.vx; p.y += p.vy; p.a += 0.2;
        ctx.globalAlpha = 1 - t; ctx.fillStyle = p.c;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore();
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [burst, accent]);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 w-full h-full z-[5]" />;
}
