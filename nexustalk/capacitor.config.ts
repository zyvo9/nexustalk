import type { CapacitorConfig } from '@capacitor/cli';

/**
 * NexusTalk Android app (Capacitor).
 * The BUNDLED React UI ships inside the APK (webDir dist) — the app has its
 * own interface. The server address is set once inside the app (login screen)
 * or pre-filled from VITE_DEFAULT_SERVER at build time.
 */
const config: CapacitorConfig = {
  appId: 'app.nexustalk.app',
  appName: 'NexusTalk',
  webDir: 'dist',
};

export default config;
