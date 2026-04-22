import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pulse.intelligence',
  appName: 'Pulse Intelligence',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '91026465912-ci49n0ov6emksomr85jedm23v9lun0sb.apps.googleusercontent.com',
      androidClientId: '91026465912-ci49n0ov6emksomr85jedm23v9lun0sb.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
