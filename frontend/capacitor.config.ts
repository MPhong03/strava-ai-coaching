import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.m_phong.aicoach',
  appName: 'AI Coach',
  webDir: 'build',
  bundledWebRuntime: false,
  server: {
    // Cho phép Android app kết nối với Backend Koyeb (HTTPS)
    allowNavigation: ['*.koyeb.app']
  },
  // Cấu hình custom URL scheme cho Deep Linking
  android: {
    allowMixedContent: true
  }
};

export default config;
