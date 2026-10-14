/**
 * Navegación (espejo de ui/v3/Nav.kt): pestañas + pila de pantallas secundarias.
 * Páginas (día, sesión, pose) a pantalla completa; las secciones van en hoja de cristal.
 * Integra el "atrás" del navegador / Android: cada push añade una entrada al historial.
 */
import { create } from 'zustand';
import { useAppStore } from '../store/useAppStore';

export type Tab = 'home' | 'activity' | 'train' | 'food' | 'profile';

/** La store de la web guarda la pestaña con sus ids históricos. */
const TO_STORE = { home: 'home', activity: 'calendar', train: 'workout', food: 'diet', profile: 'profile' } as const;
const FROM_STORE: Record<string, Tab> = { home: 'home', calendar: 'activity', workout: 'train', diet: 'food', profile: 'profile' };

export type Route =
  | { kind: 'day'; weekday: number }
  | { kind: 'session'; weekday: number; start?: number; custom?: boolean }
  | { kind: 'section'; id: string }
  | { kind: 'pose'; exercise: string };

type NavState = {
  stack: Route[];
  push: (r: Route) => void;
  pop: () => void;
  replace: (r: Route) => void;
  tab: (t: Tab) => void;
};

let fromPopState = false;

export const useNav = create<NavState>((set, get) => ({
  stack: [],
  push: (r) => {
    set({ stack: [...get().stack, r] });
    try { history.pushState({ vbDepth: get().stack.length }, ''); } catch { /* sin historial */ }
  },
  pop: () => {
    if (!get().stack.length) return;
    set({ stack: get().stack.slice(0, -1) });
    if (!fromPopState) { try { history.back(); } catch { /* */ } }
  },
  replace: (r) => set({ stack: [...get().stack.slice(0, -1), r] }),
  tab: (t) => {
    const depth = get().stack.length;
    set({ stack: [] });
    if (depth) { try { history.go(-depth); } catch { /* */ } }
    useAppStore.getState().setTab(TO_STORE[t]);
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    const { stack } = useNav.getState();
    if (!stack.length) return;
    fromPopState = true;
    useNav.setState({ stack: stack.slice(0, -1) });
    fromPopState = false;
  });
}

export function useTab(): Tab {
  return FROM_STORE[useAppStore((s) => s.currentTab)] ?? 'home';
}
export const goTab = (t: Tab) => useNav.getState().tab(t);
