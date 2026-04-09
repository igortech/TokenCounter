import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tokenoptimizer.app',
  appName: 'Ai tokenizer',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#ffffff',
  },
  ios: {
    scrollEnabled: false,
  }
};

export default config;
