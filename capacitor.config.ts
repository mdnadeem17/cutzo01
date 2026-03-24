import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.trimo.app',
  appName: 'Trimo',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"],
    },
    StatusBar: {
      style: "LIGHT",           // white icons on dark header
      backgroundColor: "#00000000", // fully transparent
      overlaysWebView: true,    // web content goes under status bar (edge-to-edge)
    },
    SplashScreen: {
      launchShowDuration: 0,    // disable native splash (we have our own)
    },
  },
};

export default config;
