import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

// Inter is the closest widely-available stand-in for SF; on Apple hardware the CSS stack
// still prefers the real system face.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Lead Distribution Platform',
  description: 'Capture, route and audit inbound leads across your broker network.',
};

/**
 * Applies the stored theme before first paint. Without this the page would render in the
 * system theme and then flip, which is the classic dark-mode flash.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('ldp-theme');
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
