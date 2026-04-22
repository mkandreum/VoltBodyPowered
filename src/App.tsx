import { useEffect, useRef, lazy, Suspense } from 'react';
import { useAppStore } from './store/useAppStore';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import BottomNav from './components/BottomNav';
import SplashScreen from './components/SplashScreen';
import { AnimatePresence, motion } from 'motion/react';
import { pageTransition, fadeSlideUp } from './lib/motion';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { notificationService } from './services/notificationService';

const Home = lazy(() => import('./pages/Home'));
const Workout = lazy(() => import('./pages/Workout'));
const Diet = lazy(() => import('./pages/Diet'));
const CalendarView = lazy(() => import('./pages/CalendarView'));
const Profile = lazy(() => import('./pages/Profile'));

function PageSkeleton() {
  return (
    <div className="min-h-screen app-shell px-4 safe-top safe-bottom">
      <div className="page-wrap space-y-4 pt-6">
        {/* Matches hero card (~h-44) */}
        <div className="anim-shimmer rounded-2xl h-44" />
        {/* Matches XP bar card (~h-20) */}
        <div className="anim-shimmer rounded-2xl h-20" />
        {/* Matches bento grid (2 rows of 2 cards) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="anim-shimmer rounded-2xl h-40 col-span-2" />
          <div className="anim-shimmer rounded-2xl h-28" />
          <div className="anim-shimmer rounded-2xl h-28" />
        </div>
        {/* Matches timeline card (~h-44) */}
        <div className="anim-shimmer rounded-2xl h-44" />
      </div>
    </div>
  );
}

export default function App() {
  const { isAuthenticated, isOnboarded, currentTab, theme, toasts, dismissToast, _hasHydrated, notificationsEnabled, profile, logs, weightLogs } = useAppStore();
  const scrollPositions = useRef<Record<string, number>>({});

  // Schedule notification reminders when notifications are enabled and user is onboarded
  useEffect(() => {
    if (!notificationsEnabled || !isOnboarded || !profile) {
      notificationService.clearAll();
      return;
    }
    notificationService.scheduleAll(profile, logs, weightLogs);
    return () => notificationService.clearAll();
  }, [notificationsEnabled, isOnboarded, profile, logs, weightLogs]);

  // Disable overscroll on mobile
  useEffect(() => {
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overscrollBehavior = 'auto';
    };
  }, []);

  useEffect(() => {
    const bgColors: Record<string, string> = {
      'verde-negro': '#050505',
      'aguamarina-negro': '#03110e',
      'ocaso-negro': '#120905',
    };
    const bg = bgColors[theme] ?? '#050505';
    document.body.setAttribute('data-theme', theme);
    document.documentElement.style.backgroundColor = bg;
    // Update PWA status-bar / address-bar theme color
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) themeColorMeta.setAttribute('content', bg);
    return () => {
      document.body.removeAttribute('data-theme');
      document.documentElement.style.backgroundColor = '';
    };
  }, [theme]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const id = toasts[0].id;
    const timer = setTimeout(() => {
      dismissToast(id);
    }, 2800);
    return () => clearTimeout(timer);
  // `toasts[0]?.id` — only restart timer when the leading toast changes.
  // `dismissToast` is a stable Zustand action; including it avoids the lint warning without any cost.
  }, [toasts[0]?.id, dismissToast]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Save the scroll position for the tab we're leaving, then restore for the new tab
    const savedY = scrollPositions.current[currentTab] ?? 0;
    // Defer scroll restore until after the transition starts
    const raf = requestAnimationFrame(() => {
      window.scrollTo({ top: savedY, behavior: 'instant' });
    });
    return () => {
      // Save current position when tab changes
      scrollPositions.current[currentTab] = window.scrollY;
      cancelAnimationFrame(raf);
    };
  }, [currentTab]);

  // While Zustand is rehydrating from localStorage, show a splash instead of the login form
  if (!_hasHydrated) {
    return <SplashScreen />;
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login />;
  }

  // Show onboarding if authenticated but not onboarded
  if (!isOnboarded) {
    return <Onboarding />;
  }

  const renderTab = () => {
    switch (currentTab) {
      case 'home':
        return <Home />;
      case 'workout':
        return <Workout />;
      case 'diet':
        return <Diet />;
      case 'calendar':
        return <CalendarView />;
      case 'profile':
        return <Profile />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="app-shell min-h-[100dvh] text-white overflow-x-hidden safe-bottom">
      <AnimatePresence>
        <motion.div
          key={currentTab}
          initial={pageTransition.initial}
          animate={pageTransition.animate}
          exit={pageTransition.exit}
          transition={pageTransition.transition}
          style={{ willChange: 'opacity, transform' }}
          className="h-full"
        >
          <Suspense fallback={<PageSkeleton />}>
            {renderTab()}
          </Suspense>
        </motion.div>
      </AnimatePresence>

      <div className="fixed top-[max(0.8rem,env(safe-area-inset-top))] right-4 z-[60] w-[min(92vw,360px)] space-y-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            const isSuccess = toast.type === 'success';
            const isError = toast.type === 'error';

            return (
              <motion.div
                key={toast.id}
                initial={fadeSlideUp.initial}
                animate={fadeSlideUp.animate}
                exit={fadeSlideUp.exit}
                transition={fadeSlideUp.transition}
                className="pointer-events-auto rounded-2xl border glass-panel border-[var(--app-border)] p-4 shadow-xl"
              >
                <div className="flex items-start gap-3">
                  {isSuccess && <CheckCircle2 className="text-emerald-400 mt-0.5" size={18} />}
                  {isError && <AlertCircle className="text-red-400 mt-0.5" size={18} />}
                  {!isSuccess && !isError && <Info className="text-[var(--app-accent)] mt-0.5" size={18} />}

                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{toast.title}</p>
                    {toast.message && <p className="text-xs text-gray-400 mt-1">{toast.message}</p>}
                  </div>

                  <button
                    onClick={() => dismissToast(toast.id)}
                    aria-label="Cerrar notificación"
                    className="text-gray-500 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
}
