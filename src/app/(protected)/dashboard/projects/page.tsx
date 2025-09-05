'use client';

import { FileUploadDialog } from '@/components/file-upload/file-upload-dialog';
import { ProjectCardCollection } from '@/components/labelstudio/project-card-collection';
import { Button } from '@/components/ui/button';
import { Project } from '@/entities/labelstudio';
import { useProjects, useUpdateProject } from '@/hooks/network/projects';
import { Download, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

export default function LabelStudioPage() {
  const router = useRouter();
  const { data: projects, refetch } = useProjects();
  const { requestFn: updateProject } = useUpdateProject();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const handleProjectEdit = useCallback(
    async (project: Project): Promise<Project | null> => {
      try {
        const response = await updateProject(project, {
          title: project.title,
          ml_model_type: project.type,
        });

        if (response) {
          // Refetch the projects list to get the updated data
          await refetch();
          return response;
        }
        return null;
      } catch (error) {
        console.error('Failed to update project:', error);
        return null;
      }
    },
    [updateProject, refetch],
  );

  const handleUpload = useCallback(() => {
    setUploadDialogOpen(true);
  }, []);

  const handleFileUpload = useCallback(
    async (
      files: Array<{
        file: File | { type: string; name: string; size: number };
        id: string;
      }>,
    ) => {
      // TODO: Implement actual upload logic here
      console.log('Uploading files:', files);

      // For now, just simulate an upload delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Here you would typically:
      // 1. Create FormData and append files
      // 2. Make API call to your upload endpoint
      // 3. Handle upload progress if needed
      // 4. Handle success/error responses

      console.log('Files uploaded successfully');
    },
    [],
  );
  const handleDownload = useCallback(() => {}, []);

  return (
    <div className="container mx-auto">
      {/* Header */}
      <div className="flex flex-row justify-between items-center">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Label Studio</h1>
          <p className="text-sm">Manage and monitor your AI models</p>
        </div>
        <div className="flex flex-row gap-2 mr-4">
          <Button
            variant="secondary"
            onClick={handleUpload}
            className="w-28 hover:cursor-pointer"
          >
            <Upload className="size-4" />
            Upload
          </Button>
          <Button
            variant="default"
            onClick={handleDownload}
            className="w-32 hover:cursor-pointer"
          >
            <Download className="size-4" />
            Download
          </Button>
        </div>
      </div>

      {/* Projects Collection */}
      <div className="mb-8">
        <ProjectCardCollection
          projects={projects}
          onProjectClick={(project) => {
            router.push(`/dashboard/projects/${project.id}`);
          }}
          onProjectEdit={handleProjectEdit}
        />
      </div>

      {/* File Upload Dialog */}
      <FileUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        title="Upload Project Files"
        description="Select files to upload to your project"
        onUpload={handleFileUpload}
      />
    </div>
  );
}
