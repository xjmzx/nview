import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uk.upleb.ndisc.mobile',
  appName: 'nview',
  webDir: 'dist',
  ios: {
    // Xcode target/scheme renamed from the template's "App"; the ios/App folder
    // and App.xcodeproj keep their names because the Capacitor CLI expects them.
    scheme: 'nview'
  }
};

export default config;
