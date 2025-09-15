import type { SupportedLocales } from '@/app/i18n';
import { AuthProvider } from '@/contexts/AuthContext';
import type { Metadata } from 'next';
import '../globals.css';
import { JetBrains_Mono } from 'next/font/google';
import React from 'react';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

export async function generateStaticParams() {
  return [{ lang: 'en-US' }, { lang: 'de' }];
}

export const metadata: Metadata = {
  title: 'Q-OCR Dashboard',
  description:
    'The Q-OCR Dashboard is a powerful tool for converting images to text.',
};

export default function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: SupportedLocales }>;
}>) {
  const { lang } = React.use(params);
  return (
    <html lang={lang} className={`${jetbrainsMono.variable}`}>
      <body className={'antialiased bg-sidebar-background'}>
        <AuthProvider>
          <main className="flex-1">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
