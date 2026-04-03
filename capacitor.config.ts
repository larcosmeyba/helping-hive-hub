import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.helpthehive',
  appName: 'Help the Hive',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      autoHide: true,
      androidScaleType: 'CENTER_CROP'
    }
  }
};

export default config;
