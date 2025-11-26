'use client';

import { AppSidebar } from '@/components/app-sidebar/app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { getCurrentUser } from '@/lib/api/endpoints/users';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return;

    const checkAuth = async () => {
      try {
        await getCurrentUser();
      } catch (error) {
        console.error(
          'Authentication check failed, redirecting to login:',
          error,
        );
        router.replace('/login');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <main className="flex-1">{children}</main>
    </SidebarProvider>
  );
}
