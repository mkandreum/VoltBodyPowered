import { useEffect, useState } from 'react';
import { useAppStore } from './store/useAppStore';
import Login from './v3/screens/Login';
import Onboarding from './v3/screens/Onboarding';
import AppShell, { LoadingProfile, ToastHost } from './v3/shell';
import { notificationService } from './services/notificationService';
import { hydrateFromServer } from './services/hydration';


export default function App() {
  const { isAuthenticated, isOnboarded, theme, _hasHydrated, notificationsEnabled, profile, logs, weightLogs, authToken, _dataReady } = useAppStore();
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Schedule notification reminders when notifications are enabled and user is onboarded
  useEffect(() => {
    if (!notificationsEnabled || !isOnboarded || !profile) {
      notificationService.clearAll();
      return;
    }
    notificationService.scheduleAll(profile, logs, weightLogs);
    return () => notificationService.clearAll();
  }, [notificationsEnabled, isOnboarded, profile, logs, weightLogs]);

  // After the persisted token is restored, load all user data from the DB
  useEffect(() => {
    if (!_hasHydrated || !authToken || _dataReady) return;
    let cancelled = false;
    setLoadError(false);
    hydrateFromServer(authToken).catch((err) => {
      console.error('Could not load user data:', err);
      if (!cancelled) setLoadError(true);
    });
    return () => { cancelled = true; };
  }, [_hasHydrated, authToken, _dataReady, reloadKey]);

  // Disable overscroll on mobile
  useEffect(() => {
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overscrollBehavior = 'auto';
    };
  }, []);

  useEffect(() => {
    const bg = '#0A0A0A';
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

  // Mientras Zustand se rehidrata o llegan los datos del servidor: pantalla de carga de la app.
  if (!_hasHydrated) return <LoadingProfile />;

  if (isAuthenticated && !_dataReady) {
    return (
      <LoadingProfile
        error={loadError ? 'No se pudieron cargar tus datos del servidor.' : null}
        onRetry={() => setReloadKey((k) => k + 1)}
        onLogout={() => useAppStore.getState().logout()}
      />
    );
  }

  return (
    <>
      {!isAuthenticated ? <Login /> : !isOnboarded ? <Onboarding /> : <AppShell />}
      <ToastHost />
    </>
  );
}
