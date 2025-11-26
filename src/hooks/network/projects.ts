import { Project } from '@/entities/labelstudio';
import { getProjects } from '@/lib/api/endpoints';
import { useCallback } from 'react';
import { useApiData } from './shared/useApiData';
import { ProjectResponse } from '@/api/types';
/**
 * Custom hook for getting projects data
 */
export function useProjects(): {
  data: Project[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const fetchFn = useCallback(() => getProjects(), []);

  return useApiData<ProjectResponse, Project>({
    fetchFn,
    transformFn: ProjectResponse.toEntity,
    errorMessage: 'Failed to fetch models',
  });
}
