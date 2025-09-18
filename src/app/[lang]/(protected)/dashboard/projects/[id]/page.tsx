import { use } from 'react';

export default function ProjectPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { id, lang } = use(params);

  const iframeSrc = `/${lang}/next-api/external/projects/${id}`;

  return (
    <div className="w-full h-screen">
      <iframe
        src={iframeSrc}
        className="w-full h-screen"
      />
    </div>
  );
}
