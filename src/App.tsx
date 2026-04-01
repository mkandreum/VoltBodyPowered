import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Workout from './pages/Workout';
import Diet from './pages/Diet';
import CalendarView from './pages/CalendarView';
import Profile from './pages/Profile';
import BottomNav from './components/BottomNav';
import { AnimatePresence, motion } from 'motion/react';
import { pageTransition } from './lib/motion';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { fadeSlideUp } from './lib/motion';

export default function App() {
  const { isAuthenticated, isOnboarded, currentTab, theme, toasts, dismissToast } = useAppStore();

  // Disable overscroll on mobile
  useEffect(() => {
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overscrollBehavior = 'auto';
    };
  }, []);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    return () => {
      document.body.removeAttribute('data-theme');
    };
  }, [theme]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      dismissToast(toasts[0].id);
    }, 2800);

    return () => clearTimeout(timer);
  }, [toasts, dismissToast]);

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
    <div className="app-shell min-h-screen text-white overflow-x-hidden safe-bottom">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTab}
          initial={pageTransition.initial}
          animate={pageTransition.animate}
          exit={pageTransition.exit}
          transition={pageTransition.transition}
          className="h-full"
        >
          {renderTab()}
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
                    className="text-gray-500 hover:text-white text-xs"
                  >
                    cerrar
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
