import { Project } from '@/entities/labelstudio';
import CardCollection from '../card-collection';
import { Badge } from '../ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';

export function ProjectCardCollection({ projects }: { projects: Project[] }) {
  const renderProjectCard = (project: Project) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
            {project.title.charAt(0)}
          </div>
          <div>
            <CardTitle className="text-base">{project.title}</CardTitle>
            <CardDescription>{project.title}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Badge variant={project.title === 'active' ? 'default' : 'secondary'}>
            {project.title}
          </Badge>
          <span className="text-sm text-muted-foreground">{project.title}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">{project.type ?? 'Select'}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>
                Select model type this project uses
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value="dfgfdgd" onValueChange={() => {}}>
                <DropdownMenuRadioItem value="dfgdsg">
                  asfsafasf
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="sdfgsdfgdf">
                  asfasfsafas
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dfgdfgdf">
                  fsafasfsafa
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <CardCollection
      data={projects}
      renderCard={renderProjectCard}
      columns={{ default: 1, md: 2, lg: 3 }}
      gap="md"
    />
  );
}
