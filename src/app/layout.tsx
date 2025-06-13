import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { JetBrains_Mono } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  // weight: ['400', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  adjustFontFallback: true,
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

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
