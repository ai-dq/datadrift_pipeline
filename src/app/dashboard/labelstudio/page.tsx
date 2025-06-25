'use client';

import { ProjectCardCollection } from '@/components/labelstudio/project-card-collection';
import { useProjects } from '@/hooks/network/projects';

export default function LabelStudioPage() {
  const { data } = useProjects();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Label Studio</h1>
        <p className="text-sm text-gray-600">
          Manage and monitor your AI models
        </p>
      </div>

      <div className="mb-8">
        <ProjectCardCollection projects={data} />
      </div>
    </div>
  );
}
