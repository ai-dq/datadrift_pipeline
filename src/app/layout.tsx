import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  // weight: ['400', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  adjustFontFallback: true,
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body className={'antialiased'}>
        <SidebarProvider defaultOpen={defaultOpen}>
          <AppSidebar />
          <main className="flex-1">
            <SidebarTrigger />
            {children}
          </main>
        </SidebarProvider>
      </body>
    </html>
  );
}
