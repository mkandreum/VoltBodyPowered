/** Portada + login/registro en hoja inferior (espejo de ui/v3/LoginV3.kt). */
import { useState, type CSSProperties } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { authService } from '../../services/authService';
import { hydrateFromServer } from '../../services/hydration';
import { Haptics } from '../../lib/haptics';
import { GlassSheet, GooeyCta, Icon, LimeButton, ON_ACCENT, cx } from '../kit';

const RUNNER_GIF = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0685-oLrKqDH.gif';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Traduce los errores (en inglés) que devuelve el servidor. */
function humanError(msg?: string | null): string {
  if (!msg) return 'No se pudo conectar con el servidor';
  if (/invalid credentials/i.test(msg)) return 'Correo o contraseña incorrectos';
  if (/already exists/i.test(msg)) return 'Ya existe una cuenta con ese correo';
  if (/at least 6/i.test(msg)) return 'La contraseña necesita al menos 6 caracteres';
  if (/invalid email/i.test(msg)) return 'El correo no es válido';
  if (/too many/i.test(msg)) return 'Demasiados intentos. Espera unos minutos';
  if (/failed to fetch|networkerror/i.test(msg)) return 'No se pudo conectar con el servidor';
  return msg;
}

export default function Login() {
  const { setAuthToken, setUser } = useAppStore();
  const [sheet, setSheet] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(0);

  const fail = (m: string) => { setError(m); setShake((x) => x + 1); Haptics.error(); };
  const submit = async () => {
    if (loading) return;
    const e = email.trim();
    const v = !isLogin && !name.trim() ? 'Escribe tu nombre'
      : !EMAIL_RE.test(e) || e.length > 120 ? 'El correo no es válido'
      : password.length < 6 ? 'La contraseña necesita al menos 6 caracteres'
      : password.length > 128 ? 'La contraseña es demasiado larga' : null;
    if (v) { fail(v); return; }
    setError(''); setLoading(true);
    try {
      const res = isLogin ? await authService.login({ email: e, password }) : await authService.register({ email: e, password, name: name.trim() });
      setAuthToken(res.token);
      setUser(res.user);
      if (isLogin) {
        try { await hydrateFromServer(res.token); }
        catch { fail('No se pudieron cargar tus datos. Inténtalo de nuevo.'); useAppStore.getState().logout(); return; }
      }
      Haptics.success();
    } catch (err) {
      fail(humanError((err as Error)?.message));
    } finally { setLoading(false); }
  };

  const open = (login: boolean) => { setIsLogin(login); setError(''); setSheet(true); };

  return (
    <div className="min-h-[100dvh] flex flex-col px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:px-12" style={{ background: 'var(--v-bg)' }}>
      <header className="flex items-center pt-3 md:pt-8">
        <span className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center" style={{ background: 'var(--v-accent)' }}>
          <Icon n="bolt" size={20} color={ON_ACCENT} />
        </span>
        <span className="t-section ml-2.5" style={{ color: 'var(--v-text)' }}>VoltBody</span>
      </header>

      <div className="flex-1 flex flex-col md:grid md:grid-cols-2 md:items-center md:gap-12 md:max-w-[1180px] md:mx-auto md:w-full">
        {/* Figura: corredor dentro de un anillo con órbita */}
        <div className="flex-1 flex items-center justify-center md:order-2">
          <RunnerOrb />
        </div>
        <div className="md:order-1">
          <KineticLines lines={[['Más fuerte', true], ['cada día.', true], ['Más sano', false], ['cada paso.', false]]} />
          <div className="h-7" />
          <div className="md:max-w-[460px]">
            <GooeyCta text="Empezar" onClick={() => open(false)} />
            <button type="button" onClick={() => open(true)}
              className="tap block mx-auto md:mx-0 mt-2.5 mb-2 rounded-[12px] p-2.5 t-body" style={{ color: 'var(--v-dim)' }}>
              Ya tengo cuenta · Iniciar sesión
            </button>
          </div>
        </div>
      </div>

      {sheet && (
        <GlassSheet onDismiss={() => setSheet(false)} label={isLogin ? 'Iniciar sesión' : 'Crear cuenta'}>
          <form key={shake} onSubmit={(ev) => { ev.preventDefault(); submit(); }}
            className={cx('px-[22px] pb-[calc(20px+env(safe-area-inset-bottom))] flex flex-col gap-3', shake > 0 && 'shake')}>
            <div className="h-[46px] rounded-[23px] p-1 flex" style={{ background: 'var(--v-surface2)' }} role="tablist">
              {([[true, 'Iniciar sesión'], [false, 'Crear cuenta']] as const).map(([login, label]) => (
                <button key={label} type="button" role="tab" aria-selected={isLogin === login} onClick={() => { setIsLogin(login); setError(''); }}
                  className="tap flex-1 rounded-[20px] flex items-center justify-center t-card transition-colors"
                  style={{ background: isLogin === login ? 'var(--v-accent)' : 'transparent', color: isLogin === login ? ON_ACCENT : 'var(--v-dim)' }}>
                  {label}
                </button>
              ))}
            </div>
            <div key={String(isLogin)} className="t-screen fade-in" style={{ color: 'var(--v-text)', fontSize: 22, lineHeight: '26px' }}>
              {isLogin ? 'Bienvenido de nuevo' : 'Empieza tu cambio'}
            </div>
            {!isLogin && <Field label="Nombre" value={name} onChange={(v) => { setName(v); setError(''); }} autoComplete="name" />}
            <Field label="Correo electrónico" type="email" value={email} onChange={(v) => { setEmail(v); setError(''); }} autoComplete="email" />
            <Field label="Contraseña" type={showPass ? 'text' : 'password'} value={password} onChange={(v) => { setPassword(v); setError(''); }}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              trailing={(
                <button type="button" aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowPass((x) => !x)} className="tap p-1">
                  <Icon n={showPass ? 'visibility_off' : 'visibility'} o color="var(--v-dim)" />
                </button>
              )} />
            {error && (
              <div role="alert" className="t-body rounded-[14px] p-3 fade-in" style={{ color: 'var(--v-danger)', background: 'color-mix(in srgb, var(--v-danger) 12%, transparent)' }}>{error}</div>
            )}
            <LimeButton type="submit" text={isLogin ? 'Entrar' : 'Crear cuenta'} loading={loading} />
          </form>
        </GlassSheet>
      )}
    </div>
  );
}

/** Campo con etiqueta flotante (OutlinedTextField de la app). */
function Field({ label, value, onChange, type = 'text', autoComplete, trailing }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; autoComplete?: string; trailing?: React.ReactNode;
}) {
  const [focus, setFocus] = useState(false);
  const up = focus || value.length > 0;
  return (
    <label className="relative block h-14 rounded-[18px] transition-shadow"
      style={{ background: 'var(--v-surface2)', boxShadow: focus ? 'inset 0 0 0 2px var(--v-accent)' : undefined }}>
      <span className="absolute left-4 pointer-events-none transition-all duration-150"
        style={{ top: up ? 7 : 18, fontSize: up ? 12 : 16, lineHeight: '18px', color: focus ? 'var(--v-accent)' : 'var(--v-dim)', fontWeight: 500 }}>{label}</span>
      <input type={type} value={value} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        className="absolute inset-0 w-full bg-transparent outline-none px-4 pt-5 pr-12 text-[16px]" style={{ color: 'var(--v-text)', caretColor: 'var(--v-accent)' }} />
      {trailing && <span className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</span>}
    </label>
  );
}

/** Titular gigante bicolor que entra línea a línea. */
function KineticLines({ lines }: { lines: Array<[string, boolean]> }) {
  return (
    <div className="flex flex-col">
      {lines.map(([t, strong], i) => (
        <span key={t} className="whitespace-nowrap kinetic" style={{
          font: '800 44px/46px var(--font-display)', letterSpacing: '-0.03em',
          color: strong ? 'var(--v-text)' : 'color-mix(in srgb, var(--v-dim) 45%, transparent)',
          animationDelay: `${120 + i * 70}ms`,
        } as CSSProperties}>{t}</span>
      ))}
    </div>
  );
}

/** Anillo de acento con órbita punteada que gira y el corredor animado dentro. */
function RunnerOrb() {
  return (
    <div className="relative w-[270px] h-[270px] md:w-[360px] md:h-[360px] flex items-center justify-center">
      <svg viewBox="0 0 270 270" className="absolute inset-0 w-full h-full orbit overflow-visible" aria-hidden>
        <circle cx={135} cy={135} r={133} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1} strokeDasharray="5 8" />
        <path d={arcPath(135, 135, 121, -90, 20)} fill="none" stroke="var(--v-accent)" strokeWidth={6} strokeLinecap="round" />
        <circle cx={268} cy={135} r={6} fill="var(--v-accent)" />
      </svg>
      <div className="w-[206px] h-[206px] md:w-[274px] md:h-[274px] rounded-full overflow-hidden flex items-center justify-center breathe-soft" style={{ background: '#fff' }}>
        <img src={RUNNER_GIF} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
      </div>
    </div>
  );
}

function arcPath(cx: number, cy: number, r: number, fromDeg: number, toDeg: number) {
  const p = (d: number) => [cx + r * Math.cos((d * Math.PI) / 180), cy + r * Math.sin((d * Math.PI) / 180)];
  const [x0, y0] = p(fromDeg); const [x1, y1] = p(toDeg);
  return `M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}`;
}
