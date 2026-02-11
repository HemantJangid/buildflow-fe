import { useState, useEffect, useCallback } from 'react';

const PWA_BANNER_DISMISSED_KEY = 'buildflow-pwa-banner-dismissed';

/**
 * Hook to support a custom "Install app" banner for the PWA.
 * Shows the banner when the app is not installed (not standalone). When the user
 * clicks Install, triggers the browser prompt if beforeinstallprompt fired
 * (Chrome, Edge, Android); otherwise the banner is still visible so they can
 * use browser menu (e.g. iOS "Add to Home Screen").
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(PWA_BANNER_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');
    if (standalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstalled(true);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    try {
      sessionStorage.setItem(PWA_BANNER_DISMISSED_KEY, '1');
    } catch {}
  }, []);

  const canInstall = Boolean(deferredPrompt);
  const showBanner = !isInstalled && !bannerDismissed;

  return { showBanner, canInstall, isInstalled, promptInstall, dismissBanner };
}
