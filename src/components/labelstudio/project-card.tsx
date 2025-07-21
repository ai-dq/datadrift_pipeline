import { Project } from '@/entities/labelstudio';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { ModelType } from '@/entities/ml-model';

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
            {project.title.charAt(0)}
          </div>
          <div className="flex flex-col gap-2 items-start">
            <CardTitle className="text-base">{project.title}</CardTitle>
            <Badge variant="secondary">
              {ModelType.presentationName(project.type)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
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
                {ModelType.allCases().map((type) => (
                  <DropdownMenuRadioItem key={type} value={type}>
                    {ModelType.presentationName(type)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
