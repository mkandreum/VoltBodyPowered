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

export default function App() {
  const { isAuthenticated, isOnboarded, currentTab } = useAppStore();

  // Disable overscroll on mobile
  useEffect(() => {
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overscrollBehavior = 'auto';
    };
  }, []);

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
    <div className="bg-[#050505] min-h-screen text-white overflow-x-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {renderTab()}
        </motion.div>
      </AnimatePresence>
      <BottomNav />
    </div>
  );
}
