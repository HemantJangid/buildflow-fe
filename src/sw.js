import { cleanupOutdatedCaches, precacheAndRoute, PrecacheFallbackPlugin } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute, Route } from 'workbox-routing';
import { NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Inject manifest at build time (vite-plugin-pwa)
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Auto-update: take control immediately
self.skipWaiting();
clientsClaim();

// Navigation: try network first; on failure show offline page
const navigationRoute = new Route(
  ({ request }) => request.mode === 'navigate',
  new NetworkOnly({
    plugins: [new PrecacheFallbackPlugin({ fallbackURL: '/offline.html' })],
  })
);
registerRoute(navigationRoute);

// API: network first with timeout, then cache (same as original workbox config)
registerRoute(
  ({ request }) => /\/api\//.test(request.url),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 300 }),
    ],
  })
);
