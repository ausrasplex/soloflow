import type { Metadata, Viewport } from 'next';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import './globals.css';
import InstallSupport from '@/components/InstallSupport';

export const metadata: Metadata = {
  title: 'SoloFlow',
  description: 'Bookkeeping for Australian sole traders: statements, categories, GST and BAS.',
  applicationName: 'SoloFlow',
  icons: { icon: '/icon.svg', apple: '/apple-touch-icon.png' },
  // iPhone and iPad: "Add to Home Screen" opens full screen, with the status bar over the app's own colour
  appleWebApp: { capable: true, title: 'SoloFlow', statusBarStyle: 'default' },
  formatDetection: { telephone: false }
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f1f1f4' },
    { media: '(prefers-color-scheme: dark)', color: '#14122a' }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body>
        {children}
        <InstallSupport />
      </body>
    </html>
  );
}
