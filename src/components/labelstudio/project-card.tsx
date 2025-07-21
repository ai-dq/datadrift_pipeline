import { Project } from '@/entities/labelstudio';
import { Lightbulb, List, ListChecks } from 'lucide-react';
import ModelTypeBadge from '../model-type-badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export function ProjectCard({
  project,
  onClick,
}: {
  project: Project;
  onClick?: (project: Project) => void;
}) {
  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick?.(project)}
    >
      <CardHeader>
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-gray-300 opacity-90 flex items-center justify-center text-white font-semibold font-mono text-xl">
            {project.title.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col gap-2 items-start">
            <CardTitle className="text-base">{project.title}</CardTitle>
            <ModelTypeBadge type={project.type} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex flex-row gap-2 items-center">
            <ListChecks className="size-4" />
            <span>{project.finishedTasksCount}</span>
            <span>/</span>
            <span>{project.totalTasksCount}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-row gap-2 items-center">
              <List className="size-4" />0
            </div>
            <div className="flex flex-row gap-2 items-center">
              <Lightbulb className="size-4" />0
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
