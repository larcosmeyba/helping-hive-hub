import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.helpthehive',
  appName: 'Help the Hive',
  webDir: 'dist',
  server: {
    url: 'https://www.helpthehive.com',
    cleartext: false
  }
};

export default config;
