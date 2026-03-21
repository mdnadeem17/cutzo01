import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trimo.app',
  appName: 'Trimo',
  webDir: 'dist',
  fullscreen: true,
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"],
    }
  }
};

export default config;
