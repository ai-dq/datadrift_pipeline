import { redirect } from 'next/navigation';

export default function DashboardPage({
  params,
}: {
  params: { lang: string };
}) {
  const { lang } = params;
  return redirect(`/${lang}/dashboard/projects`);
}
