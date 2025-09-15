import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function RootPage({
  params,
}: {
  params: { lang: string };
}) {
  const { lang } = params;
  const cookieStore = await cookies();

  // Consider authenticated when both LS tokens exist
  const isAuthed =
    cookieStore.has('ls_access_token') && cookieStore.has('ls_refresh_token');

  if (isAuthed) {
    redirect(`/${lang}/dashboard`);
  }
  redirect(`/${lang}/login`);
}
