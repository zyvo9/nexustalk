import type { CapacitorConfig } from '@capacitor/cli';

/**
 * NexusTalk Android app (Capacitor).
 * v1 = WebView wrapper that loads the live web app (like the CRD client
 * loads Google's page). Update server.url after deploying to Netlify
 * (or set it to the current tunnel URL for testing).
 */
const config: CapacitorConfig = {
  appId: 'app.nexustalk.app',
  appName: 'NexusTalk',
  webDir: 'dist',
  server: {
    // Set the APP_URL repository variable on GitHub (Settings → Secrets and
    // variables → Actions → Variables) — or edit this line directly.
    url: process.env.CAP_SERVER_URL || 'https://CHANGE-ME.example',
    cleartext: false,
  },
};

export default config;
