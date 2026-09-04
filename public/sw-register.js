/**
 * Service-worker registration.
 *
 * This lives in its own file rather than as an inline <script> in index.html so the production
 * Content-Security-Policy can use `script-src 'self'` without needing 'unsafe-inline'.
 * See the CSP plugin in vite.config.ts.
 *
 * The protocol guard is deliberate: under Electron the document is loaded from file://, where
 * service workers are unavailable, so registration must be skipped there.
 */
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(reg => {
        console.log('[PWA] ServiceWorker registration successful with scope:', reg.scope);
      })
      .catch(err => {
        console.log('[PWA] ServiceWorker registration failed:', err);
      });
  });
}
