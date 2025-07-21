import { Project } from '@/entities/labelstudio';
import CardCollection from '../card-collection';
import { ProjectCard } from './project-card';

export function ProjectCardCollection({
  projects,
  onProjectClick,
}: {
  projects: Project[];
  onProjectClick?: (project: Project) => void;
}) {
  return (
    <CardCollection
      data={projects}
      renderCard={(project, index) => (
        <ProjectCard
          key={project.id || index}
          project={project}
          onClick={onProjectClick}
        />
      )}
      columns={{ default: 1, md: 2, lg: 3 }}
      gap="md"
    />
  );
}
