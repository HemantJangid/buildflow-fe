import { useState, useEffect, useCallback } from 'react';

const PWA_BANNER_DISMISSED_KEY = 'buildflow-pwa-banner-dismissed';
const PWA_INSTALLED_KEY = 'buildflow-pwa-installed';

/**
 * Hook to support a custom "Install app" banner for the PWA.
 * Shows the banner when the app is not installed (not standalone). When the user
 * clicks Install, triggers the browser prompt if beforeinstallprompt fired
 * (Chrome, Edge, Android); otherwise the banner is still visible so they can
 * use browser menu (e.g. iOS "Add to Home Screen").
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const isRunningStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://');

  const [isInstalled, setIsInstalled] = useState(() => {
    if (isRunningStandalone) return true;
    try {
      return localStorage.getItem(PWA_INSTALLED_KEY) === '1';
    } catch {
      return false;
    }
  });

  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try {
      return localStorage.getItem(PWA_BANNER_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isRunningStandalone) {
      setIsInstalled(true);
      try {
        localStorage.setItem(PWA_INSTALLED_KEY, '1');
      } catch {}
      return;
    }

    // Use prompt captured by early script in index.html if we missed the event
    if (window.__buildflowDeferredPrompt) {
      setDeferredPrompt(window.__buildflowDeferredPrompt);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      window.__buildflowDeferredPrompt = e;
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      window.__buildflowDeferredPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
      try {
        localStorage.setItem(PWA_INSTALLED_KEY, '1');
      } catch {}
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    // Prefer state; fall back to early-captured global (e.g. if event fired before hook mounted)
    const prompt = deferredPrompt || window.__buildflowDeferredPrompt;
    if (!prompt) return false;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      window.__buildflowDeferredPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
      try {
        localStorage.setItem(PWA_INSTALLED_KEY, '1');
      } catch {}
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    try {
      localStorage.setItem(PWA_BANNER_DISMISSED_KEY, '1');
    } catch {}
  }, []);

  const canInstall = Boolean(deferredPrompt);
  const showBanner = !isInstalled && !bannerDismissed;

  return { showBanner, canInstall, isInstalled, promptInstall, dismissBanner };
}
